// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'
import Ajv from 'https://esm.sh/ajv@8.12.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import context files
// Import dummy data
import dummyDataTemplate from './dummyData.json' with { type: 'json' }
// Import schema for validation (local copy)
import componentsSchemaJson from './components.schema.json' with { type: 'json' }

// Rate limiting: simple in-memory store (per Edge Function instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 10, // max requests per window
  windowMs: 60 * 1000, // 1 minute
}

// Check rate limit
function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  // Clean up expired records periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key)
      }
    }
  }

  if (!record || record.resetTime < now) {
    // New window
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    })
    return { allowed: true }
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Increment count
  record.count++
  return { allowed: true }
}

// Tool definition for Claude
const wireframeTools = [
  {
    name: 'emit_wireframe',
    description:
      'Emit the complete wireframe JSON for all pages. Use this tool to provide the final structured wireframe data after your textual explanation.',
    input_schema: {
      type: 'object',
      properties: {
        wireframe: {
          type: 'array',
          description: 'Array of page objects, each with page name, rationale, and blocks',
          items: {
            type: 'object',
            properties: {
              page: {
                type: 'string',
                description: 'Name of the page',
              },
              rationale: {
                type: 'string',
                description: 'Explanation of why this page is structured this way (2-4 sentences)',
              },
              blocks: {
                type: 'array',
                description: 'Array of component blocks for this page',
              },
            },
            required: ['page', 'rationale', 'blocks'],
          },
        },
      },
      required: ['wireframe'],
    },
  },
]

// Auto-repair function: attempt to fix validation errors
async function attemptAutoRepair(
  anthropic: any,
  invalidJson: any,
  errors: any[],
  systemPrompt: string,
): Promise<any> {
  const repairPrompt = `The wireframe JSON you generated has validation errors. Please fix them and return ONLY the corrected JSON using the emit_wireframe tool.

**Validation Errors:**
${JSON.stringify(errors, null, 2)}

**Current JSON:**
${JSON.stringify(invalidJson, null, 2)}

Fix these errors and emit the corrected wireframe using the emit_wireframe tool.`

  const repairMessage = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16000,
    temperature: 0.1,
    system: systemPrompt,
    tools: wireframeTools,
    messages: [
      {
        role: 'user',
        content: repairPrompt,
      },
    ],
  })

  // Extract repaired JSON from tool call
  for (const content of repairMessage.content) {
    if (content.type === 'tool_use' && content.name === 'emit_wireframe') {
      return content.input.wireframe
    }
  }

  throw new Error('Auto-repair did not return a valid wireframe')
}

interface ProjectFile {
  name: string
  type: string
  size: number
  data: string // base64 encoded
}

interface ProjectRequest {
  projectName: string
  companyName?: string
  description?: string
  numPages?: number // Optional - AI will determine automatically if not provided
  language: string
  files?: ProjectFile[] // Optional uploaded files for AI context only
  additionalContext?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const {
      projectName,
      companyName,
      description,
      numPages,
      language,
      files,
      additionalContext,
    }: ProjectRequest = await req.json()

    // Validate input
    if (!projectName || !language) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: projectName, language' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Rate limiting check
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimitId = `${clientIp}-${projectName}`
    const rateLimit = checkRateLimit(rateLimitId)

    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded for:', rateLimitId)
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter),
          },
        },
      )
    }

    // Check if Anthropic API key is configured
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    // If no API key, return dummy data for testing
    if (!anthropicApiKey) {
      console.log('No ANTHROPIC_API_KEY - returning dummy data')

      // Load dummy data and replace placeholders
      const dummyWireframe = JSON.parse(JSON.stringify(dummyDataTemplate))

      // Replace placeholders in the dummy data
      const replaceInObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return obj
            .replace('{{projectName}}', `Welkom bij ${projectName}`)
            .replace(
              '{{description}}',
              description || 'Een moderne en gebruiksvriendelijke website',
            )
        } else if (Array.isArray(obj)) {
          return obj.map(replaceInObject)
        } else if (obj && typeof obj === 'object') {
          const newObj: any = {}
          for (const key in obj) {
            newObj[key] = replaceInObject(obj[key])
          }
          return newObj
        }
        return obj
      }

      const processedDummyData = replaceInObject(dummyWireframe)

      return new Response(
        JSON.stringify({
          success: true,
          sitemapProposal: `# Dummy Sitemap voor ${projectName}\n\n**LET OP:** Dit is dummy data omdat er geen Anthropic API key is geconfigureerd.\n\n## Homepage\n- Hero sectie met title en USPs\n- Grid met 3 diensten\n- Call to Action\n- Footer\n\n## Contact\n- Hero met contacttitel\n- Kolommen met formulier\n- Footer\n\nConfigureer ANTHROPIC_API_KEY voor echte AI-gegenereerde wireframes.`,
          wireframeJson: processedDummyData,
          fullResponse: 'Dummy data - geen AI gebruikt',
          usage: {
            inputTokens: 0,
            outputTokens: 0,
          },
          isDummyData: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Real Anthropic API call
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    })

    // Build the prompt for Claude
    // const hasLargeInput = (description?.length || 0) > 600 || (files && files.length > 0)
    // Read external context files
    const [specMd, instructionsMd] = await Promise.all([
      Deno.readTextFile(new URL('./spec.md', import.meta.url)),
      Deno.readTextFile(new URL('./instructions.md', import.meta.url)),
    ])

    const systemPrompt = `Je bent een expert UX/UI designer en wireframe architect.
    Hanteer componenten als generieke UI-archetypen.
    Kies archetypen op basis van UX-doel; map ze zelfstandig naar het schema (namen zijn niet domein-gebonden).
    Output is rijk en volledig, microcopy NL, props/booleans expliciet.
    Volg instructies van ${instructionsMd}. Gebruik ${specMd} als referentie voor de componenten en hun eigenschappen.
    ${hasLargeInput ? 'Houd de structuur compact vanwege grote input; beperk tot doelmatige blokken en voorkom overbodige variatie.' : ''}
    Je taak is om wireframes te genereren in JSON formaat volgens ${JSON.stringify(componentsSchemaJson, null, 2)}.

## Instructions
${instructionsMd}

## Spec (Component Specificaties)
${specMd}

Volg deze instructies EXACT op. Genereer altijd valide JSON volgens het schema.`

    const userPromptText = `Genereer een wireframe voor het volgende project:

**Projectnaam:** ${projectName}
${companyName ? `**Bedrijfsnaam:** ${companyName}` : ''}
${description ? `**Beschrijving:** ${description}` : ''}
**Taal:** ${language}
${additionalContext ? `**Extra context:** ${additionalContext}` : ''}
${files && files.length > 0 ? `\n**Aantal bijgevoegde bestanden:** ${files.length} (zie bijgevoegde documenten voor extra context)` : ''}

${numPages ? `**Gevraagd aantal pagina's:** ${numPages} (gebruik dit als richtlijn, maar pas aan indien nodig)` : "**Bepaal zelf het optimale aantal pagina's** op basis van de projectbeschrijving en best practices"}

BELANGRIJK: Gebruik de emit_wireframe tool voor de JSON output (niet een code block). Begin nu!`

    // Build message content with files (if any)
    const messageContent: any[] = []

    // Add uploaded files first (PDFs/documents for AI context)
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type === 'application/pdf') {
          messageContent.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: file.data,
            },
          })
        } else if (file.type.startsWith('image/')) {
          messageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: file.type,
              data: file.data,
            },
          })
        }
      }
    }

    // Add text prompt
    messageContent.push({
      type: 'text',
      text: userPromptText,
    })

    console.log('Calling Anthropic API...')
    const callStart = Date.now()

    // Call Anthropic API with tools
    const selectedModel = hasLargeInput ? 'claude-sonnet-4-5-20250929' : 'claude-haiku-4-5-20251001'
    const message = await anthropic.messages.create({
      model: selectedModel,
      max_tokens: 16000,
      temperature: 0.2,
      system: systemPrompt,
      tools: wireframeTools,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    })

    // Save full communication to Supabase Storage for inspection
    let logFilePath: string | null = null
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      if (supabaseUrl && supabaseServiceRoleKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
        const bucket = 'ai-logs'

        // Try to create bucket (ignore error if exists)
        try {
          await supabase.storage.createBucket(bucket, { public: false })
        } catch (_) {
          // Bucket probably already exists
        }

        const safeProject = projectName.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `full-log/${timestamp}_${safeProject}.json`

        // Create comprehensive log object
        const fullLog = {
          timestamp: new Date().toISOString(),
          project: {
            name: projectName,
            company: companyName,
            description,
            numPages,
            language,
            additionalContext,
          },
          request: {
            systemPrompt,
            userPrompt: userPromptText,
            model: 'claude-sonnet-4-5-20250929',
            temperature: 0.2,
            maxTokens: 16000,
            tools: wireframeTools,
            hasAttachments: files && files.length > 0,
            attachmentCount: files?.length || 0,
          },
          response: {
            full: message,
            contentBlocks: message.content.map((block: any) => ({
              type: block.type,
              ...(block.type === 'text'
                ? { text: block.text, length: block.text.length }
                : block.type === 'tool_use'
                  ? { tool: block.name, hasData: !!block.input }
                  : {}),
            })),
          },
          metadata: {
            id: message.id,
            model: message.model,
            usage: message.usage,
            stopReason: message.stop_reason,
          },
        }

        const fileBody = new Blob([JSON.stringify(fullLog, null, 2)], {
          type: 'application/json',
        })

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, fileBody, { upsert: true, contentType: 'application/json' })

        if (uploadError) {
          console.error('Failed to save log file:', uploadError)
        } else {
          logFilePath = `${bucket}/${fileName}`
          console.log('Log saved to Storage:', fileName)
        }
      }
    } catch (e) {
      console.error('Error saving log file:', e)
    }

    console.log('Response received')

    // Extract wireframe JSON and sitemap proposal
    let wireframeJson = null
    let sitemapProposal = ''
    let responseText = ''

    // Parse response: prioritize tool_use, fallback to text + code block
    for (const content of message.content) {
      if (content.type === 'text') {
        responseText += content.text
      } else if (content.type === 'tool_use' && content.name === 'emit_wireframe') {
        wireframeJson = content.input.wireframe
      }
    }

    // Fallback: if no tool_use, try to extract JSON from text
    if (!wireframeJson && responseText) {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          wireframeJson = JSON.parse(jsonMatch[1])
        } catch (e) {
          console.error('Failed to parse JSON from response:', e)
        }
      }
    }

    // Extract sitemap proposal
    if (responseText) {
      const jsonStart = responseText.indexOf('```json')
      sitemapProposal =
        jsonStart > 0 ? responseText.substring(0, jsonStart).trim() : responseText.trim()
    }

    // ---- SANITIZER: fix Detailpage misplacements before validation ----
    const looksLikeDetailpageProps = (props: any) => {
      if (!props || typeof props !== 'object') return false
      const keys = Object.keys(props)
      const markers = [
        'Has Project Header',
        'Has News Header',
        'Paragraph 1',
        'Paragraph 2',
        'Has Highlight Paragraph',
        'Highlight Title',
        'Highlight Paragraph',
        'Paragraph 3 Title',
        'Paragraph 3',
        'Paragraph 4',
        'Has More Projects',
        'Has More News',
      ]
      return markers.some((k) => keys.includes(k))
    }

    const ensureCTAChild = () => ({
      component: 'CalltoAction',
      props: {
        'Has Title': true,
        Title: 'Meer weten?',
        'Has Description': true,
        Description: 'Neem contact op of bekijk gerelateerde items.',
        'Has Usps': false,
        'Usp 1': '',
        'Usp 2': '',
        'Usp 3': '',
        'Has Button Primary': true,
        'Has Button Secondary': false,
      },
      children: [
        {
          component: 'Button Primary',
          props: { 'Property 1': 'Default', 'Text primary button': 'Contact opnemen' },
        },
      ],
    })

    const ensureFooter = () => ({
      component: 'Footer',
      props: {
        'Has Column 1': false,
        'Header 1': '',
        Link1A: '',
        Link1B: '',
        Link1C: '',
        Link1D: '',
        Link1E: '',
        Link1F: '',
        Link1G: '',
        'Has Column 2': false,
        'Header 2': '',
        Link2A: '',
        Link2B: '',
        Link2C: '',
        Link2D: '',
        Link2E: '',
        Link2F: '',
        Link2G: '',
        'Has Column 3': false,
        'Header 3': '',
        Link3A: '',
        Link3B: '',
        Link3C: '',
        Link3D: '',
        Link3E: '',
        Link3F: '',
        Link3G: '',
        'Has Column 4': false,
        'Header 4': '',
        Link4A: '',
        Link4B: '',
        Link4C: '',
        Link4D: '',
        Link4E: '',
        Link4F: '',
        Link4G: '',
        'Has Nieuwsbrief': false,
      },
    })

    if (Array.isArray(wireframeJson)) {
      wireframeJson = wireframeJson.map((page: any) => {
        if (!page || !Array.isArray(page.blocks)) return page
        const first = page.blocks[0]
        if (first && looksLikeDetailpageProps(first.props)) {
          const normalizedDetail = {
            component: 'Detail page',
            props: {
              'Has Project Header': !!first.props['Has Project Header'],
              'Has News Header': !!first.props['Has News Header'],
              'Paragraph 1': first.props['Paragraph 1'] || '',
              'Paragraph 2': first.props['Paragraph 2'] || '',
              'Has Highlight Paragraph': !!first.props['Has Highlight Paragraph'],
              'Highlight Title': first.props['Highlight Title'] || '',
              'Highlight Paragraph': first.props['Highlight Paragraph'] || '',
              'Paragraph 3 Title': first.props['Paragraph 3 Title'] || '',
              'Paragraph 3': first.props['Paragraph 3'] || '',
              'Paragraph 4': first.props['Paragraph 4'] || '',
              'Has More Projects': !!first.props['Has More Projects'],
              'Has More News': !!first.props['Has More News'],
            },
            children: [ensureCTAChild()],
          }

          const hasProject = normalizedDetail.props['Has Project Header']
          const hasNews = normalizedDetail.props['Has News Header']
          if (hasProject && hasNews) {
            normalizedDetail.props['Has News Header'] = false
          } else if (!hasProject && !hasNews) {
            normalizedDetail.props['Has Project Header'] = true
          }

          if (normalizedDetail.props['Has Project Header']) {
            normalizedDetail.props['Has More Projects'] = true
            normalizedDetail.props['Has More News'] = false
          } else {
            normalizedDetail.props['Has More Projects'] = false
            normalizedDetail.props['Has More News'] = true
          }

          return { ...page, blocks: [normalizedDetail, ensureFooter()] }
        }
        return page
      })
    }
    // ---- END SANITIZER ----

    // Validate wireframe JSON with schema
    if (wireframeJson) {
      const ajv = new Ajv({ allErrors: true })
      const validate = ajv.compile(componentsSchemaJson)
      const valid = validate(wireframeJson)

      if (!valid) {
        const elapsedMs = Date.now() - callStart
        const skipRepair = elapsedMs > 45000 || (files && files.length > 0)
        console.warn('Validation failed', {
          elapsedMs,
          skipRepair,
          errors: validate.errors?.length,
        })
        if (!skipRepair) {
          try {
            wireframeJson = await attemptAutoRepair(
              anthropic,
              wireframeJson,
              validate.errors,
              systemPrompt,
            )
            console.log('Auto-repair successful')
          } catch (repairError) {
            console.error('Auto-repair failed:', repairError)
          }
        } else {
          console.log(
            'Skipping auto-repair due to time/size constraints; returning best-effort result',
          )
        }
      }
    } else {
      console.error('No wireframe JSON in response')
    }

    console.log(
      `Complete: ${wireframeJson?.length || 0} pages, ${message.usage.input_tokens}/${message.usage.output_tokens} tokens`,
    )

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        sitemapProposal,
        wireframeJson,
        fullResponse: responseText,
        logFilePath, // Path to detailed log file in storage
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
