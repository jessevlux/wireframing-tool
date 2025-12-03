// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'
import Ajv from 'https://esm.sh/ajv@8.12.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SPEC_MD } from './spec.ts'
import { INSTRUCTIONS_MD } from './instructions.ts'

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
      'VERPLICHT: Gebruik deze tool om de volledige wireframe JSON te retourneren. Geen tekstuele uitleg, alleen deze tool call met de JSON data.',
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
    model: 'claude-opus-4-5-20251101',
    max_tokens: 64000, // Increased to handle large wireframe responses
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
  useDummyData?: boolean // Flag to force dummy data (for demo accounts)
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
      useDummyData,
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

    // Helper function to return dummy data
    const returnDummyData = () => {
      console.log('Returning dummy data (demo account or no API key)')

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
          sitemapProposal: `# Dummy Sitemap voor ${projectName}\n\n${useDummyData ? '**DEMO ACCOUNT:** Dit is demo data om onnodige API calls te voorkomen.\n\n' : '**LET OP:** Dit is dummy data omdat er geen Anthropic API key is geconfigureerd.\n\n'}## Homepage\n- Hero sectie met title en USPs\n- Grid met 3 diensten\n- Call to Action\n- Footer\n\n## Contact\n- Hero met contacttitel\n- Kolommen met formulier\n- Footer\n${useDummyData ? '' : '\nConfigureer ANTHROPIC_API_KEY voor echte AI-gegenereerde wireframes.'}`,
          wireframeJson: processedDummyData,
          fullResponse: useDummyData
            ? 'Demo data - geen AI gebruikt'
            : 'Dummy data - geen AI gebruikt',
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

    // If useDummyData flag is set (demo account), return dummy data immediately
    if (useDummyData === true) {
      return returnDummyData()
    }

    // Check if Anthropic API key is configured
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    // If no API key, return dummy data for testing
    if (!anthropicApiKey) {
      console.log('No ANTHROPIC_API_KEY - returning dummy data')
      return returnDummyData()
    }

    // Real Anthropic API call
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    })

    // Build the prompt for Claude
    const hasLargeInput = (description?.length || 0) > 600 || (files && files.length > 0)
    // Use embedded context (bundler-safe)
    const specMd = SPEC_MD
    const instructionsMd = INSTRUCTIONS_MD

    const systemPrompt = [
      'Je bent een UX/UI wireframe-architect.',
      '',
      'KRITIEK BELANGRIJK: Je MOET de tool `emit_wireframe` gebruiken om de JSON te retourneren. GEEN tekstuele output, ALLEEN een tool call.',
      'Je response bestaat UITSLUITEND uit een tool call met de volledige wireframe JSON. Geen voorafgaande tekst, geen code blocks, geen uitleg.',
      '',
      'Genereer valide JSON volgens het schema. Gebruik de context hieronder strikt.',
      hasLargeInput ? 'LET OP: input is groot, houd de structuur compact en doelmatig.' : '',
      '\n# Instructions\n',
      instructionsMd,
      '\n# Spec\n',
      specMd,
      '\n# Components Schema (JSON Schema)\n',
      JSON.stringify(componentsSchemaJson, null, 2),
    ].join('\n')

    const userPromptText = `Genereer een wireframe voor het volgende project:

**Projectnaam:** ${projectName}
${companyName ? `**Bedrijfsnaam:** ${companyName}` : ''}
${description ? `**Beschrijving:** ${description}` : ''}
**Taal:** ${language}
${additionalContext ? `**Extra context:** ${additionalContext}` : ''}
${files && files.length > 0 ? `\n**Aantal bijgevoegde bestanden:** ${files.length} (zie bijgevoegde documenten voor extra context)` : ''}

${numPages ? `**Gevraagd aantal pagina's:** ${numPages} (gebruik dit als richtlijn, maar pas aan indien nodig)` : "**Bepaal zelf het optimale aantal pagina's** op basis van de projectbeschrijving en best practices"}

KRITIEK: Je MOET de tool 'emit_wireframe' gebruiken. GEEN tekstuele output, ALLEEN een tool call met de volledige JSON. Start direct met de tool call, geen uitleg vooraf.`

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

    // Call Anthropic API with tools (opt for faster model / fewer tokens for large inputs)
    const isLargeInput = (description?.length || 0) > 500 || (files && files.length > 0)
    const selectedModel = 'claude-opus-4-5-20251101'
    const maxTokens = 64000

    // Retry logic for Anthropic API overload errors (529) and empty tool calls
    const maxRetries = 3
    const baseDelay = 1000 // 1 second
    let message: any = null
    let lastError: any = null
    let wireframeJson: any = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        message = await anthropic.messages.create({
          model: selectedModel,
          max_tokens: maxTokens,
          temperature: 0.0, // Lower temperature for more deterministic tool use
          system: systemPrompt,
          tools: wireframeTools,
          tool_choice: { type: 'tool', name: 'emit_wireframe' }, // Force tool use
          messages: [
            {
              role: 'user',
              content: messageContent,
            },
          ],
        })

        // Check if tool call has valid data
        wireframeJson = null
        for (const content of message.content) {
          if (content.type === 'tool_use' && content.name === 'emit_wireframe') {
            wireframeJson = content.input?.wireframe
            break
          }
        }

        // If we have valid wireframe JSON, success - break out of retry loop
        if (wireframeJson && Array.isArray(wireframeJson) && wireframeJson.length > 0) {
          if (attempt > 0) {
            console.log(`Anthropic API call succeeded on attempt ${attempt + 1}`)
          }
          break
        }

        // Empty or invalid tool call - retry if we have attempts left
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff: 1s, 2s, 4s
          console.warn(
            `Empty or invalid tool call, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // Max retries reached with empty tool call
        throw new Error('AI returned empty or invalid wireframe after all retries')
      } catch (error: any) {
        lastError = error
        const status = error?.status || error?.response?.status
        const isOverloaded = status === 529 || error?.error?.type === 'overloaded_error'

        // Only retry on 529 overloaded errors
        if (isOverloaded && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff: 1s, 2s, 4s
          console.warn(
            `Anthropic API overloaded (529), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // Not a retryable error or max retries reached - throw
        throw error
      }
    }

    // If we exhausted retries and still no message, throw last error
    if (!message) {
      throw lastError || new Error('Failed to get response from Anthropic API after retries')
    }

    // Save full communication to Supabase Storage for inspection (skip for large input; add short timeout)
    let logFilePath: string | null = null
    try {
      if (!isLargeInput) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (supabaseUrl && supabaseServiceRoleKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
          const bucket = 'ai-logs'

          try {
            await supabase.storage.createBucket(bucket, { public: false })
          } catch (_) {}

          const safeProject = projectName.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const fileName = `full-log/${timestamp}_${safeProject}.json`

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
              model: selectedModel,
              temperature: 0.2,
              maxTokens,
              tools: wireframeTools,
              hasAttachments: !!(files && files.length > 0),
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

          const abort = new AbortController()
          const t = setTimeout(() => abort.abort(), 5000)
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, fileBody, {
              upsert: true,
              contentType: 'application/json',
              signal: abort.signal,
            })
          clearTimeout(t)
          if (!uploadError) {
            logFilePath = `${bucket}/${fileName}`
            console.log('Log saved to Storage:', fileName)
          }
        }
      }
    } catch (e) {
      console.error('Error saving log file:', e)
    }

    console.log('Response received')

    // Extract wireframe JSON and sitemap proposal
    // wireframeJson is already set from retry loop if valid, otherwise parse again
    let sitemapProposal = ''
    let responseText = ''

    // Parse response: prioritize tool_use, fallback to text + code block
    // Only parse if wireframeJson wasn't already set in retry loop
    if (!wireframeJson || !Array.isArray(wireframeJson) || wireframeJson.length === 0) {
      wireframeJson = null
      for (const content of message.content) {
        if (content.type === 'text') {
          responseText += content.text
        } else if (content.type === 'tool_use' && content.name === 'emit_wireframe') {
          wireframeJson = content.input?.wireframe
        }
      }
    } else {
      // Extract text for sitemap proposal if we already have wireframeJson
      for (const content of message.content) {
        if (content.type === 'text') {
          responseText += content.text
        }
      }
    }

    // Fallback: if no tool_use, try to extract JSON from text (code blocks or raw JSON)
    if (!wireframeJson && responseText) {
      // Try code block first
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          wireframeJson = JSON.parse(jsonMatch[1])
        } catch (e) {
          console.error('Failed to parse JSON from code block:', e)
        }
      }

      // If still no JSON, try to find raw JSON array in text
      if (!wireframeJson) {
        const arrayMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/)
        if (arrayMatch) {
          try {
            wireframeJson = JSON.parse(arrayMatch[0])
          } catch (e) {
            console.error('Failed to parse JSON from raw text:', e)
          }
        }
      }
    }

    // Extract sitemap proposal
    if (responseText) {
      const jsonStart = responseText.indexOf('```json')
      sitemapProposal =
        jsonStart > 0 ? responseText.substring(0, jsonStart).trim() : responseText.trim()
    }

    // Validate wireframe JSON with schema
    if (wireframeJson) {
      const ajv = new Ajv({ allErrors: true, strict: false })
      const validate = ajv.compile(componentsSchemaJson)
      const valid = validate(wireframeJson)

      if (!valid) {
        const elapsedMs = Date.now() - callStart
        const skipRepair = elapsedMs > 45000 || isLargeInput
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

    // Hard guard: als er geen bruikbare array is, error met 502 (niet "success")
    if (!Array.isArray(wireframeJson) || wireframeJson.length === 0) {
      console.error('No valid wireframe JSON returned from model', {
        hasWireframeJson: !!wireframeJson,
        isArray: Array.isArray(wireframeJson),
        length: wireframeJson?.length,
        responseText: responseText?.substring(0, 500), // First 500 chars for debugging
      })
      return new Response(
        JSON.stringify({
          error: 'AI did not return valid wireframe JSON',
          message:
            'De AI heeft geen geldig wireframe geretourneerd. Probeer het opnieuw met een kortere beschrijving of zonder bijlagen.',
          hint: 'Probeer kortere beschrijving of zonder bijlagen; of probeer opnieuw.',
          fullResponse: responseText || null,
          details: {
            hasWireframeJson: !!wireframeJson,
            isArray: Array.isArray(wireframeJson),
            length: wireframeJson?.length,
          },
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

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
  } catch (error: any) {
    console.error('Error:', error)

    // Handle Anthropic API overload errors specifically
    const status = error?.status || error?.response?.status
    const isOverloaded = status === 529 || error?.error?.type === 'overloaded_error'

    if (isOverloaded) {
      return new Response(
        JSON.stringify({
          error: 'Anthropic API is temporarily overloaded',
          message:
            'De AI service is momenteel overbelast. Probeer het over een paar seconden opnieuw.',
          details:
            'Alle retry pogingen zijn mislukt. De service is mogelijk tijdelijk niet beschikbaar.',
          retryable: true,
        }),
        {
          status: 503, // Service Unavailable
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        error: error?.message || 'Unknown error',
        details: error?.toString() || String(error),
      }),
      {
        status: error?.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
