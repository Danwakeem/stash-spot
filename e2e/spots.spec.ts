import { test, expect } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:8787";

// Helper to get a test Clerk token
// In a real setup, this would authenticate against the Clerk test instance
async function getTestClerkToken(userId: string): Promise<string> {
  // TODO: Replace with real Clerk token generation for E2E
  // For now, this is a placeholder that should be replaced with
  // actual Clerk Backend API calls to generate test tokens
  return `test_token_${userId}`;
}

test.describe("Spots API", () => {
  test("create and retrieve a private spot", async ({ request }) => {
    const token = await getTestClerkToken("user_a");

    const create = await request.post(`${API_URL}/api/v1/spots`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "EMB",
        lat: 37.788,
        lng: -122.4,
        visibility: "private",
        tags: ["ledge"],
      },
    });
    expect(create.ok()).toBeTruthy();
    const { id } = await create.json();

    // user_b should NOT be able to see it
    const tokenB = await getTestClerkToken("user_b");
    const list = await request.get(`${API_URL}/api/v1/spots`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const body = await list.json();
    expect(body.spots.find((s: { id: string }) => s.id === id)).toBeUndefined();
  });

  test("public spots are visible to all authenticated users", async ({
    request,
  }) => {
    const tokenA = await getTestClerkToken("user_a");

    const create = await request.post(`${API_URL}/api/v1/spots`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        name: "Public Park",
        lat: 37.79,
        lng: -122.41,
        visibility: "public",
        tags: ["transition"],
      },
    });
    expect(create.ok()).toBeTruthy();
    const { id } = await create.json();

    const tokenB = await getTestClerkToken("user_b");
    const list = await request.get(`${API_URL}/api/v1/spots`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const body = await list.json();
    expect(body.spots.find((s: { id: string }) => s.id === id)).toBeDefined();
  });

  test("only owner can delete a spot", async ({ request }) => {
    const tokenA = await getTestClerkToken("user_a");

    const create = await request.post(`${API_URL}/api/v1/spots`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        name: "My Spot",
        lat: 37.789,
        lng: -122.399,
        visibility: "private",
      },
    });
    const { id } = await create.json();

    // user_b should not be able to delete
    const tokenB = await getTestClerkToken("user_b");
    const del = await request.delete(`${API_URL}/api/v1/spots/${id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(del.status()).toBe(404);

    // Owner can delete
    const delOwner = await request.delete(`${API_URL}/api/v1/spots/${id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(delOwner.ok()).toBeTruthy();
  });
});

test.describe("Groups API", () => {
  test("create group and join via invite code", async ({ request }) => {
    const tokenA = await getTestClerkToken("user_a");

    const create = await request.post(`${API_URL}/api/v1/groups`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: { name: "Test Crew" },
    });
    expect(create.ok()).toBeTruthy();
    const { invite_code } = await create.json();

    // user_b joins
    const tokenB = await getTestClerkToken("user_b");
    const join = await request.post(`${API_URL}/api/v1/groups/join`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: { invite_code },
    });
    expect(join.ok()).toBeTruthy();
  });
});
