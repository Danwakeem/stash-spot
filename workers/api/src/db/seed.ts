import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

const TEST_USERS = [
  {
    externalId: "seed_alice",
    username: "alice_sk8s",
    email: "alice@skatetest.dev",
    password: "TestPassword123!",
  },
  {
    externalId: "seed_bob",
    username: "bob_grinds",
    email: "bob@skatetest.dev",
    password: "TestPassword123!",
  },
];

async function upsertClerkUsers() {
  const users: { id: string; username: string | null }[] = [];
  for (const u of TEST_USERS) {
    // Check if user already exists by external ID to make seed idempotent
    const existing = await clerk.users.getUserList({
      externalId: [u.externalId],
    });
    if (existing.totalCount > 0) {
      users.push(existing.data[0]!);
      continue;
    }
    const created = await clerk.users.createUser({
      externalId: u.externalId,
      username: u.username,
      emailAddress: [u.email],
      password: u.password,
    });
    users.push(created);
  }
  return users;
}

async function seedD1(
  clerkUsers: { id: string; username: string | null }[]
) {
  const [alice, bob] = clerkUsers;

  if (!alice || !bob) {
    throw new Error("Failed to create Clerk users");
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`;

  const sql = `
    INSERT OR IGNORE INTO users (id, username) VALUES ('${alice.id}', '${alice.username}');
    INSERT OR IGNORE INTO users (id, username) VALUES ('${bob.id}', '${bob.username}');

    INSERT OR IGNORE INTO spots (id, name, lat, lng, visibility, created_by)
    VALUES ('spot_001', 'EMB', 37.7878, -122.4, 'public', '${alice.id}');

    INSERT OR IGNORE INTO spot_tags (spot_id, tag) VALUES ('spot_001', 'ledge');
    INSERT OR IGNORE INTO spot_tags (spot_id, tag) VALUES ('spot_001', 'stairs');

    INSERT OR IGNORE INTO spots (id, name, lat, lng, visibility, created_by)
    VALUES ('spot_002', 'Secret Hubba', 37.791, -122.403, 'private', '${bob.id}');

    INSERT OR IGNORE INTO spot_tags (spot_id, tag) VALUES ('spot_002', 'ledge');

    INSERT OR IGNORE INTO groups (id, name, invite_code, created_by)
    VALUES ('grp_001', 'SF Crew', 'SK8-SF1', '${alice.id}');

    INSERT OR IGNORE INTO group_members (group_id, user_id, role)
    VALUES ('grp_001', '${alice.id}', 'owner');

    INSERT OR IGNORE INTO group_members (group_id, user_id, role)
    VALUES ('grp_001', '${bob.id}', 'member');
  `;

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });

  if (!res.ok) throw new Error(`D1 seed failed: ${await res.text()}`);
}

const clerkUsers = await upsertClerkUsers();
await seedD1(clerkUsers);
console.log("Seed complete");
console.log("Test credentials:");
TEST_USERS.forEach((u) =>
  console.log(`  ${u.username}: ${u.email} / ${u.password}`)
);
