import { NextResponse } from "next/server";
import { STOREFRONTS } from "@/constants/storefronts";

export async function GET() {
  return NextResponse.json({ storefronts: STOREFRONTS });
}
