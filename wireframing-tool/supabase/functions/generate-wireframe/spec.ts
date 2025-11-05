export const SPEC_MD = `# Component Specificaties & Beslisregels

Dit document beschrijft alle blokken die door de AI gebruikt mogen worden, inclusief hun eigenschappen, varianten en verplichte regels.
Alle JSON-output moet voldoen aan \`components.schema.json\`.

---

## Algemene regels

- **Props en booleans altijd expliciet opnemen** (\`true\` of \`false\`).
- **Index altijd verplicht** bij Grid-cards, Entry Posts, Project Cards en News Cards.
- **Children alleen toevoegen** als booleans dit vereisen.
- **Footer verplicht** als laatste blok van elke pagina.
- **Geen lorem ipsum** → gebruik korte, realistische Nederlandse microcopy.
- **Variatie toepassen**: kies bewust tussen Default en varianten.

## Bijzonderheden

- **Projects** en **News** en **Detail page** : alleen op hun eigen pagina's en altijd gevolgd door CalltoAction + Footer.
- **Detail page**: Exact één header type moet true zijn.
- **Form** vs **Contactform**: gebruik Form voor algemene formulieren, Contactform specifiek voor contactpagina's.

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

- **Props**:
  - \`Property 1\`: \"Default\" (Media links/Content rechts) of \"Variant2\" (Content links/Media rechts).
- **Children**:
  - Media (met variantkeuze)
  - Content Kolommen Block (met Accordion list of Text Element).

---

### Media

- **Props**:
  - \`Property 1\`:
    - \"Default\" (1 image)
    - \"Variant2\" (2 horizontale images)
    - \"Variant3\" (1 horizontaal + 2 squares)

---

### Content Kolommen Block

- **Props**:
  - \`Has Accordion\` (bool)
  - \`Has Text\` (bool)
- **Children**:
  - Accordion list en/of Text Element.

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
    - \"Default\" (3 kaarten)
    - \"Variant2\" (4 kaarten)
    - \"Variant3\" (2 kaarten)
  - \`Title\` (string)
- **Children**:
  - Inner Grid Card(s) (afhankelijk van variant).

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

## Projects

- **Props**:
  - \`Title\` (string)
  - \`Description\` (string)
  - \`Has description\` (bool)
  - \`Example category\` (string)
  - \`Example header\` (string)
  - \`Example description\` (string)
  - \`Has example project\` (bool)

- **Children**:
  - Altijd exact 8 Project Cards (index 0–7).
- **Volgorde regel**: altijd gevolgd door CalltoAction + Footer.

### Project Card

- **Props**:
  - \`Category\` (string)
  - \`Project header\` (string)
  - \`Description\` (string)

---

## News

- **Props**:
  - \`Title\` (string)
  - \`Description\` (string)
- **Children**:
  - Altijd exact 9 News Cards (index 0–8).
- **Volgorde regel**: altijd gevolgd door CalltoAction + Footer.

### News Card

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

- **Hele pagina** component (voor bijv. nieuws- of projectdetails).
- **Volgorde regel**: altijd gevolgd door CalltoAction + Footer.
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
  - \`Property 1\`: \"Default\"
  - \`Text primary button\` (string)

### Button Secondary

- **Props**:
  - \`Property 1\`: \"Default\"
  - \`Text Secondary Button\` (string)
`
