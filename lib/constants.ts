export const APP_NAME = "Kiosk ERP";

export const ROLES = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  OPERATOR: "OPERATOR",
} as const;

export const PAYMENT_MODES = {
  CASH: "CASH",
  UPI: "UPI",
  MIXED: "MIXED",
} as const;

export const DISPATCH_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  RECONCILED: "RECONCILED",
} as const;

export const SALARY_STATUS = {
  DRAFT: "DRAFT",
  FINALIZED: "FINALIZED",
  PAID: "PAID",
} as const;

export const SEASON_TYPES = {
  WINTER: "WINTER",
  SUMMER: "SUMMER",
  MONSOON: "MONSOON",
  FESTIVAL: "FESTIVAL",
  ALL_YEAR: "ALL_YEAR",
} as const;

export const ITEM_CATEGORIES = {
  FOOD: "FOOD",
  BEVERAGE: "BEVERAGE",
  SUPPLY: "SUPPLY",
  PACKAGING: "PACKAGING",
} as const;

export const OWNER_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Dispatch", href: "/dispatch", icon: "Truck" },
  { label: "Reconciliation", href: "/reconcile", icon: "ClipboardCheck" },
  { label: "Inventory", href: "/inventory", icon: "Package" },
  { label: "Billing", href: "/billing", icon: "Receipt" },
  { label: "Salary", href: "/salary", icon: "Wallet" },
  { label: "Templates", href: "/templates", icon: "FileText" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;

export const OPERATOR_NAV_ITEMS = [
  { label: "My Kiosk", href: "/my-kiosk", icon: "Store" },
  { label: "Sell", href: "/sell", icon: "ShoppingCart" },
  { label: "Reconcile", href: "/reconcile", icon: "ClipboardCheck" },
  { label: "Salary", href: "/my-salary", icon: "Wallet" },
] as const;
