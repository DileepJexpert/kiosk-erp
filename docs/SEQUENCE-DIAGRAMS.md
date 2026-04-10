# Kiosk ERP — Sequence Diagrams

## 1. User Authentication (Phone OTP)

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant NextJS as Next.js App
    participant AuthJS as Auth.js
    participant MSG91 as MSG91 SMS
    participant DB as PostgreSQL

    User->>Browser: Enter phone number
    Browser->>NextJS: POST /api/auth/send-otp
    NextJS->>MSG91: Send OTP SMS
    MSG91-->>User: SMS with OTP code
    User->>Browser: Enter OTP
    Browser->>NextJS: POST /api/auth/callback/credentials
    NextJS->>AuthJS: Verify OTP
    AuthJS->>DB: Find user by phone
    DB-->>AuthJS: User record + role
    AuthJS-->>NextJS: Session created
    NextJS-->>Browser: Redirect based on role
    Note over Browser: OWNER → /dashboard
    Note over Browser: OPERATOR → /my-kiosk
```

## 2. Create Bill (POS Transaction)

```mermaid
sequenceDiagram
    actor Operator
    participant POS as Sell Page
    participant tRPC as tRPC Router
    participant BillSvc as Billing Service
    participant DB as PostgreSQL

    Operator->>POS: Add items to cart
    Operator->>POS: Select payment mode (CASH/UPI/MIXED)
    Operator->>POS: Enter customer phone (optional)
    Operator->>POS: Tap "Create Bill"

    POS->>tRPC: billing.create({items, paymentMode, ...})
    tRPC->>BillSvc: createBill(input)

    BillSvc->>BillSvc: Calculate per-item GST
    Note over BillSvc: lineSubtotal = qty × price<br/>lineGST = subtotal × (gstRate/100)<br/>lineTotal = subtotal + lineGST

    BillSvc->>BillSvc: Calculate bill totals
    Note over BillSvc: subtotal = Σ lineSubtotals<br/>gstAmount = Σ lineGSTs<br/>cgstAmount = gstAmount / 2<br/>sgstAmount = gstAmount / 2<br/>total = subtotal + gstAmount

    alt Aggregator Order (Swiggy/Zomato)
        BillSvc->>BillSvc: Calculate commission
        Note over BillSvc: commission = total × commissionRate<br/>netRevenue = total - commission
    end

    BillSvc->>DB: INSERT Bill + BillItems

    alt Customer phone provided
        BillSvc->>DB: UPSERT Customer
        BillSvc->>DB: UPDATE loyaltyPts, totalSpend, totalVisits
    end

    DB-->>BillSvc: Bill created
    BillSvc-->>tRPC: Bill with items
    tRPC-->>POS: Success + bill data
    POS-->>Operator: Show receipt
```

## 3. Dispatch → Reconciliation → Salary Deduction

```mermaid
sequenceDiagram
    actor Owner
    actor Operator
    participant OwnerApp as Owner Dashboard
    participant OpApp as Operator App
    participant tRPC as tRPC Router
    participant ReconSvc as Reconciliation Service
    participant SalarySvc as Salary Service
    participant DB as PostgreSQL

    Note over Owner,DB: MORNING: Create Dispatch
    Owner->>OwnerApp: Create dispatch for kiosk
    OwnerApp->>tRPC: dispatch.create({kioskId, items})
    tRPC->>DB: INSERT Dispatch + DispatchItems
    DB-->>tRPC: Dispatch created (PENDING)

    Note over Owner,DB: MORNING: Operator Confirms
    Operator->>OpApp: Confirm dispatch received
    OpApp->>tRPC: dispatch.confirm({dispatchId})
    tRPC->>DB: UPDATE status = CONFIRMED

    Note over Owner,DB: END OF DAY: Reconciliation
    Operator->>OpApp: Open reconcile screen
    OpApp->>tRPC: dispatch.getUnreconciled()
    tRPC-->>OpApp: Today's dispatch items

    Operator->>OpApp: Enter: sold, returned, wasted per item
    OpApp->>tRPC: reconciliation.create({items})
    tRPC->>ReconSvc: processReconciliation()

    loop For each item
        ReconSvc->>ReconSvc: Check: sold + returned + wasted = dispatched?
        ReconSvc->>ReconSvc: chargeableLoss = max(0, wasted - allowedMargin)
        ReconSvc->>ReconSvc: lossAmount = chargeableLoss × costPrice
    end

    ReconSvc->>DB: INSERT Reconciliation + ReconItems
    ReconSvc->>DB: UPDATE Dispatch status = RECONCILED
    DB-->>ReconSvc: totalLoss calculated

    Note over Owner,DB: MONTH END: Salary Generation
    Owner->>OwnerApp: Generate salary for month
    OwnerApp->>tRPC: salary.generate({operatorId, month})
    tRPC->>SalarySvc: calculateSalary()

    SalarySvc->>DB: SUM reconciliation losses for month
    SalarySvc->>DB: SUM advances for month
    SalarySvc->>SalarySvc: netSalary = base - losses - advances + bonus
    SalarySvc->>DB: INSERT SalaryRecord (DRAFT)
    DB-->>tRPC: Salary record
    tRPC-->>OwnerApp: Salary details

    Owner->>OwnerApp: Finalize → Mark Paid
```

## 4. AI Bill Scanning (Smart Purchase Entry)

```mermaid
sequenceDiagram
    actor User as Operator/Owner
    participant App as Stock/Purchase Page
    participant tRPC as tRPC Router
    participant Scanner as Bill Scanner Service
    participant Matcher as Fuzzy Matcher
    participant Claude as Claude Vision API
    participant DB as PostgreSQL

    User->>App: Tap "Scan Bill"
    App->>App: Open camera (HTML input)
    User->>App: Take photo of paper bill

    App->>App: Convert to base64
    App->>tRPC: purchaseSmart.scanBill({imageBase64})

    tRPC->>Scanner: scanBill(imageBase64, db)
    Scanner->>DB: Fetch inventory items + aliases
    Scanner->>DB: Fetch suppliers
    Scanner->>DB: Fetch global aliases (ItemAliasGlobal)

    Scanner->>Claude: POST /v1/messages
    Note over Scanner,Claude: Image + prompt with:<br/>- Known inventory items<br/>- Known suppliers<br/>- Hindi name mappings

    Claude-->>Scanner: JSON response
    Note over Claude,Scanner: {supplier, items[], grandTotal,<br/>billDate, confidence}

    loop For each extracted item
        Scanner->>Matcher: fuzzyMatchItem(rawText)
        Matcher->>Matcher: Level 1: Exact name match
        Matcher->>Matcher: Level 2: Item aliases
        Matcher->>Matcher: Level 3: Global alias table
        Matcher->>Matcher: Level 4: Partial/contains
        Matcher-->>Scanner: {itemId, confidence, matchLevel}
    end

    Scanner-->>tRPC: ExtractedBill

    tRPC->>DB: Check price changes (>10%)
    tRPC->>DB: Check duplicate (same supplier + date + amount)
    tRPC-->>App: {extracted, priceAlerts, isDuplicate}

    App-->>User: Show Scan Review screen
    Note over User,App: Editable table with<br/>green/yellow/red match icons

    User->>App: Review, edit, confirm
    App->>tRPC: purchaseSmart.saveSmart({items, supplierId})

    tRPC->>DB: INSERT Purchase + PurchaseItems
    tRPC->>DB: UPSERT CentralStock (increment)
    tRPC->>DB: UPDATE Item prices (last, avg)
    tRPC->>DB: Check template suggestion

    tRPC-->>App: {purchase, suggestTemplate}
    App-->>User: "Purchase saved! Stock updated."
```

## 5. Cash Collection & Fraud Detection

```mermaid
sequenceDiagram
    actor Manager
    participant App as Cash Collection Page
    participant tRPC as tRPC Router
    participant CashSvc as Cash Collection Service
    participant AnomalySvc as Anomaly Service
    participant DB as PostgreSQL

    Manager->>App: Open cash collection
    App->>tRPC: cashCollection.getByDate({kioskId, date})
    tRPC->>CashSvc: calculateExpectedCash()
    CashSvc->>DB: SUM bills where paymentMode = CASH
    CashSvc->>DB: SUBTRACT UPI amounts
    CashSvc-->>tRPC: expectedCash = ₹X

    tRPC-->>App: Expected cash amount

    Manager->>App: Enter actual cash counted
    Manager->>App: Submit collection

    App->>tRPC: cashCollection.record({actualCash, ...})
    tRPC->>CashSvc: recordCollection()
    CashSvc->>CashSvc: shortage = expected - actual

    CashSvc->>DB: INSERT CashCollection

    alt shortage > ₹500
        CashSvc->>DB: CREATE Alert (CASH_SHORTAGE, HIGH)
    end

    CashSvc-->>tRPC: Collection recorded

    Note over tRPC,DB: Periodic: Fraud Detection Batch

    tRPC->>AnomalySvc: runAllChecks()

    AnomalySvc->>DB: Query operator wastage rates
    AnomalySvc->>AnomalySvc: Rule: wastage > 2× team avg?

    AnomalySvc->>DB: Query billing vs recon diffs
    AnomalySvc->>AnomalySvc: Rule: diff > 15%?

    AnomalySvc->>DB: Query cash shortage frequency
    AnomalySvc->>AnomalySvc: Rule: > 3 shortages/week?

    AnomalySvc->>DB: CREATE Alerts for violations
    AnomalySvc-->>tRPC: Alerts created
```

## 6. Attendance Check-In with Geo-Fencing

```mermaid
sequenceDiagram
    actor Operator
    participant App as Operator App
    participant tRPC as tRPC Router
    participant AttSvc as Attendance Service
    participant DB as PostgreSQL

    Operator->>App: Tap "Check In"
    App->>App: navigator.geolocation.getCurrentPosition()
    App-->>App: Got lat, lng

    App->>tRPC: attendance.checkIn({lat, lng})
    tRPC->>AttSvc: checkIn(operatorId, lat, lng)

    AttSvc->>DB: Fetch operator's assigned kiosk
    DB-->>AttSvc: Kiosk {latitude, longitude, geoFenceRadius}

    AttSvc->>AttSvc: Haversine distance calculation
    Note over AttSvc: d = 2R × arcsin(√(sin²(Δlat/2)<br/>+ cos(lat1)×cos(lat2)×sin²(Δlng/2)))

    alt distance ≤ geoFenceRadius
        AttSvc->>DB: UPSERT Attendance
        Note over DB: date, checkInAt = now(),<br/>checkInLat, checkInLng,<br/>status = PRESENT
        AttSvc-->>tRPC: Success
        tRPC-->>App: "Checked in at 9:15 AM"
    else distance > geoFenceRadius
        AttSvc-->>tRPC: Error
        tRPC-->>App: "Too far from kiosk (450m away, limit 200m)"
    end
```

## 7. Performance Leaderboard Generation

```mermaid
sequenceDiagram
    actor Owner
    participant App as Performance Page
    participant tRPC as tRPC Router
    participant PerfSvc as Performance Service
    participant DB as PostgreSQL

    Owner->>App: Open Performance page
    App->>tRPC: performance.getLeaderboard({month})
    tRPC->>PerfSvc: getLeaderboard(month)

    PerfSvc->>DB: Fetch all operators
    loop For each operator
        PerfSvc->>DB: Query reconciliation losses
        PerfSvc->>PerfSvc: wastageScore (weight: 0.30)

        PerfSvc->>DB: Query total revenue
        PerfSvc->>PerfSvc: revenueScore (weight: 0.25)

        PerfSvc->>DB: Query attendance records
        PerfSvc->>PerfSvc: attendanceScore (weight: 0.15)

        PerfSvc->>DB: Query check-in times
        PerfSvc->>PerfSvc: timelinessScore (weight: 0.15)

        PerfSvc->>DB: Query cash shortages
        PerfSvc->>PerfSvc: cashAccuracyScore (weight: 0.15)

        PerfSvc->>PerfSvc: totalScore = weighted sum
        PerfSvc->>PerfSvc: rating = EXCELLENT/GOOD/AVG/NEEDS_IMPROVEMENT
    end

    PerfSvc->>PerfSvc: Sort by totalScore DESC
    PerfSvc-->>tRPC: Ranked leaderboard
    tRPC-->>App: [{rank, name, score, rating, metrics}]
    App-->>Owner: Top 3 podium + detailed table
```

## 8. Owner Dashboard Data Loading

```mermaid
sequenceDiagram
    actor Owner
    participant App as Dashboard Page
    participant tRPC as tRPC Router
    participant DB as PostgreSQL

    Owner->>App: Open Dashboard

    par Parallel API Calls
        App->>tRPC: dashboard.getOverview()
        App->>tRPC: dashboard.getKioskStatus()
        App->>tRPC: dashboard.getRevenueChart()
        App->>tRPC: dashboard.getRecentBills()
        App->>tRPC: dashboard.getAlerts()
    end

    tRPC->>DB: Today's revenue (SUM bills)
    tRPC->>DB: Today's bills count
    tRPC->>DB: Active kiosks
    tRPC->>DB: Pending dispatches
    tRPC->>DB: 7-day revenue trend
    tRPC->>DB: Latest 10 bills
    tRPC->>DB: Unread alerts

    DB-->>tRPC: Aggregated data
    tRPC-->>App: All dashboard data

    App-->>Owner: Revenue cards, charts,<br/>kiosk status, alerts
```
