export const SPEC_MD = `# Component Specificaties & Beslisregels

Dit document beschrijft alle blokken die door de AI gebruikt mogen worden, inclusief hun eigenschappen, varianten en verplichte regels.
Alle JSON-output moet voldoen aan \`components.schema.json\`.

---

## Sectie Structuur (NIEUW)

### Section Types

De wireframe bevat een \`sections\` array die de CMS structuur definieert:

- **single**: Unieke pagina (bijv. Home, Contact, Over ons). Er bestaat slechts één entry.
- **channel**: Collectie van entries (bijv. Nieuws, Projecten, Blog). Meerdere entries met dezelfde structuur.
- **structure**: Hiërarchische entries (bijv. Documentatie, Categorieën). Entries met parent-child relaties.

### Section Properties

Elke section heeft:
- \`name\`: Weergavenaam
- \`handle\`: Unieke identifier in camelCase (bijv. \`newsOverview\`, \`projectDetails\`)
- \`type\`: \`single\`, \`channel\`, of \`structure\`
- \`slug\`: URL patroon. Gebruik \`{slug}\` voor dynamische delen (bijv. \`news/{slug}\`)
- \`template\`: Pad naar twig template (bijv. \`_pages/news/entry.twig\`)
- \`entryTypes\`: Array van entry type handles
- \`fetchesFrom\`: (optioneel) Handle van channel section waaruit entries worden opgehaald
- \`categories\`: (optioneel) Categorieën voor deze section

### Overview/Detail Koppeling

Wanneer een overview pagina entries moet tonen van een channel:

1. Maak een **single** section voor de overview (bijv. \`newsOverview\`)
2. Maak een **channel** section voor de entries (bijv. \`news\`)
3. Koppel met \`fetchesFrom\` in de overview section
4. Gebruik \`blockType: "entrySection"\` en \`fetchesFrom\` in Grid/Grid2Col/Grid3Col blokken

**Voorbeeld:**
\`\`\`json
{
  "sections": [
    {
      "name": "Nieuws overzicht",
      "handle": "newsOverview",
      "type": "single",
      "slug": "nieuws",
      "template": "_pages/news/index.twig",
      "fetchesFrom": "news"
    },
    {
      "name": "Nieuws",
      "handle": "news",
      "type": "channel",
      "slug": "nieuws/{slug}",
      "template": "_pages/news/entry.twig",
      "categories": ["Actueel", "Bedrijfsnieuws"]
    }
  ]
}
\`\`\`

### Structure Sections (Multi-Level)

Gebruik \`structure\` voor hiërarchische content met parent-child relaties.

**BELANGRIJK: Structures hebben GEEN aparte overview single nodig!**
- Level 1 entry = de overzichtspagina
- Level 2+ entries = detail of sub-categorie pagina's

**Wanneer multi-level structure gebruiken:**
- Diensten/Oplossingen met sub-diensten (bijv. "Maatwerk Software" → "CRM", "ERP")
- Producten met categorieën en sub-producten
- Locaties met regio's en vestigingen
- FAQ met categorieën en vragen

**Section properties voor structures:**
- \`maxLevels\`: Maximum diepte (2, 3, of 4)
- \`levels\`: Array met level configuratie (optioneel, voor documentatie)

**Page properties voor structure entries:**
- \`level\`: Niveau in hiërarchie (1 = root/overzicht)
- \`parent\`: Titel van parent entry (null voor level 1)

> **KRITIEK - VERPLICHT VOOR STRUCTURE PAGES:**
>
> ELKE page waarvan de \`section\` property verwijst naar een structure MOET \`level\` en \`parent\` hebben!
> - Level 1: \`"level": 1, "parent": null\`
> - Level 2: \`"level": 2, "parent": "Titel van level 1 pagina"\`
> - Level 3: \`"level": 3, "parent": "Titel van level 2 pagina"\`
>
> **FOUT** (zal niet importeren):
> \`{ "page": "Cloud Services", "section": "diensten" }\`
>
> **CORRECT**:
> \`{ "page": "Cloud Services", "section": "diensten", "level": 2, "parent": "Diensten" }\`

**Voorbeeld multi-level structure:**
\`\`\`json
{
  "sections": [
    {
      "name": "Oplossingen",
      "handle": "oplossingen",
      "type": "structure",
      "maxLevels": 3,
      "template": "_pages/oplossingen/entry.twig",
      "entryTypes": ["oplossingen"],
      "levels": [
        { "level": 1, "name": "Overzicht" },
        { "level": 2, "name": "Categorie of Detail" },
        { "level": 3, "name": "Detail" }
      ]
    }
  ],
  "pages": [
    {
      "page": "Oplossingen",
      "section": "oplossingen",
      "level": 1,
      "parent": null,
      "rationale": "Level 1 overzichtspagina met Grid die children toont",
      "blocks": [
        { "component": "Hero", "props": { "Has Title": true, "Hero Title": "Onze Oplossingen", ... } },
        { "component": "Grid", "blockType": "entrySection", "fetchesFrom": "oplossingen", "props": { "Title": "Alle oplossingen" } },
        { "component": "Footer", ... }
      ]
    },
    {
      "page": "Webshops",
      "section": "oplossingen",
      "level": 2,
      "parent": "Oplossingen",
      "rationale": "Level 2 detailpagina zonder children",
      "blocks": [
        { "component": "Detail page", "props": { "Has Project Header": true, ... } },
        { "component": "CalltoAction", ... },
        { "component": "Footer", ... }
      ]
    },
    {
      "page": "Maatwerk Software",
      "section": "oplossingen",
      "level": 2,
      "parent": "Oplossingen",
      "rationale": "Level 2 sub-overzicht met eigen children",
      "blocks": [
        { "component": "Hero", "props": { "Has Title": true, "Hero Title": "Maatwerk Software", ... } },
        { "component": "Grid", "blockType": "entrySection", "fetchesFrom": "oplossingen", "props": { "Title": "Maatwerk opties" } },
        { "component": "Footer", ... }
      ]
    },
    {
      "page": "CRM Systemen",
      "section": "oplossingen",
      "level": 3,
      "parent": "Maatwerk Software",
      "rationale": "Level 3 detailpagina onder Maatwerk Software",
      "blocks": [
        { "component": "Detail page", "props": { "Has Project Header": true, ... } },
        { "component": "CalltoAction", ... },
        { "component": "Footer", ... }
      ]
    }
  ]
}
\`\`\`

**Beslislogica voor page blocks in structures:**
- Entry ZONDER children (leaf node) → Gebruik \`Detail page\` component
- Entry MET children (sub-overzicht) → Gebruik \`Hero\` + \`Grid\` met \`fetchesFrom\`

---

## Algemene regels

- **Props en booleans altijd expliciet opnemen** (\`true\` of \`false\`).
- **Index altijd verplicht** bij Grid-cards, Entry Posts, Grid2Col Cards en Grid3Col Cards.
- **Children alleen toevoegen** als booleans dit vereisen.
- **Footer verplicht** als laatste blok van elke pagina.
- **Geen lorem ipsum** → gebruik korte, realistische Nederlandse microcopy.
- **Variatie toepassen**: kies bewust tussen Default en varianten.
- **Elke pagina moet een \`section\` property hebben** die verwijst naar een section handle.

**KRITIEK - Variant bepaalt children:**
Kies EERST een variant, genereer dan EXACT het aantal children dat bij die variant hoort.
Dit geldt voor ALLE componenten met varianten (Grid, Media, etc.).

## Bijzonderheden

- **Grid2Col** en **Grid3Col**: alleen op overzichtspagina's en altijd gevolgd door CalltoAction + Footer.
- **Entry Section blokken**: Gebruik \`blockType: "entrySection"\` en \`fetchesFrom\` om aan te geven welke section.
- **Detail page (exclusieve pagina-opbouw)**:
  - Een pagina die het blok \`Detail page\` bevat, bestaat **exact** uit: \`Detail page\`, \`CalltoAction\` en \`Footer\`.
  - **GEEN andere blokken** toegestaan op die pagina.
  - Exact één header type moet \`true\` zijn (ofwel \`Has Project Header\`, ofwel \`Has News Header\`).
- **Form** vs **Contactform**: gebruik \`Form\` voor algemene formulieren, \`Contactform\` specifiek voor contactpagina's.

---

## Hero

- heeft een mediaonderdeel op achtergrond (niet als property)
- **Props**:
  - \`Has Title\` (bool)
  - \`Hero Title\` (string)
  - \`Has Description\` (bool)
  - \`Description\` (string)
  - \`Has Usps\` (bool)
  - \`Usp 1–3\` (strings)
  - \`Has Button Primary\` (bool)
  - \`Has Button Secondary\` (bool)
- **Children**: Button Primary / Button Secondary afhankelijk van booleans.

---

## MediaGroot

- **Props**:
  - None

---

## Kolommen

- Gebruik dit blok om iets aan te tonen met tekst naast een afbeelding.
- **Props**:
  - \`Property 1\`: "Default" (Media links/Content rechts) of "Variant2" (Content links/Media rechts).

**Children (EXACTE structuur, GEEN variatie):**

Kolommen heeft ALTIJD exact 2 children in deze volgorde:
1. \`Media\` - voor afbeelding(en)
2. \`Content Kolommen Block\` - voor tekst/accordion

**NIET toegestaan:**
- 2x Media
- 2x Content Kolommen Block
- Andere children dan Media en Content Kolommen Block
- Meer of minder dan 2 children

---

### Media

- **Props**:
  - \`Property 1\`:
    - "Default" (1 image)
    - "Variant2" (2 horizontale images)
    - "Variant3" (1 horizontaal + 2 squares)

---

### Content Kolommen Block

- **Props**:
  - \`Has Accordion\` (bool)
  - \`Has Text\` (bool)
- **Children**:
  - Accordion list OF Text Element.

---

#### Accordion list

- **Props**:
  - \`Has Title\` (bool)
  - \`Title\` (string)
  - \`Text\` (string)
  - \`Text 2–4\` (strings)
  - \`Text open item\` (string)

---

#### Text Element

- **Props**:
  - \`Has Primary Button\` (bool)
  - \`Has Second Button\` (bool)
  - \`Has List\` (bool)
  - \`Has description\` (bool)
  - \`Title of text Block\` (string)
  - \`Description\` (string)
  - \`Usp Text 1–3\` (strings)
- **Children**: Button Primary / Secondary afhankelijk van booleans.

---

## MediaSlider

- **Props**:
  - \`Title\` (string)

---

## Grid

- **Props**:
  - \`Property 1\`:
    - "Default" (3 kaarten)
    - "Variant2" (4 kaarten)
    - "Variant3" (2 kaarten)
  - \`Title\` (string)
- **Optioneel**:
  - \`blockType\`: "staticContent" (default) of "entrySection"
  - \`fetchesFrom\`: Section handle (alleen bij \`blockType: "entrySection"\`)
- **Children**:
  - Inner Grid Card(s) (afhankelijk van variant) - ALLEEN bij staticContent.
  - Bij entrySection: GEEN children (data komt uit CMS).

**NIET toegestaan:**
- Children toevoegen bij \`blockType: "entrySection"\`
- \`fetchesFrom\` gebruiken zonder \`blockType: "entrySection"\`

### Inner Grid Card

- **Props**:
  - \`Title\` (string)
  - \`Description\` (string)
  - \`Has button\` (bool)
- **Index**: verplicht, startend bij 0.
- **Children**: als \`Has button = true\` → exact 1 Button Primary.

---

## EntryPostSlider

- **Props**:
  - \`Title\` (string)
- **Optioneel**:
  - \`fetchesFrom\`: Section handle waaruit entries worden opgehaald
- **Children**:
  - Altijd exact 3 Entry Post Inner (index 0–2).

### Entry Post Inner

- **Props**:
  - \`Has title\` (bool)
  - \`Has description\` (bool)
  - \`Has Category\` (bool)
  - \`Has Popular\` (bool)
  - \`Category Name\` (string)
  - \`Popular\` (string)
  - \`Title of this block\` (string)
  - \`Description\` (string)
- **Children**: exact 1 Button Primary.

---

## LogoSlider

- **Props**:
  - \`Title\` (string)

---

## CalltoAction

- **Props**:
  - \`Has Title\` (bool)
  - \`Title\` (string)
  - \`Has Description\` (bool)
  - \`Description\` (string)
  - \`Has Usps\` (bool)
  - \`Usp 1–3\` (strings)
  - \`Has Button Primary\` (bool)
  - \`Has Button Secondary\` (bool)
- **Children**: afhankelijk van booleans.

---

## Footer

- **Props**:
  - \`Has Column 1–4\` (bool)
  - \`Header 1–4\` (strings)
  - \`Link1A–G … Link4A–G\` (strings)
  - \`Has Nieuwsbrief\` (bool)

---

## Grid2Col

- Dit blok heeft 2 kolommen van 4 kaarten (8 items totaal). Daarboven staat een header met een uitgelicht item. Gebruik dit voor entry overzichten zoals projecten, producten, cases, locaties, etc.
- **Props**:
  - \`Title\` (string)
  - \`Description\` (string)
  - \`Has description\` (bool)
  - \`Example category\` (string)
  - \`Example header\` (string)
  - \`Example description\` (string)
  - \`Has example item\` (bool)
- **Optioneel**:
  - \`fetchesFrom\`: Section handle waaruit entries worden opgehaald

- **Children**:
  - Altijd exact 8 Grid2Col Cards (index 0–7).
- **Volgorde regel**: altijd gevolgd door CalltoAction + Footer.

### Grid2Col Card

- **Props**:
  - \`Category\` (string)
  - \`Header\` (string)
  - \`Description\` (string)

---

## Grid3Col

- Dit blok is een grid van 3x3 (9 items totaal). Gebruik dit voor entry overzichten zoals nieuws, evenementen, blog posts, vacatures, etc.
- **Props**:
  - \`Title\` (string)
  - \`Description\` (string)
- **Optioneel**:
  - \`fetchesFrom\`: Section handle waaruit entries worden opgehaald
- **Children**:
  - Altijd exact 9 Grid3Col Cards (index 0–8).
- **Volgorde regel**: altijd gevolgd door CalltoAction + Footer.

### Grid3Col Card

- **Props**:
  - \`Category\` (string)
  - \`Date\` (string)
  - \`Description\` (string)

---

## Form

- **Props**:
  - \`Has Field 1\` (bool)
  - \`Field 1\` (string)
  - \`Has Field 2\` (bool)
  - \`Field 2.1\` (string) – eerste veld in horizontale rij
  - \`Field 2.2\` (string) – tweede veld in horizontale rij
  - \`Has Field 3\` (bool)
  - \`Field 3\` (string) – grotere input
  - \`Has Radio Buttons\` (bool)
  - \`Radio Button 1\` (string)
  - \`Radio Button 2\` (string)
  - \`Radio Button 3\` (string)
  - \`Has Checkboxes\` (bool)
  - \`Checkbox 1\` (string)
  - \`Checkbox 2\` (string)
  - \`Checkbox 3\` (string)
  - \`Has Dropdown\` (bool)
  - \`Dropdown title\` (string)
  - \`Has Name\` (bool)
  - \`Has Email\` (bool)
  - \`Has Phone number\` (bool)
  - \`Has Date Timed\` (bool)

---

## Contactform

- Specifiek formulier voor contactpagina's.
- **Props**:
  - Geen properties.

---

## Detail page

- **Hele pagina** component voor channel entry detailpagina's (nieuws, projecten, locaties, etc.).

**WANNEER Detail page gebruiken (VERPLICHT):**
- De pagina hoort bij een section met type "channel"
- De pagina toont één individuele entry (niet een overzicht)
- Voorbeelden: "Nieuws detail", "Project detail", "Locatie detail", "Vacature detail"

**Pagina structuur (EXACT, geen variatie):**
Een pagina met Detail page bestaat uit PRECIES 3 blokken:
1. \`Detail page\`
2. \`CalltoAction\`
3. \`Footer\`

**NIET toegestaan:**
- Andere blokken toevoegen (geen Hero, Grid, Kolommen, etc.)
- Minder dan 3 blokken
- Andere volgorde

- **Belangrijke regels**:
  - **Slechts één header** mag \`true\` zijn: ofwel \`Has Project Header\` ofwel \`Has News Header\`.
  - **Altijd één header** verplicht \`true\`.
  - **Has More Projects** of **Has More News**: niet allebei \`true\`.
  - De "Has More ..." moet matchen met de gekozen header.

- **Props**:
  - \`Has Project Header\` (bool)
  - \`Has News Header\` (bool)
  - \`Paragraph 1\` (string)
  - \`Paragraph 2\` (string)
  - \`Has Highlight Paragraph\` (bool)
  - \`Highlight Title\` (string)
  - \`Highlight Paragraph\` (string)
  - \`Paragraph 3 Title\` (string)
  - \`Paragraph 3\` (string)
  - \`Paragraph 4\` (string)
  - \`Has More Projects\` (bool)
  - \`Has More News\` (bool)

---

## Buttons

### Button Primary

- **Props**:
  - \`Property 1\`: "Default"
  - \`Text primary button\` (string)

### Button Secondary

- **Props**:
  - \`Property 1\`: "Default"
  - \`Text Secondary Button\` (string)
`
