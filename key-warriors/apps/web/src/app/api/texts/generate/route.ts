import { NextResponse } from "next/server";
import { z } from "zod";
import { GameModeSchema } from "@key-warriors/shared";
import { buildWordsFromSettings } from "@/lib/texts";

const BodySchema = z.object({
  mode: GameModeSchema,
  modeValue: z.number().int().positive().nullable().optional(),
  customText: z.string().max(5000).nullable().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mode, modeValue = null, customText } = parsed.data;
  const result = buildWordsFromSettings(mode, modeValue, customText);
  return NextResponse.json(result);
}
