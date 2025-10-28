// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'

// Import context files
import { COMPONENTS_SCHEMA, INSTRUCTIONS, SPEC } from './context.ts'
// Import dummy data
import dummyDataTemplate from './dummyData.json' with { type: 'json' }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  numPages: number
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
    if (!projectName || !numPages || !language) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: projectName, numPages, language' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if Anthropic API key is configured
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    // If no API key, return dummy data for testing
    if (!anthropicApiKey) {
      console.log('No ANTHROPIC_API_KEY found - returning dummy data')

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
    const systemPrompt = `Je bent een expert UX/UI designer en wireframe architect.
    Je taak is om wireframes te genereren in JSON formaat volgens het opgegeven schema.

# Context Bestanden

## Components Schema (JSON Schema voor validatie)
${COMPONENTS_SCHEMA}

## Instructions
${INSTRUCTIONS}

## Spec (Component Specificaties)
${SPEC}

Volg deze instructies EXACT op. Genereer altijd valide JSON volgens het schema.`

    const userPromptText = `Genereer een wireframe sitemap voor het volgende project:

**Projectnaam:** ${projectName}
${companyName ? `**Bedrijfsnaam:** ${companyName}` : ''}
${description ? `**Beschrijving:** ${description}` : ''}
**Aantal pagina's:** ${numPages}
**Taal:** ${language}
${additionalContext ? `**Extra context:** ${additionalContext}` : ''}
${files && files.length > 0 ? `\n**Aantal bijgevoegde bestanden:** ${files.length} (zie bijgevoegde documenten voor extra context)` : ''}

Volg de werkwijze uit de instructies:
1. Eerst een tekstuele sitemap met uitleg (Stap 2)
2. Daarna de volledige JSON output (Stap 3)

Begin nu met de sitemapfase.`

    // Build message content with files (if any)
    const messageContent: any[] = []

    // Add uploaded files first (PDFs/documents for AI context)
    if (files && files.length > 0) {
      console.log(`Adding ${files.length} file(s) to AI context...`)
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
          console.log(`- Added PDF: ${file.name} (${Math.round(file.size / 1024)}KB)`)
        } else if (file.type.startsWith('image/')) {
          messageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: file.type,
              data: file.data,
            },
          })
          console.log(`- Added Image: ${file.name} (${Math.round(file.size / 1024)}KB)`)
        }
      }
    }

    // Add text prompt
    messageContent.push({
      type: 'text',
      text: userPromptText,
    })

    console.log('Calling Anthropic API...')

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    })

    // Log de volledige message van Claude
    console.log('Anthropic API response received')
    console.log('=== FULL CLAUDE MESSAGE ===')
    console.log(JSON.stringify(message, null, 2))
    console.log('=== END CLAUDE MESSAGE ===')

    // Extract the response text
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Try to extract JSON from the response
    let wireframeJson = null
    let sitemapProposal = responseText

    // Look for JSON in the response (usually in code blocks)
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        wireframeJson = JSON.parse(jsonMatch[1])
        // Extract sitemap proposal (text before JSON)
        const jsonStart = responseText.indexOf('```json')
        sitemapProposal = responseText.substring(0, jsonStart).trim()
      } catch (e) {
        console.error('Failed to parse JSON from response:', e)
      }
    }

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        sitemapProposal,
        wireframeJson,
        fullResponse: responseText,
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
