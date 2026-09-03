type SafeDatabaseError = {
  name?: string;
  code?: string;
  message: string;
};

function redactConnectionStrings(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/for user ["'][^"']+["']/gi, 'for user "[REDACTED]"')
    .replace(/password=([^;&\s]+)/gi, "password=[REDACTED]");
}

function readStringProperty(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return typeof record[key] === "string" ? record[key] : undefined;
}

export function getSafeDatabaseError(error: unknown): SafeDatabaseError {
  if (error instanceof Error) {
    const code = readStringProperty(error, "code");

    return {
      name: error.name,
      ...(code ? { code } : {}),
      message: redactConnectionStrings(error.message)
    };
  }

  return {
    message: "Unknown database error."
  };
}
