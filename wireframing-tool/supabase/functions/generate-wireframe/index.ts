// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'

// Import context files
import { COMPONENTS_SCHEMA, INSTRUCTIONS, SPEC } from './context.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProjectRequest {
  projectName: string
  companyName?: string
  description?: string
  numPages: number
  language: string
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

      const dummyWireframe = [
        {
          page: 'Homepage (Dummy)',
          blocks: [
            {
              component: 'Hero',
              props: {
                'Has Title': true,
                'Hero Title': `Welkom bij ${projectName}`,
                'Has Description': true,
                Description: description || 'Een moderne en gebruiksvriendelijke website',
                'Has Usps': true,
                'Usp 1': 'Hoogste kwaliteit',
                'Usp 2': 'Snelle service',
                'Usp 3': 'Tevreden klanten',
                'Has Button Primary': true,
                'Has Button Secondary': false,
              },
              children: [
                {
                  component: 'Button Primary',
                  props: {
                    'Property 1': 'Default',
                    'Text primary button': 'Meer informatie',
                  },
                },
              ],
            },
            {
              component: 'Grid',
              props: {
                'Property 1': 'Default',
                Title: 'Onze diensten',
              },
              children: [
                {
                  component: 'Inner Grid Card',
                  index: 0,
                  props: {
                    Title: 'Dienst 1',
                    Description: 'Uitstekende kwaliteit en service',
                    'Has button': true,
                  },
                  children: [
                    {
                      component: 'Button Primary',
                      props: {
                        'Property 1': 'Default',
                        'Text primary button': 'Lees meer',
                      },
                    },
                  ],
                },
                {
                  component: 'Inner Grid Card',
                  index: 1,
                  props: {
                    Title: 'Dienst 2',
                    Description: 'Professionele aanpak',
                    'Has button': true,
                  },
                  children: [
                    {
                      component: 'Button Primary',
                      props: {
                        'Property 1': 'Default',
                        'Text primary button': 'Lees meer',
                      },
                    },
                  ],
                },
                {
                  component: 'Inner Grid Card',
                  index: 2,
                  props: {
                    Title: 'Dienst 3',
                    Description: 'Tevreden klanten',
                    'Has button': true,
                  },
                  children: [
                    {
                      component: 'Button Primary',
                      props: {
                        'Property 1': 'Default',
                        'Text primary button': 'Lees meer',
                      },
                    },
                  ],
                },
              ],
            },
            {
              component: 'CalltoAction',
              props: {
                'Has Title': true,
                Title: 'Klaar om te starten?',
                'Has Description': true,
                Description: 'Neem vandaag nog contact met ons op',
                'Has Usps': false,
                'Has Button Primary': true,
                'Has Button Secondary': false,
              },
              children: [
                {
                  component: 'Button Primary',
                  props: {
                    'Property 1': 'Default',
                    'Text primary button': 'Contact opnemen',
                  },
                },
              ],
            },
            {
              component: 'Footer',
              props: {
                'Has Column 1': true,
                'Header 1': 'Over ons',
                Link1A: 'Wie zijn wij',
                Link1B: 'Ons team',
                Link1C: 'Carrière',
                'Has Column 2': true,
                'Header 2': 'Diensten',
                Link2A: 'Dienst 1',
                Link2B: 'Dienst 2',
                Link2C: 'Dienst 3',
                'Has Column 3': true,
                'Header 3': 'Contact',
                Link3A: 'Email ons',
                Link3B: 'Bel ons',
                Link3C: 'Locatie',
                'Has Column 4': false,
                'Has Nieuwsbrief': true,
              },
            },
          ],
        },
        {
          page: 'Contact',
          blocks: [
            {
              component: 'Hero',
              props: {
                'Has Title': true,
                'Hero Title': 'Neem contact op',
                'Has Description': true,
                Description: 'We helpen je graag verder',
                'Has Usps': false,
                'Has Button Primary': false,
                'Has Button Secondary': false,
              },
              children: [],
            },
            {
              component: 'Kolommen',
              props: {
                'Property 1': 'Default',
              },
              children: [
                {
                  component: 'Media',
                  props: {
                    'Property 1': 'Default',
                  },
                },
                {
                  component: 'Content Kolommen Block',
                  props: {
                    'Has Accordion': false,
                    'Has Text': true,
                  },
                  children: [
                    {
                      component: 'Text Element',
                      props: {
                        'Has Primary Button': true,
                        'Has Second Button': false,
                        'Has List': false,
                        'Has description': true,
                        'Title of text Block': 'Contacteer ons',
                        Description: 'Vul het formulier in en we nemen snel contact op',
                      },
                      children: [
                        {
                          component: 'Button Primary',
                          props: {
                            'Property 1': 'Default',
                            'Text primary button': 'Verstuur bericht',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              component: 'Footer',
              props: {
                'Has Column 1': true,
                'Header 1': 'Over ons',
                Link1A: 'Wie zijn wij',
                Link1B: 'Ons team',
                Link1C: 'Carrière',
                'Has Column 2': true,
                'Header 2': 'Diensten',
                Link2A: 'Dienst 1',
                Link2B: 'Dienst 2',
                Link2C: 'Dienst 3',
                'Has Column 3': true,
                'Header 3': 'Contact',
                Link3A: 'Email ons',
                Link3B: 'Bel ons',
                Link3C: 'Locatie',
                'Has Column 4': false,
                'Has Nieuwsbrief': true,
              },
            },
          ],
        },
      ]

      return new Response(
        JSON.stringify({
          success: true,
          sitemapProposal: `# Dummy Sitemap voor ${projectName}\n\n**LET OP:** Dit is dummy data omdat er geen Anthropic API key is geconfigureerd.\n\n## Homepage\n- Hero sectie met title en USPs\n- Grid met 3 diensten\n- Call to Action\n- Footer\n\n## Contact\n- Hero met contacttitel\n- Kolommen met formulier\n- Footer\n\nConfigureer ANTHROPIC_API_KEY voor echte AI-gegenereerde wireframes.`,
          wireframeJson: dummyWireframe,
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

    const userPrompt = `Genereer een wireframe sitemap voor het volgende project:

**Projectnaam:** ${projectName}
${companyName ? `**Bedrijfsnaam:** ${companyName}` : ''}
${description ? `**Beschrijving:** ${description}` : ''}
**Aantal pagina's:** ${numPages}
**Taal:** ${language}
${additionalContext ? `**Extra context:** ${additionalContext}` : ''}

Volg de werkwijze uit de instructies:
1. Eerst een tekstuele sitemap met uitleg (Stap 2)
2. Daarna de volledige JSON output (Stap 3)

Begin nu met de sitemapfase.`

    console.log('Calling Anthropic API...')

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    console.log('Anthropic API response received')

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
