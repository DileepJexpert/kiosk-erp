import "server-only";
import { createCallerFactory } from "@/server/trpc";
import { appRouter } from "@/server/root";
import { createTRPCContext } from "@/server/trpc";

const createCaller = createCallerFactory(appRouter);

export const serverApi = async () => {
  const context = await createTRPCContext();
  return createCaller(context);
};
