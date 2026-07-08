import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUnknownProviders } from "@/lib/bank-account-data";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "NO_SESSION" }, { status: 401 });

  const desconocidos = await getUnknownProviders();
  return NextResponse.json({ desconocidos });
}
