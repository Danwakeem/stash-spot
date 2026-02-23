import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, seedTestDb, applyMigrations } from "../test-utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEnv = any;

interface SpotItem {
  id: string;
  visibility: string;
  created_by: string;
  tags: string[];
}

describe("Spots routes", () => {
  let db: D1Database;

  beforeEach(async () => {
    db = (env as AnyEnv).DB;
    await applyMigrations(db);
    await seedTestDb(db);
  });

  describe("GET /api/v1/spots", () => {
    it("should return public spots for any authenticated user", async () => {
      const app = createTestApp({ userId: "user_alice" });
      const res = await app.request("/api/v1/spots", undefined, {
        DB: db,
      } as never);
      const body = (await res.json()) as { spots: SpotItem[] };

      expect(res.status).toBe(200);
      expect(body.spots.some((s) => s.id === "spot_pub")).toBe(true);
    });

    it("should not return private spots from other users", async () => {
      const app = createTestApp({ userId: "user_alice" });
      const res = await app.request("/api/v1/spots", undefined, {
        DB: db,
      } as never);
      const body = (await res.json()) as { spots: SpotItem[] };

      expect(
        body.spots.every(
          (s) => s.visibility !== "private" || s.created_by === "user_alice"
        )
      ).toBe(true);
    });

    it("should return own private spots", async () => {
      const app = createTestApp({ userId: "user_bob" });
      const res = await app.request("/api/v1/spots", undefined, {
        DB: db,
      } as never);
      const body = (await res.json()) as { spots: SpotItem[] };

      expect(body.spots.some((s) => s.id === "spot_priv")).toBe(true);
    });

    it("should return group spots for group members", async () => {
      const app = createTestApp({ userId: "user_bob" });
      const res = await app.request("/api/v1/spots", undefined, {
        DB: db,
      } as never);
      const body = (await res.json()) as { spots: SpotItem[] };

      expect(body.spots.some((s) => s.id === "spot_grp")).toBe(true);
    });

    it("should filter by tag", async () => {
      const app = createTestApp({ userId: "user_alice" });
      const res = await app.request(
        "/api/v1/spots?tag=rail",
        undefined,
        { DB: db } as never
      );
      const body = (await res.json()) as { spots: SpotItem[] };

      expect(body.spots.every((s) => s.tags.includes("rail"))).toBe(true);
    });
  });

  describe("POST /api/v1/spots", () => {
    it("should create a spot", async () => {
      const app = createTestApp({ userId: "user_alice" });
      const res = await app.request(
        "/api/v1/spots",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Ledge",
            lat: 37.79,
            lng: -122.41,
            visibility: "private",
            tags: ["ledge"],
          }),
        },
        { DB: db } as never
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: string; name: string };
      expect(body.id).toBeDefined();
      expect(body.name).toBe("New Ledge");
    });
  });

  describe("DELETE /api/v1/spots/:id", () => {
    it("should only allow owner to delete", async () => {
      const app = createTestApp({ userId: "user_alice" });
      const res = await app.request(
        "/api/v1/spots/spot_priv",
        { method: "DELETE" },
        { DB: db } as never
      );

      // Alice should not be able to delete Bob's spot
      expect(res.status).toBe(404);
    });
  });
});
