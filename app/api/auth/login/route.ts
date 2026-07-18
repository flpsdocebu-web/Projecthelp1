import { NextResponse } from "next/server";import {createSession,verifyLogin} from "@/lib/auth";
export const runtime="nodejs";
export async function POST(request:Request){try{const body=await request.json(),user=await verifyLogin(String(body.username||"").trim(),String(body.password||""));if(!user)return NextResponse.json({error:"Incorrect username or password."},{status:401});await createSession(user.id);return NextResponse.json({user})}catch{return NextResponse.json({error:"Login service is unavailable."},{status:500})}}
