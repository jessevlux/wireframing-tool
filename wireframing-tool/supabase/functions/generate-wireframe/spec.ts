export const SPEC_MD = `# Component Specificaties

Dit document beschrijft alle componenten die gegenereerd mogen worden, inclusief hun props, children en constraints.
Alle output moet voldoen aan \`components.schema.json\`.

---

## Algemene Regels

- **Props en booleans altijd expliciet** (\`true\` of \`false\`)
- **Index verplicht** bij alle card-componenten (startend bij 0)
- **Children alleen** als booleans dit vereisen
- **Footer verplicht** als laatste blok van elke pagina
- **Geen lorem ipsum** → korte, realistische Nederlandse microcopy
- **Variant bepaalt children**: kies EERST variant, genereer dan EXACT dat aantal children

---

## Hero

Hoofdsectie bovenaan de pagina met achtergrondmedia.

**Props:**
- \`Has Title\` (bool) → \`Hero Title\` (string)
- \`Has Description\` (bool) → \`Description\` (string)
- \`Has Usps\` (bool) → \`Usp 1\`, \`Usp 2\`, \`Usp 3\` (strings)
- \`Has Button Primary\` (bool)
- \`Has Button Secondary\` (bool)

**Children:** Button Primary en/of Button Secondary (afhankelijk van booleans)

---

## MediaGroot

Groot media-element.

**Props:** Geen

---

## Kolommen

Twee-koloms layout met media en tekst. Ideaal voor het uitlichten van content met visuele ondersteuning.

**Wanneer gebruiken:**
- Uitleg van een dienst, product of concept met afbeelding
- Storytelling sectie (bijv. "Over ons", "Onze werkwijze")
- Bij kleine collecties (2-3 items) als alternatief voor een Grid, met aparte Kolommen blokken per item en navigatiebuttons

**Props (verplicht):**
- \`Property 1\`: "Default" (Media links, tekst rechts) of "Variant2" (Tekst links, media rechts)

**Children (EXACT 2, altijd in deze volgorde):**
1. \`Media\`
2. \`Content Kolommen Block\`

---

### Media

Afbeelding(en) binnen Kolommen.

**Props:**
- \`Property 1\`: "Default" (1 afbeelding), "Variant2" (2), "Variant3" (3)

---

### Content Kolommen Block

Tekstinhoud binnen Kolommen.

**Props:**
- \`Has Accordion\` (bool)
- \`Has Text\` (bool)

**Children:** \`Accordion list\` OF \`Text Element\` (niet beide)

---

#### Accordion list

**Props:**
- \`Has Title\` (bool) → \`Title\` (string)
- \`Text\`, \`Text 2\`, \`Text 3\`, \`Text 4\` (strings)
- \`Text open item\` (string)

---

#### Text Element

**Props:**
- \`Has Primary Button\` (bool)
- \`Has Second Button\` (bool)
- \`Has List\` (bool) → \`Usp Text 1\`, \`Usp Text 2\`, \`Usp Text 3\` (strings)
- \`Has description\` (bool) → \`Description\` (string)
- \`Title of text Block\` (string)

**Children:** Button Primary en/of Button Secondary (afhankelijk van booleans)

---

## MediaSlider

Afbeeldingencarousel.

**Props:**
- \`Title\` (string)

---

## Grid

Kaartengrid met variabele layouts.

**Props:**
- \`Property 1\`: "Default" (3 kaarten), "Variant2" (4), "Variant3" (2)
- \`Title\` (string)

**Optioneel (voor dynamische content):**
- \`blockType\`: "staticContent" (default) of "entrySection"
- \`fetchesFrom\`: Section handle (alleen bij entrySection)

**Children:** Inner Grid Card(s) - aantal MOET matchen met variant
- ALTIJD children genereren, ook bij entrySection (voor preview in editor)

### Inner Grid Card

**Props:**
- \`Title\` (string)
- \`Description\` (string)
- \`Has button\` (bool)
- \`index\` (verplicht, start bij 0)

**Children:** Als \`Has button = true\` → exact 1 Button Primary

---

## EntryPostSlider

Slider met entry previews.

**Props:**
- \`Title\` (string)
- \`fetchesFrom\` (optioneel): Section handle

**Children:** Altijd exact 3 \`Entry Post Inner\` (index 0–2)

### Entry Post Inner

**Props:**
- \`Has title\` (bool) → \`Title of this block\` (string)
- \`Has description\` (bool) → \`Description\` (string)
- \`Has Category\` (bool) → \`Category Name\` (string)
- \`Has Popular\` (bool) → \`Popular\` (string)
- \`index\` (verplicht)

**Children:** Exact 1 Button Primary

---

## LogoSlider

Logobalk.

**Props:**
- \`Title\` (string)

---

## Grid2Col

Overzichtsblok met 2 kolommen (8 items). Geschikt voor channel overzichten zoals projecten, portfolio, cases.

**Props:**
- \`Title\` (string, verplicht)
- \`Has description\` (bool) → \`Description\` (string)
- \`Has example item\` (bool) → \`Example category\`, \`Example header\`, \`Example description\`
- \`fetchesFrom\` (optioneel): Channel handle

**Children:** Altijd exact 8 \`Grid2Col Card\` (index 0–7)

### Grid2Col Card

**Props:**
- \`Category\` (string, verplicht)
- \`Header\` (string, verplicht)
- \`Description\` (string, verplicht)

---

## Grid3Col

Overzichtsgrid met 3 kolommen (9 items). Geschikt voor channel overzichten zoals nieuws, blog, evenementen.

**Props:**
- \`Title\` (string, verplicht)
- \`Description\` (string, verplicht)
- \`fetchesFrom\` (optioneel): Channel handle

**Children:** Altijd exact 9 \`Grid3Col Card\` (index 0–8)

### Grid3Col Card

**Props:**
- \`Category\` (string, verplicht)
- \`Date\` (string, verplicht)
- \`Description\` (string, verplicht)

---

## CalltoAction

Conversieblok.

**Props:**
- \`Has Title\` (bool) → \`Title\` (string)
- \`Has Description\` (bool) → \`Description\` (string)
- \`Has Usps\` (bool) → \`Usp 1\`, \`Usp 2\`, \`Usp 3\`
- \`Has Button Primary\` (bool)
- \`Has Button Secondary\` (bool)

**Children:** Button Primary en/of Button Secondary (afhankelijk van booleans)

---

## Footer

Verplicht als laatste blok van elke pagina.

**Props:**
- \`Has Column 1–4\` (bool) → \`Header 1–4\` (strings)
- \`Link1A–G\` t/m \`Link4A–G\` (strings per kolom)
- \`Has Nieuwsbrief\` (bool)

---

## Form

Generiek formulier.

**Props:**
- \`Has Field 1\` (bool) → \`Field 1\`
- \`Has Field 2\` (bool) → \`Field 2.1\`, \`Field 2.2\` (horizontale rij)
- \`Has Field 3\` (bool) → \`Field 3\` (groot veld)
- \`Has Radio Buttons\` (bool) → \`Radio Button 1–3\`
- \`Has Checkboxes\` (bool) → \`Checkbox 1–3\`
- \`Has Dropdown\` (bool) → \`Dropdown title\`
- \`Has Name\`, \`Has Email\`, \`Has Phone number\`, \`Has Date Timed\` (bools)

---

## Contactform

Vooraf geconfigureerd contactformulier.

**Props:** Geen

---

## Detailpage

Volledig pagina-component voor detailpagina's. Gebruik voor:
- Channel entries (nieuws, project, vacature, etc.)
- Structure leaf nodes (entries zonder children)

**WANNEER GEBRUIKEN:**
- Section type is "channel" → ALTIJD Detailpage
- Section type is "structure" EN de entry heeft GEEN onderliggende children → Detailpage

**PAGINA STRUCTUUR (exact 3 blokken):**
1. \`Detailpage\`
2. \`CalltoAction\`
3. \`Footer\`

Geen andere blokken toegestaan op deze pagina's.

**Props:**
- \`Has Project Header\` (bool) - voor projecten/cases/portfolio
- \`Has News Header\` (bool) - voor nieuws/blog
- (Exact één van beide moet \`true\` zijn)
- \`Paragraph 1\` (string)
- \`Paragraph 2\` (string)
- \`Has Highlight Paragraph\` (bool) → \`Highlight Title\`, \`Highlight Paragraph\`
- \`Paragraph 3 Title\` (string)
- \`Paragraph 3\` (string)
- \`Paragraph 4\` (string)
- \`Has More Projects\` (bool) - matcht met Project Header
- \`Has More News\` (bool) - matcht met News Header

---

## Buttons

### Button Primary

**Props:**
- \`Property 1\`: "Default"
- \`Text primary button\` (string, verplicht)

### Button Secondary

**Props:**
- \`Property 1\`: "Default"
- \`Text Secondary Button\` (string, verplicht)
`
