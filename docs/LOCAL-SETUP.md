# Kiosk ERP — Local Development Setup

Step-by-step guide to get Kiosk ERP running on your local machine.

---

## Prerequisites

### Required

| Tool | Version | Check Command |
|------|---------|---------------|
| **Node.js** | 22+ | `node -v` |
| **npm** | 10+ | `npm -v` |
| **PostgreSQL** | 14+ | `psql --version` |
| **Git** | 2.30+ | `git --version` |

### Optional (for specific features)

| Tool | Purpose |
|------|---------|
| Anthropic API Key | AI bill scanning, voice parsing, text parsing |
| MSG91 Account | Production OTP SMS delivery |
| Razorpay Account | UPI payment QR code generation |
| OpenWeatherMap API Key | Weather intelligence for demand forecasting |
| Cloudflare R2 | Bill photo storage |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/dileepjexpert/kiosk-erp.git
cd kiosk-erp
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages including Next.js 14, tRPC v11, Prisma v5, Shadcn/ui, and more.

---

## Step 3: Set Up PostgreSQL

### Option A: Local PostgreSQL

If PostgreSQL is installed locally:

```bash
# Create the database
createdb kiosk_erp

# Or via psql
psql -U postgres -c "CREATE DATABASE kiosk_erp;"
```

Your connection string will be:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kiosk_erp
```

### Option B: Docker

```bash
docker run --name kiosk-pg \
  -e POSTGRES_DB=kiosk_erp \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16
```

Connection string:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kiosk_erp
```

---

## Step 4: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kiosk_erp
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-string-here

# Auth - Use mock OTP for local development
MOCK_OTP_ENABLED=true
MSG91_AUTH_KEY=not-needed-for-local
MSG91_TEMPLATE_ID=not-needed-for-local

# AI Features (optional - needed for bill scanning/voice/text parsing)
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_VISION_MODEL=claude-sonnet-4-6
CLAUDE_TEXT_MODEL=claude-haiku-4-5-20251001

# Storage (optional - needed for bill photo uploads)
CLOUDFLARE_R2_ACCESS_KEY=your-key
CLOUDFLARE_R2_SECRET_KEY=your-secret
CLOUDFLARE_R2_BUCKET=kiosk-erp-files

# Payments (optional - needed for UPI QR generation)
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret

# Weather (optional - needed for weather intelligence)
OPENWEATHERMAP_API_KEY=your-key
```

### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

> **Note:** For local development, only `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `MOCK_OTP_ENABLED=true` are required. All other variables are for optional features.

---

## Step 5: Set Up Database Schema

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates 29 tables and 11 enums)
npx prisma db push
```

---

## Step 6: Seed Sample Data

```bash
# Seed core data (users, items, kiosks, dispatches, bills, reconciliations)
npx prisma db seed

# Seed Hindi-English item aliases (100+ mappings for AI features)
npx tsx prisma/seed-aliases.ts
```

### What the seed creates:

| Entity | Count | Details |
|--------|-------|---------|
| Users | 7 | 1 owner, 1 manager, 5 operators |
| Items | 20 | Food items with cost/sell prices, GST rates |
| Kiosks | 5 | With locations (lat/lng) and assigned operators |
| Seasons | 2 | Summer, Winter with menu templates |
| Menu Templates | 3 | Momo Template, Chaat Template, South Indian Template |
| Dispatches | 3 days | Sample dispatches for Momo Point kiosk |
| Bills | Multiple | Sample bills with various payment modes |
| Reconciliations | Multiple | Sample end-of-day reconciliation data |
| Item Aliases | 100+ | Hindi-to-English mappings (pyaaz -> Onion, etc.) |

---

## Step 7: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 8: Log In

With `MOCK_OTP_ENABLED=true`, you can log in with any of the seeded phone numbers. Enter any OTP code — it will be accepted.

| Role | Phone | Experience |
|------|-------|------------|
| **Owner** | `9999900001` | Desktop-first sidebar with 19 pages |
| **Manager** | `9999900002` | Same as owner (minus settings) |
| **Operator** | `9999900003` | Mobile-first bottom tab with 7 pages |

> **Tip:** Open the operator app in Chrome DevTools mobile view (iPhone SE or similar) for the intended mobile-first experience.

---

## Useful Commands

### Database

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio

# Reset database (drop all data, re-push schema)
npx prisma db push --force-reset

# Re-seed after reset
npx prisma db seed && npx tsx prisma/seed-aliases.ts

# View raw SQL for schema
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

### Development

```bash
# Run linter
npm run lint

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

---

## Project Structure Quick Reference

```
app/(owner)/     → Owner/Manager pages (desktop-first, sidebar nav)
app/(operator)/  → Operator pages (mobile-first, bottom tab nav)
app/(auth)/      → Login page
server/routers/  → 20 tRPC routers (API endpoints)
server/services/ → 15 business logic services
lib/             → Shared utilities (auth, db, i18n, receipt, printer)
components/      → Shared React components (Shadcn/ui + custom)
prisma/          → Database schema and seed scripts
docs/            → Architecture, flow, and sequence diagrams
```

---

## Common Issues

### "Cannot connect to database"

- Ensure PostgreSQL is running: `pg_isready`
- Check your `DATABASE_URL` in `.env`
- Verify the database exists: `psql -l | grep kiosk_erp`

### "NEXTAUTH_SECRET is not set"

- Generate one: `openssl rand -base64 32`
- Add it to your `.env` file

### "Module not found" errors after pulling

```bash
npm install
npx prisma generate
```

### Prisma client out of sync

If you see type errors after schema changes:

```bash
npx prisma generate
# Restart your dev server
```

### Port 3000 already in use

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### Mock OTP not working

Ensure `.env` has:
```
MOCK_OTP_ENABLED=true
```

Restart the dev server after changing `.env` values.

---

## Feature-Specific Setup

### AI Bill Scanning (v3)

Requires `ANTHROPIC_API_KEY` in `.env`. Without it, the scan bill, voice entry, and text parsing features will return errors.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. The system uses Claude Sonnet for vision (bill photos) and Claude Haiku for text parsing

### UPI Payments

Requires Razorpay credentials:

1. Create a Razorpay account at [razorpay.com](https://razorpay.com)
2. Get test mode API keys from the Razorpay dashboard
3. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`

### Bluetooth Receipt Printing

Works directly in the browser via Web Bluetooth API. No additional setup needed. Requires:
- Chrome browser (Web Bluetooth is not supported in Firefox/Safari)
- A Bluetooth ESC/POS thermal printer paired with your device

### Weather Intelligence

1. Get a free API key from [openweathermap.org](https://openweathermap.org/api)
2. Add `OPENWEATHERMAP_API_KEY` to `.env`
