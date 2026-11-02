import { getSql, json } from "../_lib/db.js";

// Latest published picks whose game has already started (enforced in the view).
export async function onRequestGet({ env }) {
  try {
    const sql = getSql(env);
    const rows = await sql`
      select id, game_date, sport, game, pick, odds, model_prob, evi,
             kelly_full, kelly_fractional, driver_text, flags, audit,
             logged_at, game_time
      from public.public_pick_feed
      order by game_time desc
      limit 10`;
    return json({ picks: rows });
  } catch (err) {
    console.error("picks query failed", err);
    return json({ error: "data_unavailable" }, 503);
  }
}
