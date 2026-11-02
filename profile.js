import {db,schema,verifyTelegramInitData,json} from "./_lib.js";
export default async function handler(req,res){
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 try{const u=verifyTelegramInitData(req.headers["x-telegram-init-data"]);if(!u)return json(res,401,{error:"Telegram authentication failed"});
 const sql=db();await schema(sql);
 await sql`INSERT INTO players(telegram_id,nickname) VALUES(${u.id},${u.firstName}) ON CONFLICT(telegram_id) DO UPDATE SET nickname=EXCLUDED.nickname,updated_at=NOW()`;
 const rows=await sql`SELECT telegram_id,nickname,balance FROM players WHERE telegram_id=${u.id}`;
 return json(res,200,{id:rows[0].telegram_id,nickname:rows[0].nickname,balance:Number(rows[0].balance)});
 }catch(e){console.error(e);return json(res,500,{error:"Server error"});}
}
