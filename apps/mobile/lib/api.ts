import { createApiClient } from "@stash/api-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787";

let cachedClient: ReturnType<typeof createApiClient> | null = null;

export function getApiClient(token?: string) {
  if (!cachedClient || token) {
    cachedClient = createApiClient(API_URL, token);
  }
  return cachedClient;
}

export { API_URL };
