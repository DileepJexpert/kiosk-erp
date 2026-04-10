# Kiosk ERP — Complete Feature List

## Product Overview

Kiosk ERP is a full-stack modular monolith for managing street food kiosks and small retail businesses in India. It covers the complete daily operations cycle: dispatch, sales (POS), reconciliation, cash management, salary computation, and supplier procurement — with AI-powered smart entry, GST compliance, fraud detection, and Hindi language support.

**Target Users:** Street food chain owners (1-50 kiosks), small retail operators, pharmacy chains, food truck businesses.

---

## Feature Categories

### A. Core Operations (v1)

| # | Feature | Description | Owner Pages | Operator Pages |
|---|---------|-------------|-------------|----------------|
| A1 | **Dashboard** | Real-time overview: today's revenue, bill count, active kiosks, pending dispatches, 7-day revenue chart, recent bills, unread alerts | `/dashboard` | `/my-kiosk` |
| A2 | **Kiosk Management** | Create/edit kiosks, assign operators and managers, set location (lat/lng), toggle active status, assign menu templates | `/settings` | — |
| A3 | **Item & Inventory** | Manage items with cost/sell price, unit, category, GST rate, HSN code, season tags, perishability, shelf life. Variant support (size/flavor). | `/inventory` | — |
| A4 | **Menu Templates** | Seasonal menu templates per kiosk type. Define default dispatch quantities. Switch active template by season. | `/templates` | — |
| A5 | **Dispatch** | Create daily dispatches from template. Bulk dispatch to multiple kiosks. Operator confirms receipt. Status: PENDING → CONFIRMED → RECONCILED. | `/dispatch` | `/my-kiosk` |
| A6 | **Point of Sale (POS)** | Mobile-first selling interface. Add items to cart, select payment mode, enter customer phone, create bill. Real-time total calculation. | `/billing` | `/sell` |
| A7 | **Reconciliation** | End-of-day reconciliation: operator reports sold/returned/wasted per item vs dispatched. Margin-based loss calculation. Auto-deducts chargeable loss from salary. | `/reconcile` | `/my-reconcile` |
| A8 | **Salary Management** | Generate monthly salary: base - loss deductions - advances + bonus + adjustments. Draft → Finalize → Paid workflow. Advance tracking. | `/salary` | `/my-salary` |
| A9 | **Reports** | Revenue reports by kiosk, date range. Wastage reports. Item-wise performance. Exportable charts. | `/reports` | — |
| A10 | **User Management** | Create operators/managers with phone, Aadhaar, bank details, salary model. Role-based access control (Owner > Manager > Operator). | `/settings` | — |

### B. v2 Enhanced Features

| # | Feature | Description | Key Fields/Logic |
|---|---------|-------------|------------------|
| B1 | **UPI Payments** | Accept UPI payments. Store transaction refs. Razorpay QR code generation. Split cash/UPI in MIXED mode. | `upiTransactionRef`, `paymentStatus`, `razorpayOrderId` |
| B2 | **Receipt Printing** | Generate text and HTML receipts with GST breakdown, UPI ref, loyalty points. ESC/POS Bluetooth printer support via Web Bluetooth API. | `lib/receipt-generator.ts`, `lib/bluetooth-printer.ts` |
| B3 | **GST Compliance** | Per-item GST rate. Auto-calculate CGST/SGST split. Monthly GST summary, HSN-wise breakdown, GSTR-1 export (CSV). | `gstRate`, `cgstAmount`, `sgstAmount`, `/gst-reports` |
| B4 | **Cash Collection** | Record actual cash vs expected. Track shortage with reasons. Mark bank deposits with reference numbers. Auto-alert on shortage > threshold. | `actualCash`, `shortage`, `depositedToBank`, `bankDepositRef` |
| B5 | **Attendance + Geo-fencing** | GPS-based check-in/check-out. Haversine distance validation against kiosk location. Configurable geo-fence radius (default 200m). Substitute operator tracking. | `checkInAt`, `checkInLat`, `geoFenceRadius`, `isSubstitute` |
| B6 | **Expense Management** | 7 expense categories (Fuel/Gas, Local Purchase, Repair, Location Rent, Cleaning, Transport, Misc). Operator submits, owner approves. Daily budget tracking. | `ExpenseCategory` enum, `dailyExpenseBudget` |
| B7 | **Supplier & Stock Management** | Supplier CRUD with payment terms. Purchase tracking with payment status (UNPAID → PARTIAL → PAID). Central stock with low stock threshold alerts. | `paidAmount`, `paymentStatus`, `CentralStock`, `lowStockThreshold` |
| B8 | **Fraud Detection** | 5 threshold-based anomaly detection rules. Runs on reconciliation submit and daily batch. Creates Alert records for owner review with resolve workflow. | `anomaly.service.ts`, 5 rules, `isResolved`, `resolution` |
| B9 | **Performance Scoring** | Weighted score formula: wastage (30%) + revenue (25%) + attendance (15%) + timeliness (15%) + cash accuracy (15%). 4 ratings. Leaderboard with podium. | `performance.service.ts`, `/performance` |
| B10 | **FSSAI Compliance** | Track compliance documents (FSSAI, Fire Safety, Trade License, Health Permit). Expiry alerts (30-day lookahead). Status tracking. | `ComplianceDocument`, `/compliance` |
| B11 | **Hindi Localization** | Hindi/English toggle in operator app. Custom i18n system with 50+ translated strings. Language preference stored per user. | `lib/i18n.ts`, `locale` field, language toggle |
| B12 | **Customer Loyalty** | Phone-based customer tracking. Loyalty points accumulation per bill. Points redemption for discounts. Visit count, total spend, last visit tracking. | `Customer`, `LoyaltyRedemption`, `loyaltyPts` |
| B13 | **Weather Intelligence** | OpenWeatherMap API integration. Daily weather logging per kiosk. Temperature, humidity, rainfall tracking for demand forecasting. | `WeatherLog`, `weather.service.ts` |
| B14 | **Swiggy/Zomato Integration** | Order channel tracking (Walk-in, Swiggy, Zomato, Phone). Commission rate and commission calculation. Net revenue after platform fees. | `OrderChannel`, `channelCommissionRate`, `netRevenue` |

### C. v3 Smart Purchase Entry

| # | Feature | Description | Entry Method |
|---|---------|-------------|--------------|
| C1 | **AI Bill Scanning** | Take photo of paper bill (handwritten Hindi, printed, thermal receipt). Claude Vision API extracts items, quantities, prices. Fuzzy matches to inventory. 30 seconds vs 10 minutes manual. | `PHOTO_SCAN` |
| C2 | **Voice Entry** | Speak purchase details in Hindi or English. Web Speech API transcribes. Claude API parses into structured items. Works for semi-literate operators. | `VOICE` |
| C3 | **Text Parsing** | Paste WhatsApp supplier messages or type bill text. AI extracts structured data from free-form Hindi/English text like "20 kg pyaaz 40 rupay kilo". | `WHATSAPP_TEXT` |
| C4 | **Repeat Purchase** | One-tap repeat of last purchase from a supplier. Pre-fills all items with last quantities and prices. Adjust quantities with +/- buttons. Covers 70% of daily purchases. | `REPEAT` |
| C5 | **Manual Entry** | Traditional form: select supplier, select items, enter qty and price. Fallback for when AI methods aren't suitable. | `MANUAL` |
| C6 | **Batch Scan** | Scan multiple bills in one session. Review all at once. Save all atomically. For end-of-day batch entry of 5-10 bills. | `BATCH_SCAN` |
| C7 | **Hindi Alias Matching** | 100+ pre-seeded Hindi-to-English item mappings (pyaaz → Onion, atta → Wheat Flour). 4-level fuzzy matching: exact → alias → global alias → partial. Dramatically improves scan accuracy. | `ItemAliasGlobal`, `fuzzy-matcher.ts` |
| C8 | **Price Alerts** | Auto-detect when purchase price changes >10% from last purchase. Orange warning banners on review screen. Helps catch supplier price hikes. | `lastPurchasePrice`, `avgPurchasePrice` |
| C9 | **Duplicate Detection** | Detect duplicate purchases: same supplier + same date + total within 10%. Warning shown before save. | `checkDuplicate()` |
| C10 | **Purchase Templates** | Auto-suggested after 3rd purchase from same supplier. Save commonly ordered item lists. One-tap reorder. Usage tracking. | `PurchaseTemplate` |
| C11 | **Approval Flow** | Configurable threshold for purchase approval. Auto-approve below threshold. Pending approval queue for owner with approve/reject actions. Stock only updated on approval. | `approvalStatus`, `PENDING_APPROVAL` |
| C12 | **Barcode Lookup** | Lookup items by EAN-13/EAN-8 barcode. Maps to inventory. For packaged goods in kirana stores and pharmacies. | `barcode` field on Item |

---

## Page Inventory

### Owner App (Desktop-first, Sidebar Navigation) — 20 Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/dashboard` | Revenue cards, charts, kiosk status, alerts |
| Dispatch | `/dispatch` | Create/manage dispatches to kiosks |
| Reconciliation | `/reconcile` | View reconciliation reports and losses |
| Inventory | `/inventory` | Item CRUD, variants, stock levels |
| Billing | `/billing` | All bills, receipt viewer with GST |
| GST Reports | `/gst-reports` | Monthly GST summary, HSN-wise, GSTR-1 export |
| Purchases | `/purchases` | Smart purchase entry, bill scanning, approval queue, templates |
| Salary | `/salary` | Generate/finalize/pay monthly salaries |
| Attendance | `/attendance` | View operator attendance records |
| Cash Collection | `/cash-collection` | Cash reconciliation, shortage tracking, bank deposits |
| Expenses | `/expenses` | Expense approval, category tracking |
| Suppliers | `/suppliers` | Supplier CRUD, purchase history, central stock |
| Performance | `/performance` | Operator leaderboard with scoring |
| Alerts | `/alerts` | Fraud alerts, system alerts, resolve workflow |
| Compliance | `/compliance` | FSSAI and license document tracking |
| Customers | `/customers` | Customer loyalty, points, visit history |
| Reports | `/reports` | Revenue and wastage analytics |
| Templates | `/templates` | Menu template and season management |
| Settings | `/settings` | Kiosk config, user management |

### Operator App (Mobile-first, Bottom Tab Navigation) — 7 Pages

| Page | Route | Tab | Purpose |
|------|-------|-----|---------|
| My Kiosk | `/my-kiosk` | Home | Kiosk info, today's dispatch |
| Sell | `/sell` | Sell | POS interface, cart, billing |
| Stock | `/my-stock` | Stock | Receive stock, AI bill scan, voice entry, low stock |
| Reconcile | `/my-reconcile` | Recon | End-of-day reconciliation |
| Cash | `/my-cash` | Cash | Submit cash collection |
| Salary | `/my-salary` | (More) | View salary, advances |
| More | `/my-more` | More | Attendance, expenses, settings |

---

## Technical Specifications

### Database: 29 Tables, 11 Enums

**Enums:** UserRole, PaymentMode, DispatchStatus, ItemCategory, SalaryStatus, SeasonType, AttendanceStatus, ExpenseCategory, OrderChannel, AlertSeverity, PaymentStatus

**Core Tables:** User, Kiosk, Item, ItemVariant, Season, MenuTemplate, MenuTemplateItem, Dispatch, DispatchItem, Bill, BillItem, Reconciliation, ReconItem, SalaryRecord, Advance

**v2 Tables:** Attendance, CashCollection, Expense, Supplier, Purchase, PurchaseItem, CentralStock, Alert, ComplianceDocument, Customer, LoyaltyRedemption, WeatherLog

**v3 Tables:** PurchaseTemplate, ItemAliasGlobal

### API: 20 tRPC Routers, 100+ Procedures

| Router | Procedures |
|--------|-----------|
| billing | create, list, getDaySummary, getReceipt |
| dispatch | list, getById, create, confirm, getUnreconciled, getTemplateItems, bulkCreate |
| reconciliation | create, list, getById, void |
| item | list, create, update, addVariant, updateVariant, deleteVariant, listSellable |
| kiosk | list, getById, create, update, toggleActive, assignTemplate |
| user | list, create, update, getProfile |
| salary | generate, list, getOperatorSalary, finalize, markPaid, addAdvance, listAdvances |
| template | list, create, update, switchSeason, listSeasons, createSeason |
| dashboard | getOverview, getKioskStatus, getRevenueChart, getRecentBills, getAlerts |
| attendance | checkIn, checkOut, markAttendance, getMonthly, getMyMonthly, getToday, listByKiosk |
| cashCollection | getExpectedCash, record, verify, list, getByDate |
| expense | create, approve, list, myExpenses |
| supplier | list, create, update, createPurchase, listPurchases, getStock, markPurchasePaid |
| alert | list, markRead, markAllRead, unreadCount, runFraudCheck |
| compliance | list, create, update, getExpiring |
| customer | findByPhone, create, addPoints, redeemPoints, list, getStats |
| performance | getLeaderboard, getMyScore, getOperatorScore |
| weather | fetchAndLog, getForKiosk, getRecent |
| gst | getMonthlySummary, getHSNSummary, getGSTR1 |
| purchaseSmart | scanBill, parseText, parseVoice, repeatLast, lookupBarcode, saveSmart, batchSave, approve, reject, listTemplates, saveTemplate, useTemplate, todayPurchases, pendingApprovals, lowStockItems, listAliases, addAlias |

### Services: 15 Business Logic Modules

| Service | Key Functions |
|---------|--------------|
| billing.service | createBill(), getDaySummary(), GST calculation, channel commission |
| reconciliation.service | processReconciliation(), loss calculation |
| dispatch.service | createDispatch(), confirmDispatch() |
| salary.service | generateSalary(), calculateDeductions() |
| margin.service | calculateWastage(), isWithinMargin(), chargeableLoss() |
| attendance.service | checkIn(), checkOut(), haversine geo-fence validation |
| cash-collection.service | recordCollection(), verifyCollection(), markDeposited() |
| expense.service | createExpense(), approveExpense() |
| anomaly.service | 5 fraud detection rules (wastage, billing, cash, leakage, dispatch) |
| performance.service | BRD scoring formula, getLeaderboard() |
| gst.service | monthlySummary(), HSN summary, GSTR-1 export |
| weather.service | OpenWeatherMap integration, logWeatherForKiosks() |
| bill-scanner.service | Claude Vision API, scanBill(), parseTextBill() |
| fuzzy-matcher | 4-level item matching (exact, alias, global, partial) |
| purchase-smart.service | validatePrices(), checkDuplicate(), updateItemPrices(), checkTemplate() |

### Shared Components & Libraries

| Library | Purpose |
|---------|---------|
| `lib/receipt-generator.ts` | Text + HTML receipt generation with GST breakdown |
| `lib/bluetooth-printer.ts` | Web Bluetooth ESC/POS thermal printer |
| `lib/razorpay.ts` | Razorpay client, QR code generation, webhook verification |
| `lib/qr-generator.ts` | UPI URL generation, QR code data URLs |
| `lib/i18n.ts` | Hindi/English localization with 50+ strings |
| `components/scan-review.tsx` | Editable AI extraction review table |

---

## Key Metrics the System Tracks

| Metric | Source |
|--------|--------|
| Daily revenue per kiosk | Bill totals aggregated |
| Wastage rate per operator | Reconciliation chargeableLoss |
| Cash shortage frequency | CashCollection records |
| Purchase cost trends | Item.lastPurchasePrice / avgPurchasePrice |
| Operator performance score | 5-metric weighted formula |
| GST liability | Monthly CGST + SGST totals |
| Customer retention rate | Customer.totalVisits, repeat rate |
| Stock levels vs thresholds | CentralStock.currentQty vs lowStockThreshold |
| Smart entry adoption | Purchase.entryMethod distribution |
| Compliance document expiry | ComplianceDocument.expiryDate monitoring |
