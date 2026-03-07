import { NextResponse } from 'next/server';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateSite } = require('../../../../../../tools/site-agent/core');

export async function GET() {
  try {
    const result = validateSite();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
