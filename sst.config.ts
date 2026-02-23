/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "stash",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "cloudflare",
    };
  },
  async run() {
    const db = new sst.cloudflare.D1("StashDb", {
      migrations: "workers/api/src/db/migrations",
    });

    const photos = new sst.cloudflare.Bucket("Photos");

    const api = new sst.cloudflare.Worker("Api", {
      url: true,
      handler: "workers/api/src/index.ts",
      link: [db, photos],
      environment: {
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY!,
      },
    });

    return {
      api: api.url,
      dbId: db.id,
    };
  },
});
