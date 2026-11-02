import { getSql, json } from "../_lib/db.js";
import { summarize } from "../_lib/summary.js";

export async function onRequestGet({ env }) {
  try {
    const sql = getSql(env);
    const rows = await sql`
      select id, game_date, game, pick, odds, evi, kelly_fractional,
             outcome, units, closing_odds, closing_line, final_score,
             post_mortem, source_url, graded_at
      from public.public_ledger
      order by graded_at desc
      limit 200`;
    return json({ summary: summarize(rows), rows });
  } catch (err) {
    console.error("ledger query failed", err);
    return json({ error: "data_unavailable" }, 503);
  }
}
