# Regnskap — Regnskaps- og lagersystem

Moderne regnskaps- og lagersystem for norske bedrifter (AS). Bygget med Next.js, Prisma, PostgreSQL og Supabase.

## Sky-arkitektur (anbefalt)

Alt kjører i skyen — **ingen Docker nødvendig**.

| Tjeneste | Rolle |
|----------|--------|
| **[Vercel](https://vercel.com)** | Next.js-app (frontend + server) |
| **[Supabase](https://supabase.com)** | PostgreSQL, Auth, fil-lagring (kvitteringer/PDF) |
| **[Resend](https://resend.com)** | E-post med fakturaer (Fase 3) |

Du utvikler lokalt med `npm run dev`, men database og auth peker mot **Supabase i skyen**.

---

## Oppsett (kun sky)

### 1. Supabase-prosjekt

1. Opprett prosjekt på [supabase.com](https://supabase.com) (region nær Norge, f.eks. `eu-central-1`).
2. **Authentication → URL configuration** — legg til:
   - `http://localhost:3000/**`
   - `https://din-app.vercel.app/**` (etter deploy)
3. **Authentication → Providers** — aktiver e-post/passord.
4. **Storage** — opprett bucket `receipts` (private) og `invoices` (private) når du kommer til Fase 3–4.

### 2. Database-URL-er

I **Project Settings → Database**:

| Variabel | Hvor i Supabase | Bruk |
|----------|-----------------|------|
| `DATABASE_URL` | Connection string → **Transaction** pooler (port 6543) | App, Vercel, `prisma` runtime |
| `DIRECT_URL` | Connection string → **Session** eller direct (port 5432) | `prisma db push`, migreringer |

Kopier til `.env.local` (se `.env.example`).

### 3. Lokalt (mot sky-database)

```bash
npm install
cp .env.example .env.local
# Fyll inn alle Supabase-verdier i .env.local

npm run db:push    # Oppretter tabeller i Supabase Postgres
npm run db:seed    # Demo AS + norsk kontoplan

npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) → registrer første bruker (blir **Eier**).

### 4. Deploy til Vercel

1. Push repo til GitHub.
2. [vercel.com](https://vercel.com) → **Import** prosjektet.
3. Legg inn **samme miljøvariabler** som i `.env.local`:
   - `DATABASE_URL`, `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` = `https://din-app.vercel.app`
4. Deploy.

Etter deploy: oppdater Supabase **Redirect URLs** med den faktiske Vercel-URL-en.

**Merk:** Kjør `db:push` / `db:seed` fra din maskin (med `DIRECT_URL` i `.env.local`) — ikke på Vercel. Vercel bygger bare appen.

---

## Funksjoner (MVP)

### Fase 1 ✅
- Autentisering (Supabase) med roller: Eier, Regnskapsfører, Ansatt
- Norsk kontoplan (NS 4102-inspirert)
- Dobbel bokføringsmotor med balansekontroll
- Dashboard med KPI-kort
- Audit logging

### Kommende
- **Fase 2:** Produkter, lager, beholdning
- **Fase 3:** Fakturaer, PDF, automatisk bokføring
- **Fase 4:** Utgifter, rapporter, MVA-rapport
- **Fase 5:** OCR, månedslåsing, bankintegrasjon

---

## Valgfritt: lokal Docker-database

`docker-compose.yml` finnes kun hvis du **ikke** vil bruke Supabase Postgres under utvikling. For sky-only oppsett kan du ignorere den.

```bash
# Kun hvis du vil kjøre Postgres lokalt (ikke nødvendig)
npm run docker:up
```

---

## Regnskapslogikk

Alle forretningshendelser poster **doble bilag** via `JournalService` (debet = kredit).

## Teknologistack

Next.js 16 · TypeScript · Tailwind · Prisma · Supabase · Vercel
