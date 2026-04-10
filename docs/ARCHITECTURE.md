# Kiosk ERP — System Architecture

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        OW["Owner Web App<br/>(Desktop-first)"]
        OP["Operator Web App<br/>(Mobile-first / PWA)"]
    end

    subgraph "Next.js 14 Application"
        subgraph "App Router"
            OWP["(owner)/ Layout<br/>19 pages"]
            OPP["(operator)/ Layout<br/>7 pages"]
            AUTH["(auth)/ Login"]
            API["api/ Routes"]
        end

        subgraph "Middleware"
            MW["Auth Middleware<br/>Role-based routing"]
        end

        subgraph "tRPC Layer"
            TR["tRPC Server<br/>20 Routers · 100+ Procedures"]
        end

        subgraph "Service Layer"
            SVC["15 Business Services"]
        end

        subgraph "Data Layer"
            PRISMA["Prisma ORM v5"]
        end
    end

    subgraph "External Services"
        CLAUDE["Claude Vision API<br/>Bill Scanning"]
        OWM["OpenWeatherMap API"]
        RPay["Razorpay API<br/>UPI Payments"]
    end

    subgraph "Database"
        PG["PostgreSQL<br/>29 Tables · 11 Enums"]
    end

    OW --> OWP
    OP --> OPP
    OWP --> TR
    OPP --> TR
    AUTH --> API
    TR --> SVC
    SVC --> PRISMA
    SVC --> CLAUDE
    SVC --> OWM
    SVC --> RPay
    PRISMA --> PG
    MW --> OWP
    MW --> OPP
```

## Tech Stack

```mermaid
graph LR
    subgraph "Frontend"
        NEXT["Next.js 14"]
        REACT["React 18"]
        TW["Tailwind CSS v3"]
        SHAD["Shadcn/ui"]
        RCHART["Recharts"]
    end

    subgraph "API"
        TRPC["tRPC v11"]
        ZOD["Zod Validation"]
        SJ["SuperJSON"]
    end

    subgraph "Backend"
        AUTHJS["Auth.js v5<br/>Phone OTP"]
        PRISM["Prisma v5"]
        PG2["PostgreSQL"]
    end

    NEXT --> TRPC
    TRPC --> PRISM
    PRISM --> PG2
    REACT --> SHAD
    SHAD --> TW
```

## Role-Based Access Architecture

```mermaid
graph TD
    USER["User Login<br/>(Phone OTP)"]

    USER --> |"role: OWNER"| OWNER_MW["ownerProcedure"]
    USER --> |"role: MANAGER"| MANAGER_MW["managerProcedure"]
    USER --> |"role: OPERATOR"| OPERATOR_MW["operatorProcedure"]

    OWNER_MW --> OWNER_PAGES["Owner Dashboard<br/>19 pages"]
    MANAGER_MW --> OWNER_PAGES
    MANAGER_MW --> OPERATOR_PAGES["Operator App<br/>7 pages"]
    OPERATOR_MW --> OPERATOR_PAGES

    subgraph "Access Matrix"
        direction LR
        A1["OWNER → All 20 routers"]
        A2["MANAGER → 18 routers<br/>(no settings/user mgmt)"]
        A3["OPERATOR → 10 routers<br/>(own kiosk data only)"]
    end
```

## Database Schema (29 Tables)

```mermaid
erDiagram
    User ||--o| Kiosk : "operates"
    User ||--o{ Kiosk : "manages"
    User ||--o{ Bill : "creates"
    User ||--o{ Reconciliation : "submits"
    User ||--o{ Attendance : "records"
    User ||--o{ CashCollection : "collects"
    User ||--o{ Expense : "submits"
    User ||--o{ SalaryRecord : "receives"
    User ||--o{ Alert : "receives"

    Kiosk ||--o{ Dispatch : "receives"
    Kiosk ||--o{ Bill : "generates"
    Kiosk ||--o{ Reconciliation : "reconciles"
    Kiosk ||--o{ Attendance : "tracks"
    Kiosk ||--o{ CashCollection : "collects"
    Kiosk ||--o{ Expense : "incurs"
    Kiosk ||--o{ ComplianceDocument : "holds"
    Kiosk ||--o{ WeatherLog : "logs"
    Kiosk ||--o| MenuTemplate : "uses"

    Item ||--o{ ItemVariant : "has"
    Item ||--o{ DispatchItem : "dispatched"
    Item ||--o{ BillItem : "sold"
    Item ||--o{ ReconItem : "reconciled"
    Item ||--o{ PurchaseItem : "purchased"
    Item ||--o| CentralStock : "stocked"

    Dispatch ||--o{ DispatchItem : "contains"
    Dispatch ||--o| Reconciliation : "reconciled_by"

    Bill ||--o{ BillItem : "contains"
    Reconciliation ||--o{ ReconItem : "contains"

    Supplier ||--o{ Purchase : "supplies"
    Supplier ||--o{ PurchaseTemplate : "templates"
    Purchase ||--o{ PurchaseItem : "contains"

    Customer ||--o{ Bill : "purchases"
    Customer ||--o{ LoyaltyRedemption : "redeems"

    Season ||--o{ MenuTemplate : "activates"
    MenuTemplate ||--o{ MenuTemplateItem : "includes"
```

## tRPC Router Map (20 Routers)

```mermaid
graph LR
    subgraph "Core Operations"
        R1["billing<br/>create · list · getDaySummary · getReceipt"]
        R2["dispatch<br/>create · list · confirm · bulkCreate"]
        R3["reconciliation<br/>create · list · getById · void"]
        R4["item<br/>list · create · update · variants"]
    end

    subgraph "People & Money"
        R5["user<br/>list · create · update · getProfile"]
        R6["salary<br/>generate · finalize · markPaid · advances"]
        R7["attendance<br/>checkIn · checkOut · mark · getMonthly"]
        R8["cashCollection<br/>record · verify · list · markDeposited"]
    end

    subgraph "Supply Chain"
        R9["supplier<br/>create · createPurchase · getStock"]
        R10["purchaseSmart<br/>scanBill · parseText · parseVoice<br/>repeatLast · batchSave · approve · reject<br/>templates · lowStock · aliases"]
    end

    subgraph "Intelligence"
        R11["dashboard<br/>overview · kioskStatus · revenue · alerts"]
        R12["performance<br/>leaderboard · myScore · operatorScore"]
        R13["alert<br/>list · resolve · runFraudCheck"]
        R14["weather<br/>fetchAndLog · getForKiosk"]
        R15["gst<br/>monthly · HSN · GSTR1"]
    end

    subgraph "Configuration"
        R16["kiosk<br/>list · create · update · assignTemplate"]
        R17["template<br/>list · create · switchSeason"]
        R18["expense<br/>create · approve · list"]
        R19["compliance<br/>list · create · getExpiring"]
        R20["customer<br/>findByPhone · addPoints · redeem · list"]
    end
```

## Service Layer (15 Services)

```mermaid
graph TD
    subgraph "AI Services"
        S1["bill-scanner.service<br/>Claude Vision API<br/>scanBill() · parseTextBill()"]
        S2["fuzzy-matcher<br/>4-level item matching<br/>exact · alias · global · partial"]
        S3["purchase-smart.service<br/>validatePrices() · checkDuplicate()<br/>updateItemPrices() · checkTemplate()"]
    end

    subgraph "Core Business"
        S4["billing.service<br/>createBill() · getDaySummary()<br/>GST calc · channel commission"]
        S5["reconciliation.service<br/>processRecon() · calculateLoss()"]
        S6["dispatch.service<br/>createDispatch() · confirmDispatch()"]
        S7["salary.service<br/>generateSalary() · calculateDeductions()"]
        S8["margin.service<br/>calculateWastage() · chargeableLoss()"]
    end

    subgraph "Operations"
        S9["attendance.service<br/>checkIn() · checkOut()<br/>haversine geo-fence validation"]
        S10["cash-collection.service<br/>recordCollection() · verifyCollection()<br/>markDeposited()"]
        S11["expense.service<br/>createExpense() · approve()"]
    end

    subgraph "Analytics & Compliance"
        S12["anomaly.service<br/>5 fraud detection rules<br/>HIGH_WASTAGE · BILLING_MISMATCH<br/>CASH_SHORTAGE · ITEM_LEAKAGE<br/>DISPATCH_COPY_PASTE"]
        S13["performance.service<br/>BRD scoring formula<br/>5 metrics · 4 ratings"]
        S14["gst.service<br/>monthlySummary · HSN · GSTR1"]
        S15["weather.service<br/>OpenWeatherMap integration"]
    end

    S1 --> S2
    S1 --> S3
```

## Deployment Architecture

```mermaid
graph LR
    subgraph "User Devices"
        PHONE["Mobile Browser<br/>(Operator PWA)"]
        DESKTOP["Desktop Browser<br/>(Owner Dashboard)"]
    end

    subgraph "Application Server"
        NEXTJS["Next.js 14<br/>Node.js Runtime<br/>SSR + API + tRPC"]
    end

    subgraph "Database"
        PGDB["PostgreSQL<br/>29 tables"]
    end

    subgraph "External APIs"
        ANTHRO["Anthropic Claude API<br/>Vision + Text"]
        WEATHER["OpenWeatherMap"]
        RAZPAY["Razorpay"]
        MSG91["MSG91<br/>OTP SMS"]
    end

    PHONE --> NEXTJS
    DESKTOP --> NEXTJS
    NEXTJS --> PGDB
    NEXTJS --> ANTHRO
    NEXTJS --> WEATHER
    NEXTJS --> RAZPAY
    NEXTJS --> MSG91
```
