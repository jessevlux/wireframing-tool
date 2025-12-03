export const INSTRUCTIONS_MD = `# Instructions

**Doel**
Genereer wireframes in JSON volgens het \`components.schema.json\`.

- Top-level structuur = array van pagina-objecten met \`page\`, \`rationale\` en \`blocks\`.
- Output bevat ZOWEL rationale uitleg ALS de volledige JSON in één response.

---

## Werkwijze

### Stap 1. Begrijp de opdracht

- Analyseer doel van de site.
- Analyseer doelgroep en overtuigingsfactoren.

### Stap 2. Sitemap

- Standaard: Home + Contact, meestal ook Over ons en/of Oplossingen / Diensten (niet altijd verplicht).
- Voeg extra pagina's toe (Projecten / Producten, Nieuws) als dit logisch is.
- Een one-pager alleen als er weinig content is (en leg kort uit waarom).
- Footer is altijd verplicht als laatste blok van elke pagina.
- BELANGRIJK – Detail page component: Dit is ALLEEN voor detailpagina's (Project Detail, News Detail). Als een pagina een Detail page blok bevat, dan bestaat die pagina uit exact: Detail page, CalltoAction, Footer. Geen andere blokken.
- Standaardpagina's (404, Legal Pages, etc.) hoeven NIET meegenomen te worden in de sitemap en JSON.

Geef een uitleg met:

- Welke pagina's je aanmaakt en waarom
- Hoe de homepage is opgebouwd volgens de landing page formule
- Hoe de structuur conversie en gebruikservaring ondersteunt

Gebruik optioneel marketing- en gedragspsychologie modellen om de keuzes te motiveren.

### Stap 3. JSON output (direct aansluitend)

Genereer de volledige JSON in één tool call (emit_wireframe).

- Elke pagina heeft een \`rationale\` field met uitleg over de opbouw van die specifieke pagina
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

Elke pagina heeft:

- \`page\`: naam van de pagina
- \`rationale\`: uitleg waarom deze pagina zo is opgebouwd (2–4 zinnen)
- \`blocks\`: array van component blocks

## Output-eisen (verrijkt)

- Sitemap-uitleg: benoem per pagina de intentie, gekozen archetypen en conversiepaden.
- JSON: reflecteert die keuzes; props/booleans volledig en microcopy kort, duidelijk en taakgericht.
- Hergebruik van archetypen is normaal (bijv. kolommen-blokken op meerdere pagina’s) mits motiveerbaar.

**BELANGRIJK**:

- Gebruik de emit_wireframe tool voor de JSON (niet een code block).
- Geen vervolgvragen, geen opdeling.
`
