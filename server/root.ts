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
});

export type AppRouter = typeof appRouter;
