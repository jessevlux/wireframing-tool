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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// Tool definitions for split AI calls
// Phase 1: Generate sitemap (sections + page names)
const sitemapTool = [
  {
    name: 'emit_sitemap',
    description: 'Genereer de sitemap structuur met sections en pagina namen (zonder blokken).',
    input_schema: {
      type: 'object',
      properties: {
        sitemap: {
          type: 'object',
          properties: {
            sections: {
              type: 'array',
              description: 'Array van Craft CMS section definities',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  handle: { type: 'string' },
                  type: { type: 'string', enum: ['single', 'channel', 'structure'] },
                  slug: { type: 'string' },
                  template: { type: 'string' },
                  entryTypes: { type: 'array', items: { type: 'string' } },
                  fetchesFrom: { type: 'string' },
                  categories: { type: 'array', items: { type: 'string' } },
                  maxLevels: {
                    type: 'integer',
                    description: 'Maximum hiërarchie diepte voor structure sections (2-4)',
                  },
                  levels: { type: 'array', description: 'Level configuratie voor structure' },
                },
                required: ['name', 'handle', 'type', 'slug', 'template'],
              },
            },
            pages: {
              type: 'array',
              description: 'Array van pagina namen met rationale (zonder blokken)',
              items: {
                type: 'object',
                properties: {
                  page: { type: 'string' },
                  section: { type: 'string' },
                  rationale: { type: 'string' },
                  level: {
                    type: 'integer',
                    description: 'VERPLICHT voor structure pages: hiërarchie niveau (1=root)',
                  },
                  parent: {
                    type: ['string', 'null'],
                    description:
                      'VERPLICHT voor structure pages: titel van parent (null voor level 1)',
                  },
                },
                required: ['page', 'section', 'rationale'],
              },
            },
          },
          required: ['sections', 'pages'],
        },
      },
      required: ['sitemap'],
    },
  },
]

// Phase 2: Generate blocks for specific pages
const pageBlocksTool = [
  {
    name: 'emit_page_blocks',
    description: "Genereer de blokken voor de opgegeven pagina's.",
    input_schema: {
      type: 'object',
      properties: {
        pages: {
          type: 'array',
          description: "Array van pagina's met hun blokken",
          items: {
            type: 'object',
            properties: {
              page: { type: 'string' },
              section: { type: 'string' },
              rationale: { type: 'string' },
              level: { type: 'integer', description: 'Structure page hiërarchie niveau' },
              parent: { type: ['string', 'null'], description: 'Structure page parent titel' },
              blocks: { type: 'array', description: 'Array van component blocks' },
            },
            required: ['page', 'section', 'blocks'],
          },
        },
      },
      required: ['pages'],
    },
  },
]

// Legacy tool for compatibility and auto-repair
const wireframeTools = [
  {
    name: 'emit_wireframe',
    description: 'Retourneer de volledige wireframe JSON met sections en pages.',
    input_schema: {
      type: 'object',
      properties: {
        wireframe: {
          type: 'object',
          properties: {
            sections: { type: 'array' },
            pages: { type: 'array' },
          },
          required: ['sections', 'pages'],
        },
      },
      required: ['wireframe'],
    },
  },
]

// Tool for generating a single section
const sectionTool = [
  {
    name: 'emit_section',
    description: "Genereer een nieuwe section met optionele pagina's",
    input_schema: {
      type: 'object',
      properties: {
        section: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            handle: { type: 'string' },
            type: { type: 'string', enum: ['single', 'channel', 'structure'] },
            slug: { type: 'string' },
            template: { type: 'string' },
            entryTypes: { type: 'array', items: { type: 'string' } },
            fetchesFrom: { type: 'string' },
            categories: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'handle', 'type', 'slug', 'template'],
        },
        pages: {
          type: 'array',
          description: "Optionele initiële pagina's voor deze section",
          items: {
            type: 'object',
            properties: {
              page: { type: 'string' },
              section: { type: 'string' },
              rationale: { type: 'string' },
              blocks: { type: 'array' },
            },
            required: ['page', 'section', 'rationale', 'blocks'],
          },
        },
      },
      required: ['section'],
    },
  },
]

// Retry helper with exponential backoff for 529 (overloaded) errors
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelayMs?: number
    maxDelayMs?: number
    retryableStatuses?: number[]
    onRetry?: (attempt: number, delay: number) => Promise<void>
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 2000,
    maxDelayMs = 30000,
    retryableStatuses = [529, 503, 502],
    onRetry,
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Check if this is a retryable error
      const isRetryable =
        retryableStatuses.includes(error.status) || error.headers?.['x-should-retry'] === 'true'

      if (!isRetryable || attempt === maxRetries) {
        throw error
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs,
      )

      console.log(`Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms...`)

      // Call onRetry callback if provided (for progress updates)
      if (onRetry) {
        await onRetry(attempt + 1, delay)
      }

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Phase 1: Generate sitemap (sections + page names without blocks)
async function generateSitemap(
  anthropic: any,
  systemPrompt: string,
  messageContent: any[],
  userContext: string,
): Promise<{ sections: any[]; pages: { page: string; section: string; rationale: string }[] }> {
  // Extract numPages from userContext if present
  const numPagesMatch = userContext.match(/EXACT (\d+) pagina/)
  const numPages = numPagesMatch ? parseInt(numPagesMatch[1], 10) : null

  const sitemapPrompt = `${userContext}

FASE 1: Genereer ALLEEN de sitemap structuur.
- Bepaal welke sections (single/channel/structure) nodig zijn
- Bepaal welke pagina's er moeten komen
- Geef per pagina een korte rationale (2-3 zinnen)
- GEEN blokken genereren in deze fase
${numPages ? `\n**STRICT: Genereer EXACT ${numPages} pagina's.** Niet meer, niet minder.` : ''}

BELANGRIJK voor channel sections:
- Maak ALTIJD een overzichtspagina (single) die entries fetcht uit de channel
- Maak OOK een voorbeeld detailpagina voor elke channel (bijv. "Nieuws detail", "Project detail")
- De detailpagina krijgt de channel handle als section

BELANGRIJK voor structure sections:
- Gebruik structure voor hiërarchische content (parent-child relaties)
- Voorbeelden: Diensten met sub-diensten, Documentatie met sub-pagina's
- Voor sections met type "structure", geef maxLevels (2-4) aan
- VERPLICHT: Elke page in een structure section MOET "level" en "parent" hebben:
  - level: 1 = root/overzicht, 2 = categorie, 3 = detail
  - parent: null voor level 1, anders de titel van de parent page
- Voorbeeld: {"page": "Diensten", "section": "diensten", "level": 1, "parent": null}
- Voorbeeld: {"page": "Cloud Services", "section": "diensten", "level": 2, "parent": "Diensten"}
- Voorbeeld: {"page": "AWS Migratie", "section": "diensten", "level": 3, "parent": "Cloud Services"}

Gebruik de emit_sitemap tool om de sitemap te retourneren.`

  const content = [...messageContent]
  content[content.length - 1] = { type: 'text', text: sitemapPrompt }

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 8000, // Smaller output = less CPU
    temperature: 0.0,
    system: systemPrompt,
    tools: sitemapTool,
    tool_choice: { type: 'tool', name: 'emit_sitemap' },
    messages: [{ role: 'user', content }],
  })

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'emit_sitemap') {
      return block.input.sitemap
    }
  }

  throw new Error('Phase 1 did not return valid sitemap')
}

// Phase 2: Generate blocks for a batch of pages
async function generatePageBlocks(
  anthropic: any,
  systemPrompt: string,
  sitemap: { sections: any[]; pages: any[] },
  pageBatch: { page: string; section: string; rationale: string }[],
): Promise<any[]> {
  const pageNames = pageBatch.map((p) => p.page).join(', ')

  // Build section types context
  const sectionTypes = sitemap.sections
    .map(
      (s) => `- ${s.handle}: ${s.type}${s.fetchesFrom ? ` (fetches from ${s.fetchesFrom})` : ''}`,
    )
    .join('\n')

  // Strict component examples to ensure valid output
  const componentExamples = `
**EXACTE COMPONENT STRUCTUUR (volg dit PRECIES):**

1. Hero:
{"component":"Hero","props":{"Has Title":true,"Hero Title":"Titel","Has Description":true,"Description":"Tekst","Has Usps":false,"Has Button Primary":true,"Has Button Secondary":false},"children":[{"component":"Button Primary","props":{"Property 1":"Default","Text primary button":"Knop"}}]}

2. Kolommen (EXACT 2 children: Media + Content Kolommen Block):
{"component":"Kolommen","props":{"Property 1":"Default"},"children":[{"component":"Media","props":{"Property 1":"Default"}},{"component":"Content Kolommen Block","props":{"Has Accordion":false,"Has Text":true},"children":[{"component":"Text Element","props":{"Has Primary Button":true,"Has Second Button":false,"Has List":false,"Has description":true,"Title of text Block":"Titel","Description":"Tekst"},"children":[{"component":"Button Primary","props":{"Property 1":"Default","Text primary button":"Lees meer"}}]}]}]}

3. Grid staticContent (variant bepaalt aantal cards - Default=3):
{"component":"Grid","props":{"Property 1":"Default","Title":"Onze diensten"},"children":[{"component":"Inner Grid Card","index":0,"props":{"Title":"Card 1","Description":"Beschrijving","Has button":true},"children":[{"component":"Button Primary","props":{"Property 1":"Default","Text primary button":"Meer info"}}]},{"component":"Inner Grid Card","index":1,"props":{"Title":"Card 2","Description":"Beschrijving","Has button":true},"children":[{"component":"Button Primary","props":{"Property 1":"Default","Text primary button":"Meer info"}}]},{"component":"Inner Grid Card","index":2,"props":{"Title":"Card 3","Description":"Beschrijving","Has button":true},"children":[{"component":"Button Primary","props":{"Property 1":"Default","Text primary button":"Meer info"}}]}]}

4. Grid entrySection (MET dummy children voor preview):
{"component":"Grid","blockType":"entrySection","fetchesFrom":"news","props":{"Property 1":"Default","Title":"Laatste nieuws"},"children":[{"component":"Inner Grid Card","index":0,"props":{"Title":"Nieuwsbericht 1","Description":"Preview tekst","Has button":true},"children":[{"component":"Button Primary","props":{"Property 1":"Default","Text primary button":"Lees meer"}}]},{"component":"Inner Grid Card","index":1,"props":{"Title":"Nieuwsbericht 2","Description":"Preview tekst","Has button":true},"children":[{"component":"Button Primary","props":{"Property 1":"Default","Text primary button":"Lees meer"}}]},{"component":"Inner Grid Card","index":2,"props":{"Title":"Nieuwsbericht 3","Description":"Preview tekst","Has button":true},"children":[{"component":"Button Primary","props":{"Property 1":"Default","Text primary button":"Lees meer"}}]}]}

5. Detailpage (voor channel entries EN structure leaf nodes - EXACT 3 blokken totaal):
{"component":"Detailpage","props":{"Has Project Header":false,"Has News Header":true,"Paragraph 1":"Intro tekst","Paragraph 2":"Meer details","Has Highlight Paragraph":true,"Highlight Title":"Uitgelicht","Highlight Paragraph":"Belangrijke info","Paragraph 3 Title":"Vervolg","Paragraph 3":"Meer content","Paragraph 4":"Afsluitende tekst","Has More Projects":false,"Has More News":true}}

6. CalltoAction:
{"component":"CalltoAction","props":{"Has Title":true,"Title":"CTA Titel","Has Description":true,"Description":"CTA tekst","Has Usps":false,"Has Button Primary":true,"Has Button Secondary":false},"children":[{"component":"Button Primary","props":{"Property 1":"Default","Text primary button":"Neem contact op"}}]}

7. Footer:
{"component":"Footer","props":{"Has Column 1":true,"Header 1":"Navigatie","Link1A":"Home","Link1B":"Over ons","Has Column 2":true,"Header 2":"Contact","Link2A":"info@email.com","Has Column 3":false,"Has Column 4":false,"Has Nieuwsbrief":false}}

8. Contactform:
{"component":"Contactform","props":{}}

9. MediaGroot:
{"component":"MediaGroot","props":{}}

10. MediaSlider:
{"component":"MediaSlider","props":{"Title":"Galerij"}}

**KRITIEK: Gebruik EXACT deze prop namen (hoofdlettergevoelig!). Geen extra props toevoegen.**`

  // Generic decision rules
  const decisionRules = `
**BESLISREGELS (VERPLICHT VOLGEN):**

1. SECTION TYPE BEPAALT BLOKKEN:
   - "channel" section → ALLEEN: Detailpage, CalltoAction, Footer (niets anders!)
   - "structure" section ZONDER children (leaf node) → ALLEEN: Detailpage, CalltoAction, Footer
   - "structure" section MET children → Hero + Grid met entrySection
   - "single" section met fetchesFrom → gebruik entrySection blokken
   - "single" section zonder fetchesFrom → normale blokken

2. VARIANT BEPAALT CHILDREN:
   Kies EERST een variant, genereer dan EXACT dat aantal children.
   - Grid Default → 3 Inner Grid Cards
   - Grid Variant2 → 4 Inner Grid Cards
   - Grid Variant3 → 2 Inner Grid Cards

3. COMPONENT STRUCTUUR IS EXACT:
   - Kolommen: ALTIJD exact 2 children [Media, Content Kolommen Block]
   - entrySection: MOET children hebben voor preview (dummy data)
   - Niet meer, niet minder, niet anders

4. ENTRYSECTION VOOR DYNAMISCHE CONTENT:
   - Als content uit een channel/structure komt → blockType: "entrySection" + fetchesFrom
   - BELANGRIJK: Genereer ALTIJD 3-4 'dummy' Inner Grid Cards als children
   - Deze dummy cards moeten representatief zijn voor de content (bijv. "Project A", "Nieuwsbericht 1")
   - Dit zorgt ervoor dat de preview er goed uitziet, ook zonder CMS data
   - ZONDER children toont de editor een lege grid, DUS ALTIJD TOEVOEGEN!
   - LET OP: Het toevoegen van children maakt het GEEN staticContent! Blijf blockType: "entrySection" gebruiken!
`

  const blocksPrompt = `FASE 2: Genereer de blokken voor deze pagina's: ${pageNames}

**Section types (check dit voor elke pagina):**
${sectionTypes}

${decisionRules}

${componentExamples}

**Pagina's om te verwerken:**
${JSON.stringify(pageBatch, null, 2)}

Genereer voor elke pagina een blocks array. Check EERST het section type, pas dan de beslisregels toe.`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 32000,
    temperature: 0.0,
    system:
      'Je bent een wireframe generator. Genereer EXACT valide JSON volgens de gegeven voorbeelden. Gebruik PRECIES de prop namen uit de voorbeelden.',
    tools: pageBlocksTool,
    tool_choice: { type: 'tool', name: 'emit_page_blocks' },
    messages: [{ role: 'user', content: blocksPrompt }],
  })

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'emit_page_blocks') {
      return block.input.pages
    }
  }

  throw new Error(`Phase 2 did not return blocks for: ${pageNames}`)
}

// Component name normalization map (common AI mistakes -> correct names)
const COMPONENT_NAME_MAP: Record<string, string> = {
  ButtonPrimary: 'Button Primary',
  'Primary Button': 'Button Primary',
  'button primary': 'Button Primary',
  ButtonSecondary: 'Button Secondary',
  'Secondary Button': 'Button Secondary',
  'button secondary': 'Button Secondary',
  InnerGridCard: 'Inner Grid Card',
  GridCard: 'Inner Grid Card',
  'Inner grid card': 'Inner Grid Card',
  ContentKolommenBlock: 'Content Kolommen Block',
  'Content kolommen block': 'Content Kolommen Block',
  TextElement: 'Text Element',
  'Text element': 'Text Element',
  AccordionList: 'Accordion list',
  'Accordion List': 'Accordion list',
  // Grid2Col (was Projects)
  grid2col: 'Grid2Col',
  'Grid2Col Card': 'Grid2Col Card',
  // Grid3Col (was News)
  grid3col: 'Grid3Col',
  'Grid3Col Card': 'Grid3Col Card',
  // Legacy mappings (oude data)
  News: 'Grid3Col',
  Projects: 'Grid2Col',
  'News Card': 'Grid3Col Card',
  'Project Card': 'Grid2Col Card',
  hero: 'Hero',
  media: 'Media',
  footer: 'Footer',
  grid: 'Grid',
  form: 'Form',
  // Detailpage spelling fixes
  'Detail page': 'Detailpage',
  'Detail Page': 'Detailpage',
  Detailpage: 'Detailpage',
  detailpage: 'Detailpage',
}

// Prop name normalization for specific components
const PROP_FIXES: Record<string, Record<string, string>> = {
  'Button Primary': {
    'Text Secondary Button': 'Text primary button',
    'Text secondary button': 'Text primary button',
    'text primary button': 'Text primary button',
  },
  'Button Secondary': {
    'Text primary button': 'Text Secondary Button',
    'text secondary button': 'Text Secondary Button',
    'Text secondary button': 'Text Secondary Button',
  },
}

// Recursively sanitize a component/block and its children
function sanitizeComponent(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj

  // Normalize component name
  if (obj.component) {
    const normalized = COMPONENT_NAME_MAP[obj.component]
    if (normalized) {
      obj.component = normalized
    }
  }

  // Fix prop names for this component
  if (obj.component && obj.props && PROP_FIXES[obj.component]) {
    const fixes = PROP_FIXES[obj.component]
    const newProps: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj.props)) {
      const fixedKey = fixes[key] || key
      newProps[fixedKey] = value
    }
    obj.props = newProps
  }

  // Ensure Button Primary has correct props if secondary props are present
  if (obj.component === 'Button Primary' && obj.props) {
    // If it has Secondary button text but not primary, it's likely meant to be Button Secondary
    if (obj.props['Text Secondary Button'] && !obj.props['Text primary button']) {
      obj.component = 'Button Secondary'
    }
    // Remove any secondary button props from Button Primary
    delete obj.props['Text Secondary Button']
  }

  // Ensure Button Secondary has correct props
  if (obj.component === 'Button Secondary' && obj.props) {
    // If it has primary button text but not secondary, it's likely meant to be Button Primary
    if (obj.props['Text primary button'] && !obj.props['Text Secondary Button']) {
      obj.component = 'Button Primary'
    }
    // Remove any primary button props from Button Secondary
    delete obj.props['Text primary button']
  }

  // Recursively process children
  if (Array.isArray(obj.children)) {
    obj.children = obj.children.map((child: any) => sanitizeComponent(child))
  }

  return obj
}

// Sanitize entire wireframe (all pages and blocks)
function sanitizeWireframe(wireframe: any): any {
  if (!wireframe || !wireframe.pages) return wireframe

  for (const page of wireframe.pages) {
    if (Array.isArray(page.blocks)) {
      page.blocks = page.blocks.map((block: any) => sanitizeComponent(block))
    }
  }

  return wireframe
}

// Repair individual page blocks with detailed schema rules
async function repairPageBlocks(
  anthropic: any,
  page: any,
  errors: any[],
  specMd: string,
): Promise<any> {
  // Extract unique error patterns for clearer repair instructions
  const errorPatterns = new Set<string>()
  const propIssues: string[] = []

  for (const err of errors.slice(0, 20)) {
    const path = err.instancePath || ''
    const keyword = err.keyword || ''
    const message = err.message || ''

    if (keyword === 'const') {
      // Component name mismatch
      const expected = err.params?.allowedValue
      if (expected) {
        errorPatterns.add(
          `Component name must be exactly "${expected}" (including spaces and capitalization)`,
        )
      }
    } else if (keyword === 'required') {
      const missing = err.params?.missingProperty
      if (missing) {
        propIssues.push(`Missing required property: "${missing}"`)
      }
    } else if (keyword === 'additionalProperties') {
      const extra = err.params?.additionalProperty
      if (extra) {
        propIssues.push(`Remove unexpected property: "${extra}"`)
      }
    } else if (keyword === 'enum') {
      const allowed = err.params?.allowedValues?.join(', ')
      if (allowed) {
        errorPatterns.add(`Value must be one of: ${allowed}`)
      }
    }
  }

  const schemaRules = `
EXACT COMPONENT NAMES (case-sensitive with spaces):
- "Hero" (not "hero")
- "Button Primary" (not "ButtonPrimary" or "Primary Button")
- "Button Secondary" (not "ButtonSecondary" or "Secondary Button")
- "Inner Grid Card" (not "InnerGridCard" or "GridCard")
- "Content Kolommen Block" (not "ContentKolommenBlock")
- "Text Element" (not "TextElement")
- "Accordion list" (not "AccordionList")
- "Media" (not "media")

EXACT PROP NAMES (case-sensitive):
- For Button Primary: "Property 1": "Default", "Text primary button": "..."
- For Button Secondary: "Property 1": "Default", "Text Secondary Button": "..."
- Boolean props: "Has Title", "Has Description", "Has Usps", "Has Button Primary", "Has Button Secondary"
- Do NOT add props that aren't defined for a component`

  const repairPrompt = `Fix the validation errors in this page JSON and return the corrected version.

**Issues Found:**
${Array.from(errorPatterns).slice(0, 5).join('\n')}
${propIssues.slice(0, 5).join('\n')}

**Schema Rules:**
${schemaRules}

**Current Page JSON:**
${JSON.stringify(page, null, 2)}

Fix all component names to match EXACTLY as specified (with correct spaces and capitalization).
Fix all prop names to match EXACTLY as specified.
Remove any properties not defined in the schema.
Add any missing required properties.

Return the fixed page using emit_page_blocks tool.`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 16000,
    temperature: 0.0,
    system:
      'You are a JSON validation specialist. Fix schema validation errors precisely. Pay close attention to exact string matching for component names and property names.',
    tools: pageBlocksTool,
    tool_choice: { type: 'tool', name: 'emit_page_blocks' },
    messages: [{ role: 'user', content: repairPrompt }],
  })

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'emit_page_blocks') {
      const repairedPages = block.input.pages
      if (repairedPages && repairedPages.length > 0) {
        return repairedPages[0]
      }
    }
  }

  // Return original if repair fails
  console.warn(`Repair failed for page: ${page.page}`)
  return page
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
  // Action-based routing
  action?: 'generate' | 'regenerate-page' | 'generate-section'
  // For regenerate-page action
  pageContext?: {
    page: string
    section: string
    rationale: string
    currentBlocks?: any[]
  }
  newPrompt?: string
  projectSections?: any[]
  // For generate-section action
  sectionPrompt?: string
  existingPages?: any[]
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
      action,
      pageContext,
      newPrompt,
      projectSections,
      sectionPrompt,
      existingPages,
    }: ProjectRequest = await req.json()

    // Validate input (only for default generate action)
    // For regenerate-page and generate-section, we have different required fields
    if (!action || action === 'generate') {
      if (!projectName || !language) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: projectName, language' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
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

      // Load dummy data (already in correct format with sections and pages)
      const dummyData = JSON.parse(JSON.stringify(dummyDataTemplate))

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

      const processedDummyData = replaceInObject(dummyData)

      return new Response(
        JSON.stringify({
          success: true,
          sitemapProposal: `# Dummy Sitemap voor ${projectName}\n\n${useDummyData ? '**DEMO ACCOUNT:** Dit is demo data om onnodige API calls te voorkomen.\n\n' : '**LET OP:** Dit is dummy data omdat er geen Anthropic API key is geconfigureerd.\n\n'}## Homepage\n- Hero sectie met title en USPs\n- Grid met 3 diensten\n- Entry section met nieuws\n- Call to Action\n- Footer\n\n## Nieuws Overzicht\n- Hero\n- Entry section met alle nieuws\n- Footer\n\n## Contact\n- Hero met contacttitel\n- Kolommen met formulier\n- Footer\n${useDummyData ? '' : '\nConfigureer ANTHROPIC_API_KEY voor echte AI-gegenereerde wireframes.'}`,
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
    // Only for default generate action, not for regenerate-page or generate-section
    if (useDummyData === true && (!action || action === 'generate')) {
      return returnDummyData()
    }

    // Check if Anthropic API key is configured
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')

    // If no API key, return dummy data for testing
    // Only for default generate action, action-based requests will fail with proper error
    if (!anthropicApiKey && (!action || action === 'generate')) {
      console.log('No ANTHROPIC_API_KEY - returning dummy data')
      return returnDummyData()
    }

    // For action-based requests without API key, return error
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key niet geconfigureerd' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Real Anthropic API call
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    })

    // Use embedded context (bundler-safe)
    const specMd = SPEC_MD
    const instructionsMd = INSTRUCTIONS_MD

    // ===========================================
    // ACTION: regenerate-page
    // ===========================================
    if (action === 'regenerate-page') {
      if (!pageContext || !newPrompt) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: pageContext, newPrompt' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      console.log(`Regenerating page: ${pageContext.page}`)

      // Create SSE stream
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()
      const encoder = new TextEncoder()
      const sendEvent = async (event: string, data: any) => {
        await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      ;(async () => {
        try {
          await sendEvent('progress', {
            message: `Pagina "${pageContext.page}" opnieuw genereren...`,
          })

          // Build section context for better AI understanding
          const sectionContext = projectSections
            ? projectSections
                .map(
                  (s: any) =>
                    `- ${s.handle}: ${s.type}${s.fetchesFrom ? ` (fetches from ${s.fetchesFrom})` : ''}`,
                )
                .join('\n')
            : ''

          // Determine if this is a detail page (channel section)
          const isDetailPage = projectSections?.find(
            (s: any) => s.handle === pageContext.section && s.type === 'channel',
          )

          // Build prompt that includes user's new instructions AND standard rules
          const regeneratePrompt = `Regenereer de blokken voor de volgende pagina op basis van NIEUWE INSTRUCTIES van de gebruiker.

**Pagina informatie:**
- Naam: ${pageContext.page}
- Section: ${pageContext.section}
- Type: ${isDetailPage ? 'DETAIL PAGINA (channel)' : 'Normale pagina'}
- Rationale: ${pageContext.rationale}

**Huidige blokken (ter referentie):**
${pageContext.currentBlocks ? JSON.stringify(pageContext.currentBlocks.slice(0, 3), null, 2) : 'Geen'}

**Beschikbare sections:**
${sectionContext}

**NIEUWE INSTRUCTIES VAN DE GEBRUIKER:**
${newPrompt}

**VASTE REGELS (ALTIJD VOLGEN, ONGEACHT GEBRUIKER INSTRUCTIES):**
${
  isDetailPage
    ? `
⚠️ DIT IS EEN DETAIL PAGINA - DE STRUCTUUR MAG NIET VERANDERD WORDEN!
- Detail pagina's hebben een VASTE opbouw: Detailpage component (met Header, Paragraphs, Highlight)
- Je mag ALLEEN de tekst/content binnen het Detailpage component aanpassen
- Voeg GEEN nieuwe blokken toe, verwijder GEEN blokken
- Houd exact: Detailpage met Has News Header of Has Project Header, CalltoAction, Footer
`
    : `
1. EERSTE BLOK = Hero (altijd behouden, mag wel aangepast worden qua content)
2. LAATSTE BLOK = Footer (altijd behouden, mag wel aangepast worden qua content)
3. Alleen de blokken TUSSEN Hero en Footer mogen worden toegevoegd/verwijderd/veranderd
4. Zorg dat er altijd minimaal Hero + 1 andere blok + Footer is
`
}

Gebruik de emit_page_blocks tool om de nieuwe blokken te retourneren.`

          const response = await anthropic.messages.create({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 16000,
            temperature: 0.0,
            system:
              'Je bent een wireframe generator. Genereer EXACT valide JSON volgens de gegeven voorbeelden. Gebruik PRECIES de prop namen uit de spec.',
            tools: pageBlocksTool,
            tool_choice: { type: 'tool', name: 'emit_page_blocks' },
            messages: [{ role: 'user', content: regeneratePrompt }],
          })

          let regeneratedPage = null
          for (const block of response.content) {
            if (block.type === 'tool_use' && block.name === 'emit_page_blocks') {
              const pages = block.input.pages
              if (pages && pages.length > 0) {
                regeneratedPage = {
                  ...pages[0],
                  page: pageContext.page,
                  section: pageContext.section,
                  status: 'complete',
                }
              }
            }
          }

          if (!regeneratedPage) {
            throw new Error('AI did not return a valid page')
          }

          // Sanitize the regenerated page
          if (regeneratedPage.blocks) {
            regeneratedPage.blocks = regeneratedPage.blocks.map((b: any) => sanitizeComponent(b))
          }

          await sendEvent('page_regenerated', { page: regeneratedPage })
          await sendEvent('complete', { success: true, page: regeneratedPage })
          await writer.close()
        } catch (error: any) {
          console.error('Regenerate page error:', error)
          await sendEvent('error', { message: error.message || 'Unknown error' })
          await writer.close()
        }
      })()

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // ===========================================
    // ACTION: generate-section
    // ===========================================
    if (action === 'generate-section') {
      if (!sectionPrompt) {
        return new Response(JSON.stringify({ error: 'Missing required field: sectionPrompt' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`Generating section from prompt: ${sectionPrompt.substring(0, 50)}...`)

      // Create SSE stream
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()
      const encoder = new TextEncoder()
      const sendEvent = async (event: string, data: any) => {
        await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      ;(async () => {
        try {
          await sendEvent('progress', { message: 'Section genereren met AI...' })

          // Build context about existing sections
          const existingSectionsList = projectSections
            ? projectSections.map((s: any) => `- ${s.name} (${s.handle}): ${s.type}`).join('\n')
            : 'Geen bestaande sections'

          const generateSectionPrompt = `Genereer een nieuwe Craft CMS section op basis van de volgende prompt van de gebruiker:

**GEBRUIKER PROMPT:**
${sectionPrompt}

**TAAL:** ${language || 'Nederlands'}

**BESTAANDE SECTIONS (vermijd duplicaten):**
${existingSectionsList}

**INSTRUCTIES:**
1. Bepaal het juiste section type (single/channel/structure)
2. Genereer een passende naam en handle (camelCase)
3. Bepaal de slug URL structuur
4. Genereer template pad
5. Maak optioneel 1 initiële pagina met blokken die passen bij de section

Voorbeelden van section types:
- single: Unieke pagina's (Home, Contact, Over ons)
- channel: Collecties (Nieuws, Blog, Portfolio, Cases)
- structure: Hiërarchische content (Documentatie, FAQ, Services met sub-services)

Gebruik de emit_section tool om de section te retourneren.`

          const response = await anthropic.messages.create({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 16000,
            temperature: 0.0,
            system: `Je bent een Craft CMS architect. Genereer logische section structuren voor websites.

${instructionsMd}`,
            tools: sectionTool,
            tool_choice: { type: 'tool', name: 'emit_section' },
            messages: [{ role: 'user', content: generateSectionPrompt }],
          })

          let result: any = null
          for (const block of response.content) {
            if (block.type === 'tool_use' && block.name === 'emit_section') {
              result = block.input
            }
          }

          if (!result || !result.section) {
            throw new Error('AI did not return a valid section')
          }

          // Sanitize any pages returned
          if (result.pages) {
            result.pages = result.pages.map((page: any) => {
              if (page.blocks) {
                page.blocks = page.blocks.map((b: any) => sanitizeComponent(b))
              }
              return { ...page, status: 'complete' }
            })
          }

          await sendEvent('section_generated', result)
          await sendEvent('complete', { success: true, ...result })
          await writer.close()
        } catch (error: any) {
          console.error('Generate section error:', error)
          await sendEvent('error', { message: error.message || 'Unknown error' })
          await writer.close()
        }
      })()

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // ===========================================
    // DEFAULT ACTION: generate (full wireframe)
    // ===========================================

    // Build the prompt for Claude
    const hasLargeInput = (description?.length || 0) > 600 || (files && files.length > 0)

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
    ].join('\n')

    const userPromptText = `Genereer een wireframe voor het volgende project:

**Projectnaam:** ${projectName}
${companyName ? `**Bedrijfsnaam:** ${companyName}` : ''}
${description ? `**Beschrijving:** ${description}` : ''}
**Taal:** ${language}
${additionalContext ? `**Extra context:** ${additionalContext}` : ''}
${files && files.length > 0 ? `\n**Aantal bijgevoegde bestanden:** ${files.length} (zie bijgevoegde documenten voor extra context)` : ''}

${numPages ? `**STRICT: Genereer EXACT ${numPages} sections (pagina's).** Niet meer, niet minder. Combineer content als nodig om aan dit aantal te voldoen.` : "**Bepaal zelf het optimale aantal pagina's** op basis van de projectbeschrijving, best practices en/of bijgevoegd document."}

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

    console.log('Starting split AI calls...')
    const callStart = Date.now()

    // Create a TransformStream for SSE
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    // Helper to send SSE event
    const sendEvent = async (event: string, data: any) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
    }

    // Start async processing with split calls
    ;(async () => {
      try {
        await sendEvent('progress', { message: 'Sitemap structuur genereren...' })

        // Phase 1: Generate sitemap
        console.log('Phase 1: Generating sitemap...')
        const sitemap = await generateSitemap(
          anthropic,
          systemPrompt,
          messageContent,
          userPromptText,
        )
        console.log(
          `Sitemap generated: ${sitemap.sections.length} sections, ${sitemap.pages.length} pages`,
        )

        // Send sitemap_ready event - frontend can create project and redirect
        const emptyPages = sitemap.pages.map((p: any, idx: number) => ({
          id: `temp-${idx}`,
          page: p.page,
          section: p.section,
          rationale: p.rationale,
          level: p.level, // Preserve structure level
          parent: p.parent, // Preserve structure parent
          blocks: [],
          status: 'pending', // Will be updated when generated
        }))

        await sendEvent('sitemap_ready', {
          sections: sitemap.sections,
          pages: emptyPages,
        })

        await sendEvent('progress', {
          message: `Sitemap gereed: ${sitemap.pages.length} pagina's gevonden`,
        })

        // Phase 2: Generate blocks in batches
        const BATCH_SIZE = 4 // Process 4 pages at a time for speed
        const allPages: any[] = []
        const totalBatches = Math.ceil(sitemap.pages.length / BATCH_SIZE)

        for (let i = 0; i < sitemap.pages.length; i += BATCH_SIZE) {
          const batch = sitemap.pages.slice(i, i + BATCH_SIZE)
          const batchNum = Math.floor(i / BATCH_SIZE) + 1
          const pageNames = batch.map((p: any) => p.page).join(', ')
          const percentage = Math.round((batchNum / totalBatches) * 100)

          await sendEvent('progress', {
            message: `Pagina's genereren (${percentage}%): ${pageNames}...`,
          })

          console.log(
            `Phase 2: Generating blocks for batch ${batchNum}/${totalBatches}: ${pageNames}`,
          )

          try {
            const pagesWithBlocks = await retryWithBackoff(
              () => generatePageBlocks(anthropic, systemPrompt, sitemap, batch),
              {
                maxRetries: 3,
                initialDelayMs: 2000,
                onRetry: async (attempt, delay) => {
                  await sendEvent('progress', {
                    message: `Batch ${batchNum} opnieuw proberen (poging ${attempt}/3, wacht ${Math.round(delay / 1000)}s)...`,
                  })
                },
              },
            )

            // IMPORTANT: Validate that all batch pages were returned by the AI
            // Also check for pages returned with empty blocks (which is also a failure)
            const returnedPageNames = new Set(pagesWithBlocks.map((p: any) => p.page))
            const missingPages = batch.filter((bp: any) => !returnedPageNames.has(bp.page))

            // Also find pages that were returned but have empty blocks
            const emptyBlockPages = pagesWithBlocks.filter(
              (p: any) =>
                batch.some((bp: any) => bp.page === p.page) && (!p.blocks || p.blocks.length === 0),
            )

            // Combine missing and empty block pages for retry
            const pagesToRetry = [
              ...missingPages,
              ...emptyBlockPages
                .map((p: any) => batch.find((bp: any) => bp.page === p.page)!)
                .filter(Boolean),
            ]

            // Remove empty block pages from pagesWithBlocks so they can be replaced after retry
            if (emptyBlockPages.length > 0) {
              const emptyPageNames = new Set(emptyBlockPages.map((p: any) => p.page))
              const originalLength = pagesWithBlocks.length
              pagesWithBlocks.splice(
                0,
                pagesWithBlocks.length,
                ...pagesWithBlocks.filter((p: any) => !emptyPageNames.has(p.page)),
              )
              console.log(
                `Removed ${originalLength - pagesWithBlocks.length} pages with empty blocks for retry`,
              )
            }

            // Retry missing and empty-block pages individually (smaller batch = higher success rate)
            if (pagesToRetry.length > 0) {
              const retryNames = pagesToRetry.map((p: any) => p.page).join(', ')
              console.warn(
                `Retrying ${pagesToRetry.length} pages (missing or empty blocks) in batch ${batchNum}: ${retryNames}`,
              )

              await sendEvent('progress', {
                message: `${pagesToRetry.length} pagina's opnieuw genereren (ontbrekend of leeg)...`,
              })

              // Retry each page individually
              for (const pageToRetry of pagesToRetry) {
                try {
                  console.log(`Retrying page individually: ${pageToRetry.page}`)
                  const retryResult = await retryWithBackoff(
                    () => generatePageBlocks(anthropic, systemPrompt, sitemap, [pageToRetry]),
                    {
                      maxRetries: 2,
                      initialDelayMs: 1000,
                    },
                  )

                  if (retryResult && retryResult.length > 0 && retryResult[0].blocks?.length > 0) {
                    console.log(`Successfully regenerated page: ${pageToRetry.page}`)
                    pagesWithBlocks.push(retryResult[0])
                  } else {
                    console.warn(`Retry returned empty blocks for: ${pageToRetry.page}`)
                    pagesWithBlocks.push({
                      ...pageToRetry,
                      blocks: [],
                      status: 'error',
                      error: 'Retry also returned empty blocks',
                    })
                  }
                } catch (retryError: any) {
                  console.error(`Retry failed for ${pageToRetry.page}:`, retryError.message)
                  pagesWithBlocks.push({
                    ...pageToRetry,
                    blocks: [],
                    status: 'error',
                    error: `Retry failed: ${retryError.message}`,
                  })
                }
              }
            }

            // Mark pages as complete and merge with original batch data to preserve level/parent
            const completedPages = pagesWithBlocks.map((p: any, idx: number) => {
              // Find the original page from the batch to get level/parent
              const originalPage = batch.find((bp: any) => bp.page === p.page) || batch[idx]
              // Preserve existing status/error if page was added as missing
              const existingStatus = p.status || 'complete'
              const existingError = p.error
              return {
                ...p,
                level: originalPage?.level ?? p.level, // Preserve structure level
                parent: originalPage?.parent ?? p.parent, // Preserve structure parent
                status: existingStatus,
                ...(existingError && { error: existingError }),
              }
            })
            allPages.push(...completedPages)

            // Send pages_generated event for live updates
            await sendEvent('pages_generated', {
              pages: completedPages,
              batchNum,
              totalBatches,
              percentage,
            })
          } catch (batchError: any) {
            console.error(`Batch ${batchNum} failed after all retries:`, batchError)

            // Send progress event to inform user about the failure
            await sendEvent('progress', {
              message: `Batch ${batchNum} gefaald na 3 pogingen: ${batchError.message?.substring(0, 50)}...`,
            })

            // Continue with other batches, but mark this one as failed
            const failedPages = batch.map((page: any) => ({
              ...page,
              blocks: [],
              status: 'error',
              error: `Failed after 3 retries: ${batchError.message}`,
            }))
            allPages.push(...failedPages)

            // Send pages_generated with error status
            await sendEvent('pages_generated', {
              pages: failedPages,
              batchNum,
              totalBatches,
              percentage,
            })
          }
        }

        // Combine sitemap sections with pages
        // Remove status/error properties before validation (schema has additionalProperties: false)
        const cleanedPages = allPages.map((page: any) => {
          const { status, error, ...cleanPage } = page
          return cleanPage
        })

        const wireframeJson: any = {
          sections: sitemap.sections,
          pages: cleanedPages,
        }

        await sendEvent('progress', { message: "Pagina's valideren en repareren..." })

        // First, sanitize common issues programmatically (faster and more reliable than AI)
        sanitizeWireframe(wireframeJson)
        console.log('Wireframe sanitized (component names and prop names normalized)')

        // Validate full wireframe with complete schema (has all $ref definitions)
        const ajv = new Ajv({ allErrors: true, strict: false })
        const validate = ajv.compile(componentsSchemaJson)
        const valid = validate(wireframeJson)

        if (!valid && validate.errors && validate.errors.length > 0) {
          // Log first few errors to identify common issues
          console.log(`Validation found ${validate.errors.length} errors`)
          console.log('First 3 errors:', JSON.stringify(validate.errors.slice(0, 3), null, 2))

          // Repair loop (max 2 attempts)
          const MAX_REPAIR_ATTEMPTS = 2
          for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
            // Re-validate to get current errors
            const currentValid = validate(wireframeJson)
            if (currentValid) break

            const currentErrors = validate.errors || []
            if (currentErrors.length === 0) break

            // Group errors by page index
            const errorsByPage: Map<number, any[]> = new Map()
            for (const error of currentErrors) {
              // Error path looks like "/pages/0/blocks/1/..."
              const match = error.instancePath?.match(/^\/pages\/(\d+)/)
              if (match) {
                const pageIndex = parseInt(match[1], 10)
                if (!errorsByPage.has(pageIndex)) {
                  errorsByPage.set(pageIndex, [])
                }
                errorsByPage.get(pageIndex)!.push(error)
              }
            }

            if (errorsByPage.size === 0) break

            console.log(
              `Repair attempt ${attempt}: ${currentErrors.length} errors in ${errorsByPage.size} pages`,
            )

            // Repair each page with errors
            let repairedCount = 0
            for (const [pageIndex, pageErrors] of errorsByPage) {
              const page = wireframeJson.pages[pageIndex]
              if (!page) continue

              console.log(
                `Page "${page.page}" has ${pageErrors.length} errors:`,
                pageErrors[0]?.message || pageErrors[0]?.keyword,
              )
              try {
                const repairedPage = await repairPageBlocks(anthropic, page, pageErrors, specMd)
                wireframeJson.pages[pageIndex] = repairedPage
                repairedCount++
                await sendEvent('progress', {
                  message: `Pagina gerepareerd: ${page.page} (poging ${attempt}, ${repairedCount}/${errorsByPage.size})`,
                })
              } catch (repairError) {
                console.error(`Failed to repair page ${page.page}:`, repairError)
              }
            }

            if (repairedCount > 0) {
              console.log(`Repair attempt ${attempt}: fixed ${repairedCount} pages`)
            }
          }
        } else {
          console.log('Validation passed, no repairs needed')
        }

        // Final validation check
        const finalValidation = validate(wireframeJson)
        const isFullyValidated = finalValidation === true
        const remainingErrors = validate.errors?.length || 0

        if (isFullyValidated) {
          await sendEvent('progress', { message: '✓ Wireframe 100% gevalideerd!' })
        } else {
          await sendEvent('progress', {
            message: `⚠ ${remainingErrors} validatiefouten overgebleven`,
          })
        }

        // Log completion
        const elapsed = Math.round((Date.now() - callStart) / 1000)
        console.log(
          `Complete: ${wireframeJson.sections.length} sections, ${wireframeJson.pages.length} pages in ${elapsed}s (validated: ${isFullyValidated})`,
        )

        // Send success event with validation status
        await sendEvent('complete', {
          success: true,
          validated: isFullyValidated,
          validationErrors: remainingErrors,
          sitemapProposal: '',
          wireframeJson,
          usage: {
            inputTokens: 0,
            outputTokens: 0,
          },
        })

        await writer.close()
      } catch (error: any) {
        console.error('Split call error:', error)

        const status = error?.status || error?.response?.status
        const isOverloaded = status === 529 || error?.error?.type === 'overloaded_error'

        try {
          await sendEvent('error', {
            error: isOverloaded
              ? 'Anthropic API is temporarily overloaded'
              : error?.message || 'Unknown error',
            message: isOverloaded
              ? 'De AI service is momenteel overbelast. Probeer het later opnieuw.'
              : `Er is een fout opgetreden: ${error?.message}`,
            retryable: isOverloaded,
          })
        } catch {
          // Ignore write errors
        }

        try {
          await writer.close()
        } catch {
          // Ignore close errors
        }
      }
    })()

    // Return SSE stream immediately
    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
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
