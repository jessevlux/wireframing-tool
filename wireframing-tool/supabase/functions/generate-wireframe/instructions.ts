export const INSTRUCTIONS_MD = `# Instructions

**Doel**
Genereer wireframes in JSON volgens het \`components.schema.json\`.

- Top-level structuur = object met \`sections\` en \`pages\` arrays.
- Output bevat ZOWEL rationale uitleg ALS de volledige JSON in één response.

---

## Werkwijze

### Stap 1. Begrijp de opdracht

- Analyseer doel van de site.
- Analyseer doelgroep en overtuigingsfactoren.

### Stap 2. Bepaal de Sections

**BELANGRIJK: Bepaal eerst welke CMS sections nodig zijn voordat je pagina's maakt.**

Analyseer welke content types nodig zijn:

1. **Single sections** - Unieke pagina's:
   - Home (altijd)
   - Contact (meestal)
   - Over ons (vaak)
   - Andere unieke pagina's

2. **Channel sections** - Collecties van entries:
   - Nieuws/Blog (als er nieuwsberichten zijn)
   - Projecten/Cases (als er portfolio items zijn)
   - Producten (als er producten zijn)
   - Team (als er teamleden zijn)

3. **Overview/Detail koppelingen**:
   - Als je een channel hebt, maak dan ook een overview single
   - Bijv: \`newsOverview\` (single) haalt entries op uit \`news\` (channel)
   - Gebruik \`fetchesFrom\` om de koppeling te maken

**Section naming conventies:**
- Handles in camelCase: \`newsOverview\`, \`projectDetails\`
- Slugs in lowercase met dashes: \`nieuws\`, \`over-ons\`
- Templates in \`_pages/{section}/\`: \`_pages/news/index.twig\`

### Stap 3. Sitemap

- Standaard: Home + Contact, meestal ook Over ons en/of Oplossingen / Diensten (niet altijd verplicht).
- Voeg extra pagina's toe (Projecten / Producten, Nieuws) als dit logisch is.
- Een one-pager alleen als er weinig content is (en leg kort uit waarom).
- Footer is altijd verplicht als laatste blok van elke pagina.
- **Elke pagina moet een \`section\` property hebben** die verwijst naar een section handle.
- BELANGRIJK – Detail page component: Dit is ALLEEN voor detailpagina's (Project Detail, News Detail). Als een pagina een Detail page blok bevat, dan bestaat die pagina uit exact: Detail page, CalltoAction, Footer. Geen andere blokken.
- Standaardpagina's (404, Legal Pages, etc.) hoeven NIET meegenomen te worden in de sitemap en JSON.

Geef een uitleg met:

- Welke sections je aanmaakt en waarom
- Welke pagina's je aanmaakt en waarom
- Hoe overview/detail koppelingen werken
- Hoe de homepage is opgebouwd volgens de landing page formule
- Hoe de structuur conversie en gebruikservaring ondersteunt

Gebruik optioneel marketing- en gedragspsychologie modellen om de keuzes te motiveren.

### Stap 4. JSON output (direct aansluitend)

Genereer de volledige JSON in één tool call (emit_wireframe).

- Elke pagina heeft een \`section\` property die verwijst naar een section handle
- Elke pagina heeft een \`rationale\` field met uitleg over de opbouw van die specifieke pagina
- Entry section blokken hebben \`blockType: "entrySection"\` en \`fetchesFrom\`
- Lever alles in één complete response aan

---

## Ontwerpprincipes (component-neutraal)

- Behandel componentnamen in het schema als generieke UI-archetypen.
- Kies archetypen op basis van het UX-doel en de gebruikersflow; map ze vervolgens zelfstandig naar het schema (namen zijn niet domein-gebonden).
- Hergebruik van archetypen is toegestaan als dit UX-technisch logisch is; varieer waar mogelijk met varianten.
- Schrijf duidelijke Nederlandse microcopy en vul alle vereiste props en booleans expliciet in.

## Kwaliteitscriteria

- Per pagina: aantal logische blokken is aan jou om te bepalen; geef een rationale per pagina (2–4 zinnen).
- Varieer archetypen over de site; voorkom monotone herhaling tenzij functioneel gewenst.
- Elk blok draagt aantoonbaar bij aan oriëntatie, bewijsvoering of conversie.
- Gebruik het kolommen blok om tekst weer te geven op de website.

## Output Format

Je response moet EXACT deze structuur hebben:

1. Tekstuele sitemap uitleg (markdown)
2. Tool call (emit_wireframe) met volledige JSON

De JSON structuur:

\`\`\`json
{
  "sections": [
    {
      "name": "Home",
      "handle": "homePage",
      "type": "single",
      "slug": "home",
      "template": "_pages/home/entry.twig",
      "entryTypes": ["homePage"]
    },
    {
      "name": "News overview",
      "handle": "newsOverview",
      "type": "single",
      "slug": "nieuws",
      "template": "_pages/news/index.twig",
      "fetchesFrom": "news"
    },
    {
      "name": "News",
      "handle": "news",
      "type": "channel",
      "slug": "nieuws/{slug}",
      "template": "_pages/news/entry.twig",
      "categories": ["Actueel", "Updates"]
    }
  ],
  "pages": [
    {
      "page": "Home",
      "section": "homePage",
      "rationale": "Uitleg over de homepage opbouw...",
      "blocks": [...]
    },
    {
      "page": "News overview",
      "section": "newsOverview",
      "rationale": "Uitleg over de nieuwsoverzicht pagina...",
      "blocks": [
        { "component": "Hero", ... },
        {
          "component": "Grid",
          "blockType": "entrySection",
          "fetchesFrom": "news",
          "props": { "Title": "Laatste nieuws", ... }
        },
        { "component": "Footer", ... }
      ]
    }
  ]
}
\`\`\`

## Output-eisen (verrijkt)

- Sections: definieer ALLE benodigde sections met correcte koppelingen
- Sitemap-uitleg: benoem per pagina de intentie, gekozen archetypen en conversiepaden.
- JSON: reflecteert die keuzes; props/booleans volledig en microcopy kort, duidelijk en taakgericht.
- Hergebruik van archetypen is normaal (bijv. kolommen-blokken op meerdere pagina's) mits motiveerbaar.

**BELANGRIJK**:

- Gebruik de emit_wireframe tool voor de JSON (niet een code block).
- De wireframe parameter moet een OBJECT zijn met \`sections\` en \`pages\` arrays.
- Geen vervolgvragen, geen opdeling.
`
