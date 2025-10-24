# ✅ Setup Compleet!

## 🎉 Wat werkt nu

### 1. **Frontend App**

- ✅ `.env.local` aangemaakt met Supabase credentials
- ✅ Dev server draait op http://localhost:5173
- ✅ Dashboard, Editor en New Project views werken
- ✅ Supabase integratie via `projectService.js`

### 2. **Supabase Edge Function**

- ✅ `generate-wireframe` Edge Function gedeployed
- ✅ Geeft dummy data terug (geen Anthropic API key nodig)
- ✅ Context files (schema, instructions, spec) embedded
- ✅ Klaar voor AI integratie

### 3. **Database**

- ✅ `projects` tabel bestaat in Supabase
- ✅ RLS policies actief
- ✅ CRUD operaties werken

## 🚀 Test de App

1. **Open de app**: http://localhost:5173
2. **Ga naar Dashboard**
3. **Klik "Nieuw Project"**
4. **Vul formulier in:**
   - Projectnaam: Test Website
   - Bedrijfsnaam: Test BV
   - Beschrijving: Een test website
   - Aantal pagina's: 3

5. **Klik "Sitemap Genereren"**
6. Je krijgt dummy data en het project wordt opgeslagen! ✅

## 📁 Bestanden Structuur

```
wireframing-tool/
├── .env.local                    # ✅ Supabase credentials
├── src/
│   ├── services/
│   │   ├── projectService.js     # ✅ CRUD operaties
│   │   └── wireframeService.js   # ✅ AI generatie
│   └── views/
│       ├── DashboardView.vue     # ✅ Toon projecten
│       ├── NewProjectView.vue    # ✅ Maak project
│       └── EditorView.vue        # ✅ Edit wireframes
└── supabase/
    └── functions/
        ├── deno.json             # ✅ Deno config
        └── generate-wireframe/
            ├── index.ts          # ✅ Edge Function
            └── context.ts        # ✅ Schema + Instructions
```

## 🔄 Hoe het werkt

```
User vult formulier in
    ↓
wireframeService.generateWireframe()
    ↓
Edge Function (Dummy Data of AI)
    ↓
Supabase Database
    ↓
Dashboard toont projecten
```

## 💡 Dummy Data vs AI

### Nu: Dummy Data (Gratis)

- Homepage + Contact pagina
- Standaard blokken (Hero, Grid, Footer)
- Instant, geen API kosten

### Later: Echte AI (Optioneel)

Om echte AI te activeren:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key
npx supabase functions deploy generate-wireframe
```

Dan krijg je:

- Intelligente wireframes op basis van je beschrijving
- Aangepast aan aantal pagina's
- Context-aware content
- ~€0.16 per generatie

## ✅ Checklist

- [x] `.env.local` aangemaakt
- [x] Dev server draait
- [x] Edge Function gedeployed
- [x] Database tabel bestaat
- [x] Services werken
- [x] App is toegankelijk

## 🎯 Nu kun je:

1. ✅ **Projecten aanmaken** met dummy wireframes
2. ✅ **Projecten opslaan** in Supabase
3. ✅ **Projecten bekijken** in Dashboard
4. ✅ **Projecten editen** in Editor
5. ✅ **Projecten verwijderen**
6. ✅ **Export naar JSON**

## 🔧 Troubleshooting

### App is wit / crasht

→ Check `.env.local` en herstart dev server

### Projects worden niet opgeslagen

→ Check Supabase credentials in `.env.local`

### Edge Function geeft 401

→ Check of anon key correct is

## 📚 Files

- `.env.local` - Supabase credentials (lokaal)
- `src/services/projectService.js` - CRUD operaties
- `src/services/wireframeService.js` - AI generatie
- `supabase/functions/generate-wireframe/` - Edge Function

**Alles werkt! Veel succes! 🚀**
