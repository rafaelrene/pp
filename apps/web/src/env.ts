import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  ORIGIN: { schema: (input) => input ?? "http://localhost:5173" },
  DATABASE_PATH: { schema: (input) => input ?? "./data/pp.sqlite" },
  SESSION_SECRET: {
    schema: (input) => input ?? "ddyaIzAcEppHPKkS0rDIziy42Vxp0B3fYpYDkbbBBDc=",
  },
  NODE_ENV: { schema: (input) => input ?? "development" },
  SHOO_BASE_URL: { schema: (input) => input ?? "https://shoo.dev" },
  MAX_HTML_BYTES: { schema: (input) => input ?? "524288" },
  PUBLIC_BASE_URL: {
    public: true,
    schema: (input) => input ?? "http://localhost:5173",
  },
  PUBLIC_DRAFT_URL: { public: true, schema: (input) => input ?? "" },
});
