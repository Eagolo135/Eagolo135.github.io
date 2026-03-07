import { NextResponse } from 'next/server';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { screenshotPage } = require('../../../../../../tools/site-agent/core');

export async function POST(req) {
  try {
    const body = await req.json();
    const result = await screenshotPage({
      page: body?.page,
      url: body?.url,
      outputPath: body?.outputPath,
      fullPage: body?.fullPage !== false
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
