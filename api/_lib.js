import { neon } from "@neondatabase/serverless";
import { createHmac, timingSafeEqual } from "node:crypto";

export function db() {
  const url =
    process.env.DATABASE_URL ||
    process.env.STORAGE_URL ||
    process.env.POSTGRES_URL;

  if (!url) throw new Error("Missing database URL");
  return neon(url);
}

export function verifyTelegramInitData(initData) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData) return null;

  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  if (!hash) return null;
  p.delete("hash");

  const age = Date.now() / 1000 - Number(p.get("auth_date"));
  if (!Number.isFinite(age) || age < -60 || age > 86400) return null;

  const check = [...p.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secret = createHmac("sha256", "WebAppData")
    .update(token)
    .digest();

  const expected = createHmac("sha256", secret)
    .update(check)
    .digest("hex");

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const u = JSON.parse(p.get("user") || "null");
    if (!u || !Number.isSafeInteger(Number(u.id))) return null;

    return {
      id: String(u.id),
      firstName: String(u.first_name || "Игрок").slice(0, 64)
    };
  } catch {
    return null;
  }
}

export async function schema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      telegram_id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL DEFAULT 'Игрок',
      balance BIGINT NOT NULL DEFAULT 300000,
      bonus_claimed BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE players
    ALTER COLUMN balance SET DEFAULT 300000
  `;

  await sql`
    ALTER TABLE players
    ALTER COLUMN bonus_claimed SET DEFAULT TRUE
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    WITH first_run AS (
      INSERT INTO app_migrations(id)
      VALUES ('global_300000_start_bonus')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    )
    UPDATE players
    SET balance = balance + 300000,
        bonus_claimed = TRUE,
        updated_at = NOW()
    WHERE EXISTS (SELECT 1 FROM first_run)
  `;
}

export function json(res, status, obj) {
  res.status(status).setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );
  res.end(JSON.stringify(obj));
}
