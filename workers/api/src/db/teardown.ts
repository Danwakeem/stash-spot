import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

const SEED_EXTERNAL_IDS = ["seed_alice", "seed_bob"];

async function deleteClerkTestUsers() {
  for (const externalId of SEED_EXTERNAL_IDS) {
    const existing = await clerk.users.getUserList({
      externalId: [externalId],
    });
    for (const user of existing.data) {
      await clerk.users.deleteUser(user.id);
      console.log(`Deleted Clerk user ${user.id} (${externalId})`);
    }
  }
}

await deleteClerkTestUsers();
console.log("Teardown complete");
