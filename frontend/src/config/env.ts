type FrontendEnv = {
  apiBaseUrl: string;
};

const DEFAULT_API_BASE_URL = "http://localhost:5000/api";

function requirePublicUrl(value: string | undefined, key: string): string {
  const configuredValue = value ?? DEFAULT_API_BASE_URL;

  try {
    const url = new URL(configuredValue);
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`Invalid URL configured for ${key}`);
  }
}

export const env: FrontendEnv = {
  apiBaseUrl: requirePublicUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "NEXT_PUBLIC_API_BASE_URL"
  )
};
