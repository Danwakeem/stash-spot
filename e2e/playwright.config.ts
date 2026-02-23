import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  use: {
    baseURL: process.env.API_URL ?? "http://localhost:8787",
  },
  timeout: 30_000,
});
