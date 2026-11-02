import {db,schema,verifyTelegramInitData,json} from "./_lib.js";
export default async function handler(req,res){
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 try{const u=verifyTelegramInitData(req.headers["x-telegram-init-data"]);if(!u)return json(res,401,{error:"Telegram authentication failed"});
 if(!process.env.ADMIN_TELEGRAM_ID||u.id!==String(process.env.ADMIN_TELEGRAM_ID))return json(res,403,{error:"Not authorized"});
 const sql=db();await schema(sql);
 await sql`INSERT INTO players(telegram_id,nickname) VALUES(${u.id},${u.firstName}) ON CONFLICT(telegram_id) DO NOTHING`;
 const rows=await sql`UPDATE players SET balance=balance+20000,bonus_claimed=TRUE,updated_at=NOW() WHERE telegram_id=${u.id} AND bonus_claimed=FALSE RETURNING balance`;
 if(!rows.length)return json(res,200,{ok:true,alreadyClaimed:true});
 return json(res,200,{ok:true,awarded:20000,balance:Number(rows[0].balance)});
 }catch(e){console.error(e);return json(res,500,{error:"Server error"});}
}
