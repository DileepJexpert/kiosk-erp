import { createTRPCRouter } from "./trpc";
import { kioskRouter } from "./routers/kiosk";
import { userRouter } from "./routers/user";
import { itemRouter } from "./routers/item";
import { dispatchRouter } from "./routers/dispatch";
import { billingRouter } from "./routers/billing";
import { reconciliationRouter } from "./routers/reconciliation";
import { salaryRouter } from "./routers/salary";
import { templateRouter } from "./routers/template";
import { dashboardRouter } from "./routers/dashboard";
import { attendanceRouter } from "./routers/attendance";
import { cashCollectionRouter } from "./routers/cash-collection";
import { expenseRouter } from "./routers/expense";
import { supplierRouter } from "./routers/supplier";
import { alertRouter } from "./routers/alert";
import { complianceRouter } from "./routers/compliance";
import { customerRouter } from "./routers/customer";
import { performanceRouter } from "./routers/performance";
import { weatherRouter } from "./routers/weather";
import { gstRouter } from "./routers/gst";
import { purchaseSmartRouter } from "./routers/purchase-smart";

export const appRouter = createTRPCRouter({
  kiosk: kioskRouter,
  user: userRouter,
  item: itemRouter,
  dispatch: dispatchRouter,
  billing: billingRouter,
  reconciliation: reconciliationRouter,
  salary: salaryRouter,
  template: templateRouter,
  dashboard: dashboardRouter,
  attendance: attendanceRouter,
  cashCollection: cashCollectionRouter,
  expense: expenseRouter,
  supplier: supplierRouter,
  alert: alertRouter,
  compliance: complianceRouter,
  customer: customerRouter,
  performance: performanceRouter,
  weather: weatherRouter,
  gst: gstRouter,
  purchaseSmart: purchaseSmartRouter,
});

export type AppRouter = typeof appRouter;
