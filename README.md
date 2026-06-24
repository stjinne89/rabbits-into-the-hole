# 🐇 Rabbits into the Hole

Live festivalkaart voor **Down the Rabbit Hole 2026**. Leden maken een account,
kiezen een konijnenras + avatar, delen hun locatie via **OwnTracks** en zien
elkaar live op een Leaflet-kaart. Per stage toont de app de act die nu speelt en
de eerstvolgende met een aftelklok (blokkenschema via Clashfinder-import).

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind)
- **Supabase** — Postgres, Auth, Realtime
- **Leaflet / react-leaflet** met rotated image-overlay voor de plattegrond
- **OwnTracks** via een eigen HTTP-endpoint (`/api/owntracks`)

## Setup

### 1. Supabase-project

1. Maak een project op [supabase.com](https://supabase.com).
2. Voer het schema + seed uit (SQL editor of CLI):
   - `supabase/migrations/0001_init.sql`
   - `supabase/seed.sql`
3. Auth → Providers → Email aanzetten. Voor lokaal testen mag je
   "Confirm email" uitzetten zodat signup meteen een sessie geeft.

### 2. Environment

Kopieer `.env.example` naar `.env.local` en vul de echte waarden in
(Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `NEXT_PUBLIC_*` worden bij de build ingebakken — herbouw na wijzigingen.

### 3. Draaien

```bash
npm install
npm run dev
```

## OwnTracks koppelen

1. Log in → **Profiel & instellingen → OwnTracks koppelen → Credentials genereren**.
2. Zet in de OwnTracks-app: Mode = **HTTP**, vul URL/username/password in.
3. Locatie verschijnt live op de kaart (Supabase Realtime).

Testen zonder telefoon:

```bash
curl -u <username>:<password> -H "Content-Type: application/json" \
  -d '{"_type":"location","lat":51.857,"lon":5.745,"tst":'$(date +%s)'}' \
  http://localhost:3000/api/owntracks
```

## Blokkenschema importeren (Clashfinder)

De DTRH-clashfinder staat op <https://clashfinder.com/m/dtrh2026/>. De
data-export vereist een (gratis) Clashfinder-account:

1. Maak een account / log in op clashfinder.com.
2. Open de clashfinder → menu **Export** → **JSON** en sla het bestand op.
3. Importeer:

   ```bash
   npm run import:clashfinder -- path/to/dtrh2026.json
   ```

`scripts/sample-schedule.json` bevat een testschema in hetzelfde formaat zodat je
de now-playing-weergave kunt testen zonder de echte export. De import is
idempotent (`clashfinder_id`), dus opnieuw draaien = bijwerken.

**Stage-matching:** acts koppelen op stage-**naam** (hoofdletter-ongevoelig). De
stage-namen in de DB matchen daarom de Clashfinder-namen (REX, Fuzzy Lop, Teddy
Widder, Bossa Nova, Radiate VI, …). Een onbekende stage wordt aangemaakt op het
kaartcentrum; positioneer 'm daarna via de stage-scripts hieronder.

### Stages positioneren

Stageposities staan als plattegrond-fracties in `scripts/stage-positions.ts`
(omgerekend naar GPS via de gekalibreerde overlay-hoeken). Daarna:

```bash
node --env-file=.env.local scripts/inspect-db.ts        # toon stages + act-aantallen
node --env-file=.env.local scripts/reconcile-stages.ts  # posities toepassen, acts blijven behouden
```

`reconcile-stages.ts` werkt bestaande stages op naam bij (acts blijven gekoppeld)
en ruimt lege placeholder-stages op. `apply-stages.ts` doet een volledige
reset maar weigert als er al acts zijn.

## Plattegrond uitlijnen (kalibratie-tool)

Zet de plattegrond als `public/plattegrond.png` en ga (ingelogd) naar
**`/calibrate`**. Sleep de drie hoekpunten (TL/TR/BL) tot de tekening op de echte
kaart past — gebruik *Het Meer* en de wegen als ijkpunten. De tool toont een
kant-en-klaar codeblok dat je in `lib/festival-map.ts` plakt (inclusief
`PLATTEGROND_ENABLED = true`). De overlay wordt geroteerd/gescheefd uitgelijnd.

## Project-structuur

| Pad | Wat |
| --- | --- |
| `app/login`, `app/onboarding`, `app/settings` | auth + profiel |
| `app/map` | kaartpagina (server) |
| `app/api/owntracks` | locatie-ingest (HTTP Basic auth) |
| `components/Map/*` | Leaflet-kaart (client-only) |
| `components/NowPlaying/*` | now-playing paneel |
| `lib/*` | supabase-clients, schema-types, members/schedule helpers |
| `supabase/*` | migraties + seed |
| `scripts/import-clashfinder.ts` | schema-import |

## Gamification — snoepjes 🍬

Konijnen die **samen zijn** (binnen 10 m, beide met een verse locatie < 15 min)
verdienen **allebei een snoepje**. Een paar kan **1× per uur** scoren; daarna
reset de cooldown. Snoepjes worden opgeteld **per konijnenras** (leaderboard
rechtsboven op de kaart, live).

- Detectie zit in een Postgres-trigger op `locations`
  (`supabase/migrations/0003_gamification.sql`) → werkt voor zowel OwnTracks als
  de simulator. Radius (10 m) en cooldown (1 uur) staan in dat bestand.
- Stand per ras komt uit de view `breed_scores`; het paneel
  (`components/Scoreboard.tsx`) ververst live via Realtime op `candies`.

Draai eenmalig migratie `0003_gamification.sql` (SQL-editor of `supabase db push`).
Testen: `npm run simulate` — de konijnen lopen naar stages, komen samen en
verzamelen snoepjes die je in het paneel ziet oplopen.

## Project-structuur

| Pad | Wat |
| --- | --- |
| `app/login`, `app/onboarding`, `app/settings` | auth + profiel |
| `app/map` | kaartpagina (server) + scoreboard-overlay |
| `app/api/owntracks` | locatie-ingest (HTTP Basic auth) |
| `components/Map/*` | Leaflet-kaart (client-only, CRS.Simple plattegrond) |
| `components/Scoreboard.tsx` | snoepjes-leaderboard per ras |
| `lib/plattegrond.ts` | GPS → plattegrond-pixel projectie |
| `supabase/*` | migraties (0001 schema, 0002 stages, 0003 gamification, 0004 festivaltypes, 0005 kaartmarkers) + seed |
| `scripts/*` | import, stage-positionering, simulator |
