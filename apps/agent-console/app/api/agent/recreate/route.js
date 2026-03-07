import { NextResponse } from 'next/server';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { recreateFromImage } = require('../../../../../../tools/site-agent/core');

export async function POST(req) {
  try {
    const body = await req.json();
    const result = await recreateFromImage({
      referenceImagePath: body?.referenceImagePath,
      targetPage: body?.targetPage,
      maxIterations: body?.maxIterations,
      targetSimilarity: body?.targetSimilarity,
      publish: Boolean(body?.publish),
      baseInstruction: body?.baseInstruction
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
