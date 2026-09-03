import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function validateDatabaseUrl(value: string, context: z.RefinementCtx): void {
  try {
    const url = new URL(value);

    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL must use the postgresql:// protocol."
      });
    }
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "DATABASE_URL must be a valid PostgreSQL connection URL."
    });
  }
}

const jwtExpiresInSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*[smhd]$/, "JWT_EXPIRES_IN must be a duration such as 15m, 1h, or 7d.")
  .default("1h");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1).superRefine(validateDatabaseUrl),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters."),
  JWT_EXPIRES_IN: jwtExpiresInSchema
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid backend environment configuration. ${details}`);
}

const rawAllowedOrigins =
  parsedEnv.data.CORS_ALLOWED_ORIGINS ?? parsedEnv.data.FRONTEND_URL;

function parseAllowedOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);
}

export const config = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  isProduction: parsedEnv.data.NODE_ENV === "production",
  port: parsedEnv.data.BACKEND_PORT,
  frontendUrl: new URL(parsedEnv.data.FRONTEND_URL).origin,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  jwt: {
    secret: parsedEnv.data.JWT_SECRET,
    expiresIn: parsedEnv.data.JWT_EXPIRES_IN
  },
  cors: {
    allowedOrigins: parseAllowedOrigins(rawAllowedOrigins)
  },
  requestBodyLimit: "1mb"
} as const;
