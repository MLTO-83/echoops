import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();

const secretCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a secret from Google Cloud Secret Manager with caching.
 */
export async function getSecret(secretName: string): Promise<string> {
  const cached = secretCache.get(secretName);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const [version] = await client.accessSecretVersion({
    name: `${secretName}/versions/latest`,
  });

  const value = version.payload?.data?.toString();
  if (!value) {
    throw new Error(`Secret ${secretName} is empty or not found`);
  }

  secretCache.set(secretName, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return value;
}
