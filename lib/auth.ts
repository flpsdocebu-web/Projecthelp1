import { createHash, randomBytes, randomUUID } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export type SessionUser = { id:string; username:string; name:string; email:string; role:"administrator"|"school"|"student" };
const COOKIE = "project_helps_session";
const tokenHash = (token:string) => createHash("sha256").update(token).digest("hex");

export async function ensurePrimaryAdmin(){
  const username=process.env.ADMIN_USERNAME?.trim(), password=process.env.ADMIN_PASSWORD, email=process.env.ADMIN_EMAIL?.trim();
  if(!username||!password||!email)return;
  const [rows]=await db.query<any[]>("SELECT id FROM users WHERE username=? LIMIT 1",[username]);
  if(rows.length)return;
  await db.execute("INSERT INTO users(id,role,username,email,password_hash,full_name) VALUES(?,?,?,?,?,?)",[randomUUID(),"administrator",username,email,await bcrypt.hash(password,12),"Primary Administrator"]);
}

export async function verifyLogin(username:string,password:string){
  await ensurePrimaryAdmin();
  const [rows]=await db.query<any[]>("SELECT id,username,email,password_hash,full_name,role,suspended FROM users WHERE username=? LIMIT 1",[username]);
  const row=rows[0]; if(!row||row.suspended||!(await bcrypt.compare(password,row.password_hash)))return null;
  return {id:row.id,username:row.username,email:row.email,name:row.full_name,role:row.role} as SessionUser;
}

export async function createSession(userId:string){
  const token=randomBytes(32).toString("base64url"), expires=new Date(Date.now()+8*60*60*1000);
  await db.execute("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",[tokenHash(token),userId,expires]);
  (await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires});
}

export async function currentUser():Promise<SessionUser|null>{
  const token=(await cookies()).get(COOKIE)?.value; if(!token)return null;
  const [rows]=await db.query<any[]>(`SELECT u.id,u.username,u.email,u.full_name,u.role,u.suspended FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>NOW() LIMIT 1`,[tokenHash(token)]);
  const row=rows[0]; if(!row||row.suspended)return null;
  return {id:row.id,username:row.username,email:row.email,name:row.full_name,role:row.role};
}

export async function destroySession(){const jar=await cookies(),token=jar.get(COOKIE)?.value;if(token)await db.execute("DELETE FROM sessions WHERE token_hash=?",[tokenHash(token)]);jar.delete(COOKIE)}
export async function requireAdministrator(){const user=await currentUser();return user?.role==="administrator"?user:null}
export { bcrypt, randomUUID };
