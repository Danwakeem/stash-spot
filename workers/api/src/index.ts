import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Resource } from "sst";
import type { Env } from "./types";
import { clerkAuth } from "./middleware/auth";
import { spotsRoutes } from "./routes/spots";
import { groupsRoutes } from "./routes/groups";
import { usersRoutes } from "./routes/users";

const app = new Hono<Env>();

// Map SST linked resources to the Hono env bindings the routes expect
app.use("*", async (c, next) => {
  c.env.DB = Resource.StashDb as unknown as D1Database;
  c.env.PHOTOS = Resource.Photos as unknown as R2Bucket;
  await next();
});

// Global middleware
app.use("*", logger());
app.use("*", cors());

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "stash-api" }));

// Protected API routes
const api = new Hono<Env>();
api.use("*", clerkAuth);
api.route("/spots", spotsRoutes);
api.route("/groups", groupsRoutes);
api.route("/users", usersRoutes);

app.route("/api/v1", api);

export default app;
export type AppType = typeof app;
