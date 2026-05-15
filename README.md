# Regnskap

Regnskaps- og lagersystem for norske bedrifter (AS). Bygget for én intern bedrift med dobbel bokføring, MVA, fakturaer, lager og rapporter.

## Funksjoner

| Modul | Beskrivelse |
|-------|-------------|
| Autentisering | Supabase Auth, roller (Eier, Regnskapsfører, Ansatt) |
| Kontoplan | Norsk standard (NS 4102-inspirert) |
| Bilag | Automatisk dobbel bokføring med balansekontroll |
| Produkter og lager | SKU, strekkode, lagerbevegelser, vektet snittkost |
| Fakturaer | Utkast, sending, betaling, PDF, linje-MVA |
| Utgifter | Kostnader, leverandører, kvitteringer (Storage) |
| Rapporter | Resultat, balanse, MVA, saldobalanse, hovedbok |

## Teknologistack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js Server Actions og API Routes
- **Database:** PostgreSQL (Supabase) med Prisma ORM
- **Auth og filer:** Supabase Auth og Supabase Storage
- **Deploy:** Vercel
- **E-post (valgfri):** Resend (deaktivert i UI til prod er konfigurert)

## Arkitektur

```
Bruker
  |
  v
Vercel (Next.js)
  |
  +-- Supabase Auth (sesjon)
  +-- Supabase Postgres (all forretningsdata)
  +-- Supabase Storage (kvitteringer)
```

Data lagres i Supabase, ikke på Vercel. Ved deploy huskes alt mellom økter når miljøvariablene peker på samme prosjekt.

## Kom i gang

### Forutsetninger

- Node.js 20+
- npm
- Supabase-prosjekt ([supabase.com](https://supabase.com))
- Git

### 1. Klon og installer

```bash
git clone <repo-url>
cd Accounting-system
npm install
```

### 2. Miljøvariabler

```bash
cp .env.example .env.local
```

Fyll inn verdier fra Supabase (API og Database). Se `.env.example` for beskrivelse.

| Variabel | Bruk |
|----------|------|
| `DATABASE_URL` | Transaction pooler (port 6543), app og Vercel |
| `DIRECT_URL` | Direct/session (port 5432), `db:push` og migreringer |
| `NEXT_PUBLIC_SUPABASE_URL` | Prosjekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server, Storage) |

**Viktig:** Fjern klammeparenteser `[YOUR-PASSWORD]` fra connection strings. Bruk kun passordet.

### 3. Database

```bash
npm run db:push
npm run db:seed
```

Seed oppretter Demo AS og norsk kontoplan.

### 4. Supabase Auth

Under **Authentication → URL configuration**, legg til:

- `http://localhost:3000/**`
- `https://<din-app>.vercel.app/**` (etter deploy)

Aktiver **Email** provider.

### 5. Storage (kvitteringer)

Opprett privat bucket: `receipts`

### 6. Start utviklingsserver

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000). Første registrerte bruker blir **Eier**.

## Deploy til Vercel

1. Push kode til GitHub.
2. Importer prosjektet i [Vercel](https://vercel.com).
3. Legg inn samme miljøvariabler som i `.env.local`.
4. Sett `NEXT_PUBLIC_APP_URL` til Vercel-URL (f.eks. `https://regnskap.vercel.app`).
5. Deploy.
6. Oppdater Supabase redirect URLs med produksjons-URL.

Kjør `npm run db:push` og `npm run db:seed` fra lokal maskin mot Supabase. Vercel bygger kun applikasjonen.

## NPM scripts

| Script | Beskrivelse |
|--------|-------------|
| `npm run dev` | Utviklingsserver |
| `npm run build` | Produksjonsbygg |
| `npm run start` | Kjør produksjonsbygg lokalt |
| `npm run db:push` | Synkroniser schema til database |
| `npm run db:seed` | Seed kontoplan og demo-bedrift |
| `npm run db:studio` | Prisma Studio |
| `npm run lint` | ESLint |

Alle `db:*`-scripts laster `.env.local` automatisk.

## Mappestruktur

```
src/
  app/              Next.js App Router (sider og API)
  components/       UI-komponenter
  lib/              Hjelpebibliotek, Supabase-klient, validering
  server/
    actions/        Server Actions
    services/       Forretningslogikk (regnskap, faktura, lager, rapporter)
prisma/
  schema.prisma     Databaseskjema
  seed.ts           Kontoplan og demo-data
```

## Regnskapslogikk (kort)

| Hendelse | Bilag |
|----------|-------|
| Faktura sendt | Dr kundefordring, Cr inntekt + utgående MVA |
| Faktura betalt | Dr bank, Cr kundefordring |
| Salg av vare | Dr varekostnad, Cr varelager (+ inntekt på faktura) |
| Utgift | Dr kostnad + inngående MVA, Cr leverandørgjeld |
| Innkjøp lager | Dr varelager, Cr leverandørgjeld |

Alle bilag valideres: `sum(debet) = sum(kredit)`.

## Sikkerhet

- `.env.local` er i `.gitignore` (committ aldri hemmeligheter)
- Bruk `.env.example` som mal uten sensitive verdier
- `SUPABASE_SERVICE_ROLE_KEY` kun på server, aldri i klientkode
- RBAC på kritiske operasjoner

## Valgfritt: lokal Postgres (Docker)

`docker-compose.yml` er kun for lokal database uten Supabase. Standard oppsett bruker Supabase i skyen.

```bash
npm run docker:up
```

## Veikart (valgfritt)

| Fase | Status | Innhold |
|------|--------|---------|
| 1 | Ferdig | Auth, kontoplan, bilag, dashboard |
| 2 | Ferdig | Produkter, lager, bevegelser |
| 3 | Ferdig | Fakturaer, PDF, betaling |
| 4 | Ferdig | Utgifter, rapporter |
| 5 | Planlagt | OCR, månedslåsing, bank, e-post i prod |

## Lisens

Privat prosjekt. Ingen lisens spesifisert.
