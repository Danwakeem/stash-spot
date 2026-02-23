import { createMiddleware } from "hono/factory";
import { verifyToken } from "@clerk/backend";
import type { Env } from "../types";

export const clerkAuth = createMiddleware<Env>(async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });

    c.set("userId", payload.sub);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
