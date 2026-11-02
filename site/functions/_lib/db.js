import { neon } from "@neondatabase/serverless";

export function getSql(env) {
  if (!env.DATABASE_URL_READONLY) {
    throw new Error("DATABASE_URL_READONLY is not configured");
  }
  return neon(env.DATABASE_URL_READONLY);
}

// No mock fallbacks: if data is unavailable we say so (HTTP 503).
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
