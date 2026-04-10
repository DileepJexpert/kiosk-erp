# Kiosk ERP — Business Flow Diagrams

## 1. Daily Operations Flow (End-to-End)

```mermaid
flowchart TD
    START["Start of Day"] --> ATT["Operator Check-In<br/>(Geo-fenced)"]
    ATT --> DISP["Owner Creates Dispatch<br/>(from Menu Template)"]
    DISP --> CONF["Operator Confirms<br/>Dispatch at Kiosk"]
    CONF --> SELL["Operator Sells<br/>Throughout the Day"]
    SELL --> RECON["End of Day:<br/>Operator Reconciles"]
    RECON --> CASH["Cash Collection<br/>(Manager/Owner)"]
    CASH --> ATOUT["Operator Check-Out"]
    ATOUT --> REPORTS["Owner Reviews<br/>Dashboard & Reports"]
    REPORTS --> END["End of Day"]

    SELL --> |"Parallel"| PURCHASE["Receive Stock<br/>from Suppliers"]
    PURCHASE --> STOCK["Stock Updated"]
```

## 2. Billing Flow (with GST + UPI + Aggregator)

```mermaid
flowchart TD
    A["Customer Orders"] --> B{"Payment Mode?"}

    B --> |"CASH"| C1["Calculate Total<br/>+ GST Breakdown"]
    B --> |"UPI"| C2["Generate UPI QR<br/>or Enter UPI Ref"]
    B --> |"MIXED"| C3["Split: Cash Amount<br/>+ UPI Amount"]

    C1 --> D["Create Bill"]
    C2 --> D
    C3 --> D

    D --> E{"Order Channel?"}
    E --> |"WALK_IN"| F1["No commission"]
    E --> |"SWIGGY / ZOMATO"| F2["Calculate Commission<br/>commission = total × rate<br/>netRevenue = total - commission"]
    E --> |"PHONE"| F1

    F1 --> G["Save Bill + BillItems"]
    F2 --> G

    G --> H["GST Calculation:<br/>subtotal = Σ(qty × price)<br/>lineGST = subtotal × gstRate/100<br/>CGST = SGST = gstAmount/2"]

    G --> I{"Customer Phone<br/>Provided?"}
    I --> |"Yes"| J["Lookup/Create Customer<br/>Add Loyalty Points<br/>+1 visit, update totalSpend"]
    I --> |"No"| K["Anonymous Sale"]

    J --> L["Bill Created"]
    K --> L
```

## 3. Reconciliation Flow

```mermaid
flowchart TD
    A["Operator Opens<br/>Reconcile Screen"] --> B["Load Today's Dispatch<br/>(items + quantities)"]
    B --> C["For Each Item:<br/>Enter sold, returned, wasted"]

    C --> D["System Calculates:<br/>sold + returned + wasted = dispatched?"]

    D --> E{"Within Margin?"}
    E --> |"Yes"| F["chargeableLoss = 0"]
    E --> |"No"| G["chargeableLoss =<br/>wasted - allowedMargin<br/>lossAmount = chargeableLoss × costPrice"]

    F --> H["Save Reconciliation"]
    G --> H

    H --> I["totalLoss = Σ lossAmounts"]
    I --> J["Deducted from<br/>Operator's Salary"]
    I --> K["Triggers Fraud Check<br/>(if wastage anomalous)"]
```

## 4. Smart Purchase Entry Flow

```mermaid
flowchart TD
    A["Operator/Owner<br/>Wants to Record Purchase"] --> B{"Entry Method?"}

    B --> |"Scan Bill"| C1["Open Camera<br/>Take Photo of Bill"]
    B --> |"Voice Entry"| C2["Tap Mic<br/>Speak in Hindi/English"]
    B --> |"Repeat Last"| C3["Select Supplier<br/>Load Last Purchase"]
    B --> |"Manual"| C4["Select Items<br/>Enter Qty + Price"]
    B --> |"Paste Text"| C5["Paste WhatsApp<br/>Bill Text"]

    C1 --> D1["Upload to Claude Vision API"]
    C2 --> D2["Web Speech API → Transcript<br/>Send to Claude Text API"]
    C5 --> D3["Send to Claude Text API"]

    D1 --> E["AI Extracts Items:<br/>name, qty, unit, price"]
    D2 --> E
    D3 --> E

    E --> F["Fuzzy Match Items<br/>to Inventory"]

    F --> G["4-Level Matching:<br/>1. Exact name<br/>2. Item aliases<br/>3. Global Hindi aliases<br/>4. Partial match"]

    G --> H["Scan Review Screen:<br/>Green ✓ = matched<br/>Yellow ⚠ = uncertain<br/>Red ✕ = unmatched"]

    C3 --> H
    C4 --> I["Manual Form"]

    H --> J["User Reviews & Edits<br/>Fix prices, match items"]
    I --> J

    J --> K{"Price Alerts?"}
    K --> |">10% change"| L["Show Orange Banner:<br/>'Onion: ₹40 → ₹50 (+25%)'"]
    K --> |"Normal"| M["No alert"]

    L --> N{"Duplicate?"}
    M --> N
    N --> |"Yes"| O["Show Warning:<br/>'Similar purchase today'"]
    N --> |"No"| P["Continue"]

    O --> P
    P --> Q["Save Purchase"]

    Q --> R["Update Central Stock"]
    Q --> S["Update Item Prices<br/>lastPurchasePrice<br/>avgPurchasePrice"]
    Q --> T{"3rd purchase from<br/>same supplier?"}
    T --> |"Yes"| U["Suggest: Save as Template"]
    T --> |"No"| V["Done"]
    U --> V
```

## 5. Cash Collection & Bank Deposit Flow

```mermaid
flowchart TD
    A["End of Day"] --> B["System Calculates<br/>Expected Cash:<br/>Σ cash bills - UPI"]

    B --> C["Manager Counts<br/>Actual Cash"]

    C --> D["Record Collection:<br/>expectedCash, actualCash"]

    D --> E["shortage = expected - actual"]

    E --> F{"Shortage > 0?"}
    F --> |"Yes"| G["Enter Shortage Reason"]
    F --> |"No"| H["No shortage"]

    G --> I["Save CashCollection"]
    H --> I

    I --> J{"shortage > ₹500?"}
    J --> |"Yes"| K["Create Alert:<br/>CASH_SHORTAGE<br/>Severity: HIGH"]
    J --> |"No"| L["Normal"]

    K --> M["Owner Reviews<br/>Alerts Dashboard"]
    L --> N["Later: Mark Bank Deposit"]

    N --> O["depositedToBank = true<br/>bankDepositRef<br/>bankDepositDate"]
```

## 6. Salary Generation Flow

```mermaid
flowchart TD
    A["Owner: Generate<br/>Monthly Salary"] --> B["Fetch Operator's<br/>Base Salary"]

    B --> C["Calculate Total<br/>Reconciliation Losses<br/>for the Month"]

    C --> D["Calculate Total<br/>Advances Given"]

    D --> E["netSalary =<br/>baseSalary<br/>- totalLossDeduction<br/>- totalAdvanceDeduction<br/>+ bonus<br/>+ adjustments"]

    E --> F["Status: DRAFT"]

    F --> G{"Owner Review"}
    G --> |"Adjust"| H["Add bonus or<br/>adjustment notes"]
    G --> |"Approve"| I["Status: FINALIZED"]

    H --> I

    I --> J["Mark Paid"]
    J --> K["Status: PAID<br/>paidAt = now"]
```

## 7. Attendance with Geo-Fencing Flow

```mermaid
flowchart TD
    A["Operator Taps<br/>Check In"] --> B["Get GPS Location<br/>(lat, lng)"]

    B --> C["Fetch Assigned Kiosk<br/>Location + geoFenceRadius"]

    C --> D["Calculate Distance:<br/>Haversine Formula"]

    D --> E{"distance ≤<br/>geoFenceRadius?"}
    E --> |"Yes"| F["Check In Recorded<br/>checkInAt = now<br/>checkInLat, checkInLng"]
    E --> |"No"| G["Error: Too far<br/>from kiosk (X meters)"]

    F --> H["... Work Day ..."]

    H --> I["Operator Taps<br/>Check Out"]
    I --> J["Same geo-fence check"]
    J --> K["Check Out Recorded<br/>checkOutAt = now"]
```

## 8. Fraud Detection Flow

```mermaid
flowchart TD
    A["Trigger: Reconciliation Submit<br/>or Daily Batch Job"] --> B["Run 5 Detection Rules"]

    B --> R1["Rule 1: HIGH_WASTAGE<br/>Operator avg > 2× team avg"]
    B --> R2["Rule 2: BILLING_MISMATCH<br/>Billed qty vs recon > 15% diff"]
    B --> R3["Rule 3: CASH_SHORTAGE_PATTERN<br/>> 3 shortages in one week"]
    B --> R4["Rule 4: SINGLE_ITEM_LEAKAGE<br/>One item wastage 3× vs others"]
    B --> R5["Rule 5: DISPATCH_COPY_PASTE<br/>Same dispatch 5+ consecutive days"]

    R1 --> C{"Alert?"}
    R2 --> C
    R3 --> C
    R4 --> C
    R5 --> C

    C --> |"Yes"| D["Create Alert Record<br/>type, severity, title,<br/>message, data JSON"]
    C --> |"No"| E["No action"]

    D --> F["Owner Sees in<br/>Alerts Dashboard"]
    F --> G{"Owner Action"}
    G --> |"Resolve"| H["isResolved = true<br/>resolution = reason"]
    G --> |"Investigate"| I["View details,<br/>talk to operator"]
```

## 9. Performance Scoring Flow

```mermaid
flowchart TD
    A["Calculate Monthly<br/>Performance Score"] --> B["Fetch 5 Metrics"]

    B --> M1["Wastage Score (30%)<br/>Lower wastage = higher"]
    B --> M2["Revenue Score (25%)<br/>vs target or team avg"]
    B --> M3["Attendance Score (15%)<br/>present days / working days"]
    B --> M4["Timeliness Score (15%)<br/>on-time check-ins"]
    B --> M5["Cash Accuracy Score (15%)<br/>shortage frequency"]

    M1 --> C["Weighted Score =<br/>wastage×0.30 + revenue×0.25<br/>+ attendance×0.15<br/>+ timeliness×0.15<br/>+ cashAccuracy×0.15"]

    C --> D{"Rating"}
    D --> |"≥ 90"| E["EXCELLENT"]
    D --> |"≥ 75"| F["GOOD"]
    D --> |"≥ 50"| G["AVERAGE"]
    D --> |"< 50"| H["NEEDS IMPROVEMENT"]

    E --> I["Leaderboard<br/>Rankings"]
    F --> I
    G --> I
    H --> I
```

## 10. GST Reporting Flow

```mermaid
flowchart TD
    A["Owner Opens<br/>GST Reports"] --> B{"Report Type?"}

    B --> |"Monthly Summary"| C["Aggregate all bills<br/>for selected month"]
    B --> |"HSN-wise"| D["Group by HSN Code<br/>sum taxable + GST"]
    B --> |"GSTR-1 Data"| E["Format per<br/>GST return spec"]

    C --> F["Display:<br/>Total Sales, Taxable Value<br/>CGST, SGST, Total GST<br/>Net Revenue"]

    D --> G["Table:<br/>HSN Code | Description<br/>Taxable | CGST | SGST | Total"]

    E --> H["Export CSV:<br/>GSTIN, Invoice No, Date<br/>Taxable, CGST, SGST, Total"]
```
