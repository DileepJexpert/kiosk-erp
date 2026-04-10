# Kiosk ERP

A full-stack modular monolith for managing street food kiosks and small retail businesses in India. Covers the complete daily operations cycle: dispatch, sales (POS), reconciliation, cash management, salary computation, supplier procurement, GST compliance, fraud detection, and AI-powered smart entry with Hindi language support.

**Target Users:** Street food chain owners (1-50 kiosks), small retail operators, pharmacy chains, food truck businesses.

---

## Features

### Core Operations (v1)
- **Dashboard** — Real-time revenue, bill count, active kiosks, 7-day revenue chart, alerts
- **Kiosk Management** — Create/edit kiosks, assign operators and managers, toggle active status
- **Item & Inventory** — Items with cost/sell price, GST rate, HSN code, variants (size/flavor)
- **Menu Templates** — Seasonal templates per kiosk type with default dispatch quantities
- **Dispatch** — Daily dispatches from templates, bulk dispatch, operator confirmation (PENDING -> CONFIRMED -> RECONCILED)
- **Point of Sale (POS)** — Mobile-first selling with cart, payment modes (Cash/UPI/Mixed), real-time totals
- **Reconciliation** — End-of-day sold/returned/wasted reporting, margin-based loss calculation, salary deduction
- **Salary Management** — Monthly salary: base - losses - advances + bonus. Draft -> Finalize -> Paid workflow
- **Reports** — Revenue and wastage analytics by kiosk and date range
- **User Management** — Operators/managers with Aadhaar, bank details, role-based access (Owner > Manager > Operator)

### Enhanced Features (v2)
- **UPI Payments** — Razorpay QR code generation, split cash/UPI in MIXED mode
- **Receipt Printing** — GST breakdown receipts, ESC/POS Bluetooth thermal printer via Web Bluetooth API
- **GST Compliance** — Per-item CGST/SGST, monthly GST summary, HSN-wise breakdown, GSTR-1 CSV export
- **Cash Collection** — Expected vs actual cash tracking, shortage alerts, bank deposit recording
- **Attendance + Geo-fencing** — GPS check-in/check-out with Haversine distance validation (configurable radius)
- **Expense Management** — 7 categories, operator submit -> owner approve, daily budget tracking
- **Supplier & Stock** — Supplier CRUD, purchase tracking, central stock with low-stock threshold alerts
- **Fraud Detection** — 5 anomaly detection rules (wastage, billing, cash, leakage, dispatch patterns)
- **Performance Scoring** — Weighted 5-metric formula, 4 ratings, operator leaderboard with podium
- **FSSAI Compliance** — Document tracking (FSSAI, Fire Safety, Trade License) with expiry alerts
- **Hindi Localization** — Hindi/English toggle with 50+ translated strings
- **Customer Loyalty** — Phone-based tracking, loyalty points, redemption for discounts
- **Weather Intelligence** — OpenWeatherMap integration for demand forecasting
- **Swiggy/Zomato Integration** — Order channel tracking with commission calculation

### Smart Purchase Entry (v3)
- **AI Bill Scanning** — Photo of handwritten Hindi/printed bills -> Claude Vision API extraction -> fuzzy inventory matching
- **Voice Entry** — Speak in Hindi/English via Web Speech API -> AI-parsed structured items
- **Text Parsing** — Paste WhatsApp supplier messages -> AI extraction from free-form Hindi/English text
- **Repeat Purchase** — One-tap repeat of last purchase from a supplier
- **Hindi Alias Matching** — 100+ pre-seeded Hindi-to-English item mappings with 4-level fuzzy matching
- **Price Alerts** — Auto-detect >10% price changes from last purchase
- **Duplicate Detection** — Same supplier + date + total within 10% warning
- **Purchase Templates** — Auto-suggested after 3rd purchase, one-tap reorder
- **Approval Flow** — Configurable threshold, auto-approve below, pending queue for owner
- **Barcode Lookup** — EAN-13/EAN-8 barcode to inventory mapping

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Frontend | React 18, Tailwind CSS v3, Shadcn/ui, Recharts |
| API | tRPC v11, Zod validation, SuperJSON |
| Auth | Auth.js v5 (Phone OTP via MSG91) |
| ORM | Prisma v5 |
| Database | PostgreSQL (29 tables, 11 enums) |
| AI | Claude Vision API (bill scanning), Claude Text API (voice/text parsing) |
| Payments | Razorpay (UPI QR generation) |
| Weather | OpenWeatherMap API |
| Testing | Vitest |
| Language | TypeScript 5 |
| Runtime | Node.js 22+ |

---

## Architecture

```
kiosk-erp/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login page (Phone OTP)
│   ├── (owner)/                # Owner/Manager desktop-first layout (19 pages)
│   │   ├── dashboard/          # Revenue cards, charts, kiosk status
│   │   ├── dispatch/           # Create/manage dispatches
│   │   ├── reconcile/          # View reconciliation reports
│   │   ├── inventory/          # Item CRUD, variants, stock
│   │   ├── billing/            # All bills, receipt viewer with GST
│   │   ├── gst-reports/        # Monthly GST summary, GSTR-1 export
│   │   ├── purchases/          # Smart purchase entry, approval queue
│   │   ├── salary/             # Generate/finalize/pay salaries
│   │   ├── attendance/         # Operator attendance records
│   │   ├── cash-collection/    # Cash reconciliation, bank deposits
│   │   ├── expenses/           # Expense approval, categories
│   │   ├── suppliers/          # Supplier CRUD, central stock
│   │   ├── performance/        # Operator leaderboard
│   │   ├── alerts/             # Fraud alerts, resolve workflow
│   │   ├── compliance/         # FSSAI/license document tracking
│   │   ├── customers/          # Loyalty points, visit history
│   │   ├── reports/            # Revenue and wastage analytics
│   │   ├── templates/          # Menu template management
│   │   └── settings/           # Kiosk config, user management
│   ├── (operator)/             # Operator mobile-first layout (7 pages)
│   │   ├── my-kiosk/           # Kiosk info, today's dispatch
│   │   ├── sell/               # POS interface, cart, billing
│   │   ├── my-stock/           # Receive stock, AI bill scan, voice entry
│   │   ├── my-reconcile/       # End-of-day reconciliation
│   │   ├── my-cash/            # Submit cash collection
│   │   ├── my-salary/          # View salary, advances
│   │   └── my-more/            # Attendance, expenses, settings
│   └── api/                    # API routes (auth, tRPC)
├── server/                     # Backend
│   ├── root.ts                 # tRPC app router (20 routers merged)
│   ├── trpc.ts                 # tRPC context, middleware, procedures
│   ├── routers/                # 20 tRPC routers (100+ procedures)
│   │   ├── billing.ts          # create, list, getDaySummary, getReceipt
│   │   ├── dispatch.ts         # create, list, confirm, bulkCreate
│   │   ├── reconciliation.ts   # create, list, getById, void
│   │   ├── purchase-smart.ts   # scanBill, parseText, parseVoice, approve, reject (17 procedures)
│   │   └── ...                 # 16 more routers
│   └── services/               # 15 business logic services
│       ├── bill-scanner.service.ts     # Claude Vision API integration
│       ├── fuzzy-matcher.ts            # 4-level Hindi/English item matching
│       ├── purchase-smart.service.ts   # Price validation, duplicate detection
│       ├── anomaly.service.ts          # 5 fraud detection rules
│       ├── performance.service.ts      # Weighted scoring formula
│       ├── billing.service.ts          # Bill creation, GST calculation
│       ├── gst.service.ts             # GST reports, GSTR-1 export
│       └── ...                         # 8 more services
├── components/                 # Shared React components
│   ├── ui/                     # Shadcn/ui components
│   ├── scan-review.tsx         # AI extraction review table
│   └── providers.tsx           # tRPC + React Query providers
├── lib/                        # Shared libraries
│   ├── auth.ts                 # Auth.js configuration
│   ├── db.ts                   # Prisma client singleton
│   ├── i18n.ts                 # Hindi/English localization (50+ strings)
│   ├── receipt-generator.ts    # Text + HTML receipt generation
│   ├── bluetooth-printer.ts    # Web Bluetooth ESC/POS printer
│   ├── razorpay.ts             # Razorpay client, QR generation
│   ├── qr-generator.ts        # UPI URL + QR code generation
│   └── constants.ts            # App constants
├── prisma/
│   ├── schema.prisma           # Database schema (29 tables, 11 enums)
│   ├── seed.ts                 # Sample data (7 users, 20 items, 5 kiosks)
│   └── seed-aliases.ts         # 100+ Hindi-English item alias mappings
├── tests/                      # Test suites
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # System architecture diagrams (Mermaid)
│   ├── FLOW-DIAGRAMS.md        # Business flow diagrams (10 flows)
│   ├── SEQUENCE-DIAGRAMS.md    # Sequence diagrams (8 sequences)
│   └── FEATURES.md             # Complete feature catalog
└── .env.example                # Environment variable template
```

### Role-Based Access

| Role | App | Pages | Access |
|------|-----|-------|--------|
| **Owner** | Desktop-first sidebar | 19 pages | All 20 tRPC routers |
| **Manager** | Desktop-first sidebar | 19 pages | 18 routers (no settings/user mgmt) |
| **Operator** | Mobile-first bottom tabs | 7 pages | 10 routers (own kiosk data only) |

### Database

- **29 tables** across core (15), v2 (12), and v3 (2) models
- **11 enums**: UserRole, PaymentMode, DispatchStatus, ItemCategory, SalaryStatus, SeasonType, AttendanceStatus, ExpenseCategory, OrderChannel, AlertSeverity, PaymentStatus
- Full schema in `prisma/schema.prisma`

### API (tRPC)

20 routers with 100+ type-safe procedures. See [docs/FEATURES.md](docs/FEATURES.md) for the complete API reference.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/dileepjexpert/kiosk-erp.git
cd kiosk-erp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# Set up PostgreSQL database
npx prisma generate
npx prisma db push

# Seed sample data
npx prisma db seed

# Seed Hindi-English item aliases (100+ mappings)
npx tsx prisma/seed-aliases.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For detailed setup instructions, see [docs/LOCAL-SETUP.md](docs/LOCAL-SETUP.md).

---

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | — |
| `NEXTAUTH_URL` | Application URL | Yes | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Auth.js session encryption secret | Yes | — |
| `MSG91_AUTH_KEY` | MSG91 API key for OTP SMS | No* | — |
| `MSG91_TEMPLATE_ID` | MSG91 OTP template ID | No* | — |
| `MOCK_OTP_ENABLED` | Use mock OTP for local dev (`true`/`false`) | No | `false` |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI bill scanning | No** | — |
| `CLAUDE_VISION_MODEL` | Claude model for image scanning | No | `claude-sonnet-4-6` |
| `CLAUDE_TEXT_MODEL` | Claude model for text/voice parsing | No | `claude-haiku-4-5-20251001` |
| `CLOUDFLARE_R2_ACCESS_KEY` | R2 storage access key | No | — |
| `CLOUDFLARE_R2_SECRET_KEY` | R2 storage secret key | No | — |
| `CLOUDFLARE_R2_BUCKET` | R2 storage bucket name | No | — |
| `OPENWEATHERMAP_API_KEY` | OpenWeatherMap API key | No | — |
| `RAZORPAY_KEY_ID` | Razorpay key ID for UPI | No | — |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret | No | — |

\* Required for production OTP. Set `MOCK_OTP_ENABLED=true` for local development.
\*\* Required for AI bill scanning, voice entry, and text parsing features.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (http://localhost:3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npx prisma studio` | Open Prisma Studio (database GUI) |
| `npx prisma db push` | Push schema changes to database |
| `npx prisma generate` | Regenerate Prisma client |
| `npx prisma db seed` | Seed sample data |

---

## Test Accounts (After Seeding)

| Role | Phone | Name |
|------|-------|------|
| Owner | 9999900001 | Rajesh Kumar |
| Manager | 9999900002 | Amit Singh |
| Operator | 9999900003 | Suresh Yadav |
| Operator | 9999900004 | Ramesh Gupta |
| Operator | 9999900005 | Mohan Sharma |
| Operator | 9999900006 | Vikram Patel |
| Operator | 9999900007 | Deepak Verma |

> With `MOCK_OTP_ENABLED=true`, any OTP code will work for login.

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture with Mermaid diagrams |
| [FLOW-DIAGRAMS.md](docs/FLOW-DIAGRAMS.md) | 10 business flow diagrams |
| [SEQUENCE-DIAGRAMS.md](docs/SEQUENCE-DIAGRAMS.md) | 8 sequence diagrams |
| [FEATURES.md](docs/FEATURES.md) | Complete feature catalog with API reference |
| [LOCAL-SETUP.md](docs/LOCAL-SETUP.md) | Detailed local development setup guide |

---

## License

Private. All rights reserved.
