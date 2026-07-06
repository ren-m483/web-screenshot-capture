import { NextResponse } from "next/server";
import { APPLE_GENRES } from "@/constants/apple-genres";

export async function GET() {
  return NextResponse.json({ genres: APPLE_GENRES });
}
