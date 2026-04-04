const hi: Record<string, string> = {
  // Sell page
  "Sell": "बेचें",
  "Cart": "कार्ट",
  "items": "आइटम",
  "Total": "कुल",
  "Save Bill": "���िल सेव करें",
  "Saving...": "सेव हो रहा...",
  "Walk-in": "वॉक-इन",
  "Phone": "फ़ोन",
  "per": "प्रति",
  "Add customer for loyalty points": "लॉयल्टी पॉइंट के लिए ग्राहक जोड़ें",
  "Hide customer": "ग्राहक छुपाएं",
  "Customer phone (10 digits)": "ग्राहक फ़ोन (10 अंक)",
  "UPI Transaction Ref": "UPI ट्रांजैक्शन रेफ़",
  "Cash": "नकद",

  // My Kiosk
  "My Kiosk": "मेरा कियोस्क",
  "Today's Dispatch": "आज का डिस्पैच",
  "Confirm Receipt": "रसीद की पुष्टि करें",
  "No dispatch for today": "आज कोई डिस्पैच नहीं",

  // Reconcile
  "Reconciliation": "रिकंसिलिएशन",
  "Sold": "बिका",
  "Returned": "वापस",
  "Wasted": "बर्बाद",
  "Loss": "नुकसान",
  "Margin": "मार्जिन",
  "Submit": "जमा करें",
  "Notes": "नोट्स",

  // Cash handover
  "Cash Handover": "कैश हैंडओवर",
  "Expected Cash Today": "आज की अपेक्षित नकदी",
  "Based on cash & mixed payment bills": "कैश और मिश्रित भुगतान बिलों पर आधारित",
  "Cash Handover Recorded": "कैश हैंडओवर दर्ज",
  "Collected": "एकत्र���त",
  "Difference": "अंतर",
  "Record Cash Handover": "कैश हैंडओवर दर्ज करें",
  "Cash Amount": "नकद राशि",
  "Enter cash amount": "नकद राशि दर्ज करें",
  "Any discrepancy notes...": "कोई विसंगति नोट्स...",
  "Submit Cash Handover": "कैश हैंडओवर जमा करें",
  "Submitting...": "जमा हो रहा...",

  // More page
  "More": "और",
  "Attendance": "उपस्थिति",
  "Today": "आज",
  "Not checked in": "चेक इन नहीं किया",
  "Check In": "चेक इन",
  "Check Out": "चेक आउट",
  "Present": "उपस्थित",
  "Absent": "अनुपस्थित",
  "Half Day": "आधा दिन",
  "Leave": "छुट्टी",
  "This Month's Salary": "इस महीने की तनख्वाह",
  "Base": "मूल",
  "Losses": "नुकसान",
  "Status": "स्थिति",
  "Expenses": "खर्चे",
  "Add Expense": "खर्चा जोड़ें",
  "Record Expense": "खर्चा दर्ज करें",
  "Amount": "राशि",
  "Category": "श्रेणी",
  "Description": "विवरण",
  "What was the expense for?": "खर्चा किसलिए था?",
  "Save Expense": "खर्चा सेव करें",
  "Approved": "स्वीकृत",
  "Pending": "लंबित",
  "No expenses this month": "इस महीने कोई खर्चा नहीं",
  "Gas/Fuel": "गैस/ईंधन",
  "Transport": "परिवहन",
  "Cleaning": "सफ़ाई",
  "Repair": "मरम्मत",
  "Supplies": "सामग्री",
  "Other": "अन्य",
  "Bill created successfully!": "बिल सफलतापूर्वक बना!",
};

const en: Record<string, string> = {};

let currentLang: "en" | "hi" = "en";

export function setLanguage(lang: "en" | "hi") {
  currentLang = lang;
  if (typeof window !== "undefined") {
    localStorage.setItem("kiosk-lang", lang);
  }
}

export function getLanguage(): "en" | "hi" {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("kiosk-lang");
    if (stored === "hi" || stored === "en") {
      currentLang = stored;
    }
  }
  return currentLang;
}

export function t(key: string): string {
  if (currentLang === "hi" && hi[key]) {
    return hi[key];
  }
  return en[key] || key;
}
