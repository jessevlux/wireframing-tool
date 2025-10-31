// Context files for Anthropic API - embedded as strings

export const COMPONENTS_SCHEMA = JSON.stringify(
  {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Website Wireframe Schema',
    type: 'array',
    items: {
      type: 'object',
      required: ['page', 'rationale', 'blocks'],
      properties: {
        page: { type: 'string' },
        rationale: {
          type: 'string',
          description: 'Uitleg over waarom deze pagina zo is opgebouwd (2-4 zinnen)',
        },
        blocks: {
          type: 'array',
          items: { $ref: '#/definitions/TopLevelComponent' },
        },
      },
      additionalProperties: false,
    },
    definitions: {
      TopLevelComponent: {
        oneOf: [
          { $ref: '#/definitions/Hero' },
          { $ref: '#/definitions/MediaGroot' },
          { $ref: '#/definitions/Kolommen' },
          { $ref: '#/definitions/MediaSlider' },
          { $ref: '#/definitions/Grid' },
          { $ref: '#/definitions/EntryPostSlider' },
          { $ref: '#/definitions/LogoSlider' },
          { $ref: '#/definitions/CalltoAction' },
          { $ref: '#/definitions/Footer' },
          { $ref: '#/definitions/Projects' },
          { $ref: '#/definitions/News' },
          { $ref: '#/definitions/Form' },
          { $ref: '#/definitions/Contactform' },
          { $ref: '#/definitions/detailpage' },
        ],
      },
      Hero: {
        properties: {
          component: { const: 'Hero' },
          props: {
            type: 'object',
            properties: {
              'Has Title': { type: 'boolean' },
              'Hero Title': { type: 'string' },
              'Has Description': { type: 'boolean' },
              Description: { type: 'string' },
              'Has Usps': { type: 'boolean' },
              'Usp 1': { type: 'string' },
              'Usp 2': { type: 'string' },
              'Usp 3': { type: 'string' },
              'Has Button Primary': { type: 'boolean' },
              'Has Button Secondary': { type: 'boolean' },
            },
            required: [
              'Has Title',
              'Has Description',
              'Has Usps',
              'Has Button Primary',
              'Has Button Secondary',
            ],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/ButtonPrimary' },
                { $ref: '#/definitions/ButtonSecondary' },
              ],
            },
          },
        },
        additionalProperties: false,
      },
      MediaGroot: {
        properties: {
          component: { const: 'MediaGroot' },
          props: {
            type: 'object',
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      Kolommen: {
        properties: {
          component: { const: 'Kolommen' },
          props: {
            type: 'object',
            properties: {
              'Property 1': {
                type: 'string',
                enum: ['Default', 'Variant2'],
              },
            },
            required: ['Property 1'],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/Media' },
                { $ref: '#/definitions/ContentKolommenBlock' },
              ],
            },
          },
        },
        additionalProperties: false,
      },
      Media: {
        properties: {
          component: { const: 'Media' },
          props: {
            type: 'object',
            properties: {
              'Property 1': {
                type: 'string',
                enum: ['Default', 'Variant2', 'Variant3'],
              },
            },
            required: ['Property 1'],
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      ContentKolommenBlock: {
        properties: {
          component: { const: 'Content Kolommen Block' },
          props: {
            type: 'object',
            properties: {
              'Has Accordion': { type: 'boolean' },
              'Has Text': { type: 'boolean' },
            },
            required: ['Has Accordion', 'Has Text'],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/AccordionList' },
                { $ref: '#/definitions/TextElement' },
              ],
            },
          },
        },
        additionalProperties: false,
      },
      AccordionList: {
        properties: {
          component: { const: 'Accordion list' },
          props: {
            type: 'object',
            properties: {
              'Has Title': { type: 'boolean' },
              Title: { type: 'string' },
              Text: { type: 'string' },
              'Text 2': { type: 'string' },
              'Text 3': { type: 'string' },
              'Text 4': { type: 'string' },
              'Text open item': { type: 'string' },
            },
            required: ['Has Title'],
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      TextElement: {
        properties: {
          component: { const: 'Text Element' },
          props: {
            type: 'object',
            properties: {
              'Has Primary Button': { type: 'boolean' },
              'Has Second Button': { type: 'boolean' },
              'Has List': { type: 'boolean' },
              'Has description': { type: 'boolean' },
              'Title of text Block': { type: 'string' },
              Description: { type: 'string' },
              'Usp Text 1': { type: 'string' },
              'Usp text 2': { type: 'string' },
              'Usp Text 3': { type: 'string' },
            },
            required: ['Has Primary Button', 'Has Second Button', 'Has List', 'Has description'],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/ButtonPrimary' },
                { $ref: '#/definitions/ButtonSecondary' },
              ],
            },
          },
        },
        additionalProperties: false,
      },
      MediaSlider: {
        properties: {
          component: { const: 'MediaSlider' },
          props: {
            type: 'object',
            properties: { Title: { type: 'string' } },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      Grid: {
        properties: {
          component: { const: 'Grid' },
          props: {
            type: 'object',
            properties: {
              'Property 1': {
                type: 'string',
                enum: ['Default', 'Variant2', 'Variant3'],
              },
              Title: { type: 'string' },
            },
            required: ['Property 1'],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: { $ref: '#/definitions/InnerGridCard' },
          },
        },
        additionalProperties: false,
      },
      InnerGridCard: {
        properties: {
          component: { const: 'Inner Grid Card' },
          index: { type: 'integer', minimum: 0 },
          props: {
            type: 'object',
            properties: {
              Title: { type: 'string' },
              Description: { type: 'string' },
              'Has button': { type: 'boolean' },
            },
            required: ['Has button'],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: { $ref: '#/definitions/ButtonPrimary' },
            minItems: 0,
            maxItems: 1,
          },
        },
        required: ['component', 'props', 'index'],
        additionalProperties: false,
      },
      EntryPostSlider: {
        properties: {
          component: { const: 'EntryPostSlider' },
          props: {
            type: 'object',
            properties: { Title: { type: 'string' } },
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: { $ref: '#/definitions/EntryPostInner' },
            minItems: 3,
            maxItems: 3,
          },
        },
        additionalProperties: false,
      },
      EntryPostInner: {
        properties: {
          component: { const: 'Entry Post Inner' },
          index: { type: 'integer', minimum: 0 },
          props: {
            type: 'object',
            properties: {
              'Has title': { type: 'boolean' },
              'Has description': { type: 'boolean' },
              'Has Category': { type: 'boolean' },
              'Has Popular': { type: 'boolean' },
              'Category Name': { type: 'string' },
              Popular: { type: 'string' },
              'Title of this block': { type: 'string' },
              Description: { type: 'string' },
            },
            required: ['Has title', 'Has description', 'Has Category', 'Has Popular'],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: { $ref: '#/definitions/ButtonPrimary' },
            minItems: 1,
            maxItems: 1,
          },
        },
        required: ['component', 'props', 'index'],
        additionalProperties: false,
      },
      LogoSlider: {
        properties: {
          component: { const: 'LogoSlider' },
          props: {
            type: 'object',
            properties: { Title: { type: 'string' } },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      CalltoAction: {
        properties: {
          component: { const: 'CalltoAction' },
          props: {
            type: 'object',
            properties: {
              'Has Title': { type: 'boolean' },
              Title: { type: 'string' },
              'Has Description': { type: 'boolean' },
              Description: { type: 'string' },
              'Has Usps': { type: 'boolean' },
              'Usp 1': { type: 'string' },
              'Usp 2': { type: 'string' },
              'Usp 3': { type: 'string' },
              'Has Button Primary': { type: 'boolean' },
              'Has Button Secondary': { type: 'boolean' },
            },
            required: [
              'Has Title',
              'Has Description',
              'Has Usps',
              'Has Button Primary',
              'Has Button Secondary',
            ],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: {
              anyOf: [
                { $ref: '#/definitions/ButtonPrimary' },
                { $ref: '#/definitions/ButtonSecondary' },
              ],
            },
          },
        },
        additionalProperties: false,
      },
      Footer: {
        properties: {
          component: { const: 'Footer' },
          props: {
            type: 'object',
            properties: {
              'Has Column 1': { type: 'boolean' },
              'Header 1': { type: 'string' },
              Link1A: { type: 'string' },
              Link1B: { type: 'string' },
              Link1C: { type: 'string' },
              Link1D: { type: 'string' },
              Link1E: { type: 'string' },
              Link1F: { type: 'string' },
              Link1G: { type: 'string' },
              'Has Column 2': { type: 'boolean' },
              'Header 2': { type: 'string' },
              Link2A: { type: 'string' },
              Link2B: { type: 'string' },
              Link2C: { type: 'string' },
              Link2D: { type: 'string' },
              Link2E: { type: 'string' },
              Link2F: { type: 'string' },
              Link2G: { type: 'string' },
              'Has Column 3': { type: 'boolean' },
              'Header 3': { type: 'string' },
              Link3A: { type: 'string' },
              Link3B: { type: 'string' },
              Link3C: { type: 'string' },
              Link3D: { type: 'string' },
              Link3E: { type: 'string' },
              Link3F: { type: 'string' },
              Link3G: { type: 'string' },
              'Has Column 4': { type: 'boolean' },
              'Header 4': { type: 'string' },
              Link4A: { type: 'string' },
              Link4B: { type: 'string' },
              Link4C: { type: 'string' },
              Link4D: { type: 'string' },
              Link4E: { type: 'string' },
              Link4F: { type: 'string' },
              Link4G: { type: 'string' },
              'Has Nieuwsbrief': { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      Projects: {
        properties: {
          component: { const: 'Projects' },
          props: {
            type: 'object',
            properties: {
              Title: { type: 'string' },
              'Example category': { type: 'string' },
              'Example header': { type: 'string' },
              'Example description': { type: 'string' },
              'Has example project': { type: 'boolean' },
              'Has description': { type: 'boolean' },
              Description: { type: 'string' },
            },
            required: ['Title'],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: { $ref: '#/definitions/ProjectCard' },
            minItems: 8,
            maxItems: 8,
          },
        },
        additionalProperties: false,
      },
      ProjectCard: {
        properties: {
          component: { const: 'Project Card' },
          props: {
            type: 'object',
            properties: {
              Category: { type: 'string' },
              'Project header': { type: 'string' },
              Description: { type: 'string' },
            },
            required: ['Category', 'Project header', 'Description'],
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      News: {
        properties: {
          component: { const: 'News' },
          props: {
            type: 'object',
            properties: {
              Title: { type: 'string' },
              Description: { type: 'string' },
            },
            required: ['Title', 'Description'],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: { $ref: '#/definitions/NewsCard' },
            minItems: 9,
            maxItems: 9,
          },
        },
        additionalProperties: false,
      },
      NewsCard: {
        properties: {
          component: { const: 'News Card' },
          props: {
            type: 'object',
            properties: {
              Category: { type: 'string' },
              Date: { type: 'string' },
              Description: { type: 'string' },
            },
            required: ['Category', 'Date', 'Description'],
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      ButtonPrimary: {
        properties: {
          component: { const: 'Button Primary' },
          props: {
            type: 'object',
            properties: {
              'Property 1': { type: 'string', enum: ['Default'] },
              'Text primary button': { type: 'string' },
            },
            required: ['Property 1', 'Text primary button'],
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      ButtonSecondary: {
        properties: {
          component: { const: 'Button Secondary' },
          props: {
            type: 'object',
            properties: {
              'Property 1': { type: 'string', enum: ['Default'] },
              'Text Secondary Button': { type: 'string' },
            },
            required: ['Property 1', 'Text Secondary Button'],
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      Form: {
        properties: {
          component: { const: 'Form' },
          props: {
            type: 'object',
            properties: {
              'Has Field 1': { type: 'boolean' },
              'Field 1': { type: 'string' },
              'Has Field 2': { type: 'boolean' },
              'Field 2.1': { type: 'string' },
              'Field 2.2': { type: 'string' },
              'Has Field 3': { type: 'boolean' },
              'Field 3': { type: 'string' },
              'Has Radio Buttons': { type: 'boolean' },
              'Radio Button 1': { type: 'string' },
              'Radio Button 2': { type: 'string' },
              'Radio Button 3': { type: 'string' },
              'Has Checkboxes': { type: 'boolean' },
              'Checkbox 1': { type: 'string' },
              'Checkbox 2': { type: 'string' },
              'Checkbox 3': { type: 'string' },
              'Has Dropdown': { type: 'boolean' },
              'Dropdown title': { type: 'string' },
              'Has Name': { type: 'boolean' },
              'Has Email': { type: 'boolean' },
              'Has Phone number': { type: 'boolean' },
              'Has Date Timed': { type: 'boolean' },
            },
            required: [
              'Has Field 1',
              'Has Field 2',
              'Has Field 3',
              'Has Radio Buttons',
              'Has Checkboxes',
              'Has Dropdown',
              'Has Name',
              'Has Email',
              'Has Phone number',
              'Has Date Timed',
            ],
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      Contactform: {
        properties: {
          component: { const: 'Contactform' },
          props: {
            type: 'object',
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      detailpage: {
        properties: {
          component: { const: 'detailpage' },
          props: {
            type: 'object',
            properties: {
              'Has Project Header': { type: 'boolean' },
              'Has News Header': { type: 'boolean' },
              'Paragraph 1': { type: 'string' },
              'Paragraph 2': { type: 'string' },
              'Has Highlight Paragraph': { type: 'boolean' },
              'Highlight Title': { type: 'string' },
              'Highlight Paragraph': { type: 'string' },
              'Paragraph 3 Title': { type: 'string' },
              'Paragraph 3': { type: 'string' },
              'Paragraph 4': { type: 'string' },
              'Has More Projects': { type: 'boolean' },
              'Has More News': { type: 'boolean' },
            },
            required: [
              'Has Project Header',
              'Has News Header',
              'Has Highlight Paragraph',
              'Has More Projects',
              'Has More News',
            ],
            additionalProperties: false,
          },
          children: {
            type: 'array',
            items: { $ref: '#/definitions/CalltoAction' },
            minItems: 1,
            maxItems: 1,
          },
        },
        required: ['component', 'props', 'children'],
        additionalProperties: false,
      },
    },
  },
  null,
  2,
)

export const INSTRUCTIONS = `# instructions

**Doel**
Genereer wireframes in JSON volgens het \`components.schema.json\`.

- Top-level structuur = array van pagina-objecten met \`page\`, \`rationale\` en \`blocks\`.
- Output bevat ZOWEL tekstuele uitleg ALS de volledige JSON in één response.

---

## Werkwijze

### Stap 1. Begrijp de opdracht

- Analyseer doel van de site.
- Analyseer doelgroep en overtuigingsfactoren.

### Stap 2. Sitemap

- Standaard: Home + Contact, meestal ook Over ons en/of Oplossingen / Diensten (niet altijd verplicht).
- Voeg extra pagina's toe (Projecten / Producten, Nieuws) als dit logisch is.
- Een **one-pager** alleen als er weinig content is (en leg kort uit waarom).
- **Footer** is altijd verplicht als laatste blok.
- **detailpage**: een speciaal component dat een hele pagina vertegenwoordigt (voor nieuws- of projectdetails). Heeft altijd precies één CalltoAction als child (verplicht). Mag alleen Footer als aanvullend blok bevatten. Slechts één header type mag true zijn (Has Project Header OF Has News Header), en één is altijd verplicht. De "Has More" opties (Projects/News) moeten matchen met de gekozen header en kunnen niet beide true zijn.
- Standaardpagina's (404, Legal Pages, etc.) hoeven **NIET** meegenomen te worden in de sitemap en JSON.

Geef een **tekstueel overzicht** met:
- Welke pagina's je aanmaakt en waarom
- Hoe de homepage is opgebouwd volgens de landing page formule
- Hoe de structuur conversie en gebruikservaring ondersteunt

Gebruik optioneel marketing- en gedragspsychologie modellen om de keuzes te motiveren.

### Stap 3. JSON output (direct aansluitend)

Direct na de tekstuele uitleg, genereer de **volledige JSON** in één code block.

- Alle pagina's die in de tekstuele uitleg zijn beschreven moeten in dezelfde JSON staan
- Elke pagina heeft een \`rationale\` field met uitleg over de opbouw van die specifieke pagina
- Lever alles in **één complete response** aan

---

## Output Format

Je response moet EXACT deze structuur hebben:

1. **Tekstuele sitemap uitleg** (markdown format)
   - Motivatie voor de structuur
   - UX en conversie overwegingen

2. **Tool call** (direct aansluitend)
   Gebruik de \`emit_wireframe\` tool om de volledige JSON te leveren:
   - Tool name: emit_wireframe
   - Parameter: wireframe (array van pagina objecten)

   Elke pagina heeft:
   - \`page\`: naam van de pagina
   - \`rationale\`: uitleg waarom deze pagina zo is opgebouwd (2-4 zinnen met concrete redenen)
   - \`blocks\`: array van component blocks

**BELANGRIJK**:
- Geef BEIDE outputs in één response. Eerst de tekstuele uitleg, dan DIRECT de tool call.
- Gebruik de emit_wireframe tool voor de JSON (niet een code block).
- Geen vervolgvragen, geen opdeling.`

export const SPEC = `# Component Specificaties

Alle JSON-output moet voldoen aan \`components.schema.json\`.

## Algemene regels

- Props en booleans altijd expliciet opnemen (true of false).
- Index altijd verplicht bij Grid-cards, Entry Posts, Project Cards en News Cards.
- Children alleen toevoegen als booleans dit vereisen.
- Footer verplicht als laatste blok van elke pagina.
- detailpage: hele-pagina component met verplichte CalltoAction child, alleen Footer toegestaan als aanvullend blok. Exact één header type moet true zijn.
- Form vs Contactform: gebruik Form voor algemene formulieren, Contactform specifiek voor contactpagina's.
- Geen lorem ipsum → gebruik korte, realistische Nederlandse microcopy.
- Variatie toepassen: kies bewust tussen Default en varianten.`
