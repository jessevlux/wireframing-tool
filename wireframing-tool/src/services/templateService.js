/**
 * Template Service
 * Genereert standaard templates voor nieuwe projecten (fallback)
 */

// Template definitie voor verschillende pagina types
const pageTemplates = {
  Homepage: [
    {
      component: 'Hero',
      props: {
        'Has Title': true,
        'Hero Title': 'Welkom op onze website',
        'Has Description': true,
        Description: 'Ontdek onze producten en diensten',
        'Has Usps': true,
        'Usp 1': 'Hoogste kwaliteit',
        'Usp 2': 'Snelle levering',
        'Usp 3': 'Persoonlijke service',
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
            Description: 'Beschrijving van dienst 1',
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
            Description: 'Beschrijving van dienst 2',
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
            Description: 'Beschrijving van dienst 3',
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
  ],

  About: [
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
                'Has List': true,
                'Has description': true,
                'Title of text Block': 'Over ons',
                Description: 'Wij zijn een professioneel bedrijf',
                'Usp Text 1': 'Ervaren team',
                'Usp text 2': 'Klantgericht',
                'Usp Text 3': 'Innovatief',
              },
              children: [
                {
                  component: 'Button Primary',
                  props: {
                    'Property 1': 'Default',
                    'Text primary button': 'Lees ons verhaal',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  Products: [
    {
      component: 'Grid',
      props: {
        'Property 1': 'Variant2',
        Title: 'Onze producten',
      },
      children: [
        {
          component: 'Inner Grid Card',
          index: 0,
          props: {
            Title: 'Product 1',
            Description: 'Beschrijving van product 1',
            'Has button': true,
          },
          children: [
            {
              component: 'Button Primary',
              props: {
                'Property 1': 'Default',
                'Text primary button': 'Bekijk product',
              },
            },
          ],
        },
        {
          component: 'Inner Grid Card',
          index: 1,
          props: {
            Title: 'Product 2',
            Description: 'Beschrijving van product 2',
            'Has button': true,
          },
          children: [
            {
              component: 'Button Primary',
              props: {
                'Property 1': 'Default',
                'Text primary button': 'Bekijk product',
              },
            },
          ],
        },
        {
          component: 'Inner Grid Card',
          index: 2,
          props: {
            Title: 'Product 3',
            Description: 'Beschrijving van product 3',
            'Has button': true,
          },
          children: [
            {
              component: 'Button Primary',
              props: {
                'Property 1': 'Default',
                'Text primary button': 'Bekijk product',
              },
            },
          ],
        },
      ],
    },
  ],

  Contact: [
    {
      component: 'Kolommen',
      props: {
        'Property 1': 'Default',
      },
      children: [
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
                'Title of text Block': 'Neem contact op',
                Description: 'Wij helpen u graag verder',
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
        {
          component: 'Media',
          props: {
            'Property 1': 'Default',
          },
        },
      ],
    },
  ],
}

// Default template voor generieke pagina's
const defaultTemplate = [
  {
    component: 'Hero',
    props: {
      'Has Title': true,
      'Hero Title': 'Pagina titel',
      'Has Description': true,
      Description: 'Pagina beschrijving',
      'Has Usps': false,
      'Has Button Primary': false,
      'Has Button Secondary': false,
    },
    children: [],
  },
]

/**
 * Genereer blokken voor een specifiek pagina type
 * @param {string} pageType - Type pagina (Homepage, About, Products, etc.)
 * @returns {Array} Array van blokken met unieke IDs
 */
export const generateBlocks = (pageType) => {
  const template = pageTemplates[pageType] || defaultTemplate

  return template.map((block, i) => ({
    id: `block-${Date.now()}-${i}`,
    ...block,
  }))
}

/**
 * Genereer meerdere pagina's met standaard templates
 * @param {number} numPages - Aantal pagina's om te genereren
 * @returns {Array} Array van pagina objecten
 */
export const generatePages = (numPages) => {
  const pageTypes = [
    'Homepage',
    'About',
    'Products',
    'Services',
    'Contact',
    'Blog',
    'Portfolio',
    'Team',
  ]

  return Array.from({ length: Math.min(numPages, 10) }, (_, i) => ({
    id: `page-${Date.now()}-${i}`,
    name: pageTypes[i] || `Pagina ${i + 1}`,
    blocks: generateBlocks(pageTypes[i] || 'Generic'),
  }))
}

export default {
  generateBlocks,
  generatePages,
}
