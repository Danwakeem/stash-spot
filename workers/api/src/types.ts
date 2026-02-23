export type Env = {
  Bindings: {
    DB: D1Database;
    PHOTOS: R2Bucket;
    CLERK_SECRET_KEY: string;
    CLERK_PUBLISHABLE_KEY: string;
    SPOT_PRESENCE: DurableObjectNamespace;
  };
  Variables: {
    userId: string;
  };
};
