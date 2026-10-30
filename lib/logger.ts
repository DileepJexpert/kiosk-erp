type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: string;
  stack?: string;
}

const isProduction = process.env.NODE_ENV === "production";

function formatLog(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: unknown
): string {
  const timestamp = new Date().toISOString();
  const errorObj =
    error instanceof Error
      ? { error: error.message, stack: error.stack }
      : error
      ? { error: String(error) }
      : {};

  if (isProduction) {
    const payload: LogPayload = {
      timestamp,
      level,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
      ...errorObj,
    };
    return JSON.stringify(payload);
  }

  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const contextStr = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : "";
  const errStr = errorObj.error ? ` - Error: ${errorObj.error}` : "";
  return `${prefix} ${message}${contextStr}${errStr}`;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", message, context));
    }
  },
  info(message: string, context?: Record<string, unknown>) {
    console.info(formatLog("info", message, context));
  },
  warn(message: string, context?: Record<string, unknown>) {
    console.warn(formatLog("warn", message, context));
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    console.error(formatLog("error", message, context, error));
  },
};
