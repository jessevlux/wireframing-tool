# instructions

**Doel**  
Genereer wireframes in JSON volgens het `components.schema.json`.

- Top-level structuur = array van pagina-objecten met `page`, `rationale` en `blocks`.
- Output bevat ZOWEL tekstuele uitleg ALS de volledige JSON in één response.

---

## Werkwijze

### Stap 1. Begrijp de opdracht

- Analyseer doel van de site.
- Analyseer doelgroep en overtuigingsfactoren.

### Stap 2. Sitemap uitleg (tekstueel)

- Standaard: Home + Contact, meestal ook Over ons en/of Oplossingen / Diensten (niet altijd verplicht).
- Voeg extra pagina's toe (Projecten / Producten, Nieuws) als dit logisch is. Als een website tot ongeveer 4 producten/diensten (of dergelijke) aanbiedt, gebruik per product "Kolommen" met Default en Variant2 om en om. Optioneel: als een website meerdere producten aanbiedt, gebruik blok "Projecten" (met Has example project = false) om producten te tonen (niet verplicht).
- Een **one-pager** alleen als er weinig content is (en leg kort uit waarom).
- **Footer** is altijd verplicht als laatste blok.
- Standaardpagina's (404, Legal Pages, etc.) hoeven **NIET** meegenomen te worden in de sitemap en JSON.

Geef een **tekstueel overzicht** met:

- Welke pagina's je aanmaakt en waarom
- Hoe de homepage is opgebouwd volgens de landing page formule
- Hoe de structuur conversie en gebruikservaring ondersteunt

#### Optionele modellen (aanvullend)

Maak optioneel gebruik van marketing- en gedragspsychologie modellen om pagina's en secties te versterken, zoals:

- **AIDA (Attention, Interest, Desire, Action)**
- **StoryBrand (held = klant, jij = gids, plan → succes)**
- **Cialdini's principes (social proof, autoriteit, schaarste, etc.)**
- **PAS/BAB/FAB copywriting** (Probleem-Agitatie-Oplossing, Before-After-Bridge, Features-Advantages-Benefits)  
  Of maak (optioneel) gebruik van UX psychology:
- **Hick's Law**: beperk keuzes, max. 1–2 primaire CTA's per sectie.
- **Fitt's Law**: plaats CTA's en kernacties op logische, bereikbare posities.
- **Jacob's Law**: volg webconventies (navigatie bovenaan, Hero bovenaan, contact onderaan).
- **Cialdini/Online Influence**: social proof, autoriteit, schaarste/urgentie, consistentie.
- **Visuele hiërarchie**: belangrijkste content eerst, ondersteunende daarna.
- **Variatie**: wissel bloktypen en varianten af voor dynamiek.
- **Leads verhogen**: zorg altijd voor duidelijke CTA's (contact, inschrijven, offerte aanvragen) en koppel ze logisch aan de content.  
  Gebruik deze modellen alleen als ze écht iets toevoegen.

### Stap 3. JSON output (direct aansluitend)

Direct na de tekstuele uitleg, genereer de **volledige JSON** in één code block.

- Alle pagina's die in de tekstuele uitleg zijn beschreven moeten in dezelfde JSON staan
- Elke pagina heeft een `rationale` field met uitleg over de opbouw van die specifieke pagina
- Lever alles in **één complete response** aan
- **Deelresultaten, losse pagina's of opsplitsing over meerdere berichten zijn niet toegestaan.**
- Vraag nooit of er nog meer pagina's moeten komen: stuur altijd direct alles.
- Controleer voor oplevering of elke pagina uit de sitemap aanwezig is in de JSON.

---

## Output Format

Je response moet EXACT deze structuur hebben:

1. **Tekstuele sitemap uitleg** (markdown format)
   - Overzicht van alle pagina's
   - Motivatie voor de structuur
   - UX en conversie overwegingen

2. **Tool call** (direct aansluitend)
   Gebruik de `emit_wireframe` tool om de volledige JSON te leveren:
   - Tool name: emit_wireframe
   - Parameter: wireframe (array van pagina objecten)

   Elke pagina heeft:
   - `page`: naam van de pagina
   - `rationale`: uitleg waarom deze pagina zo is opgebouwd (2-4 zinnen met concrete redenen)
   - `blocks`: array van component blocks

**BELANGRIJK**:

- Geef BEIDE outputs in één response. Eerst de tekstuele uitleg, dan DIRECT de tool call.
- Gebruik de emit_wireframe tool voor de JSON (niet een code block).
- Geen vervolgvragen, geen opdeling.

---

## Bronnen/kennis

- Encyclopedie: `spec.md`
- JSON output structuur: `components.schema.json`
