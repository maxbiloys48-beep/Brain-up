import { neon } from "@neondatabase/serverless";
import { createHmac, timingSafeEqual } from "node:crypto";
export function db(){const url=process.env.STORAGE_URL;if(!url)throw new Error("Missing STORAGE_URL");return neon(url);}
export function verifyTelegramInitData(initData){
 const token=process.env.TELEGRAM_BOT_TOKEN;if(!token||!initData)return null;
 const p=new URLSearchParams(initData), hash=p.get("hash");if(!hash)return null;p.delete("hash");
 const age=Date.now()/1000-Number(p.get("auth_date"));if(!Number.isFinite(age)||age< -60||age>86400)return null;
 const check=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
 const secret=createHmac("sha256","WebAppData").update(token).digest();
 const expected=createHmac("sha256",secret).update(check).digest("hex");
 try{const a=Buffer.from(expected,"hex"),b=Buffer.from(hash,"hex");if(a.length!==b.length||!timingSafeEqual(a,b))return null;}catch{return null;}
 try{const u=JSON.parse(p.get("user")||"null");if(!u||!Number.isSafeInteger(Number(u.id)))return null;return{id:String(u.id),firstName:String(u.first_name||"Игрок").slice(0,64)};}catch{return null;}
}
export async function schema(sql){await sql`CREATE TABLE IF NOT EXISTS players(telegram_id TEXT PRIMARY KEY,nickname TEXT NOT NULL DEFAULT 'Игрок',balance BIGINT NOT NULL DEFAULT 0,bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;}
export function json(res,status,obj){res.status(status).setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(obj));}
