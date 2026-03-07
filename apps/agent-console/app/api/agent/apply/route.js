import { NextResponse } from 'next/server';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { applyChange } = require('../../../../../../tools/site-agent/core');

export async function POST(req) {
  try {
    const body = await req.json();
    const request = String(body?.request || '').trim();
    const publish = Boolean(body?.publish);

    if (!request) {
      return NextResponse.json({ ok: false, error: 'request is required' }, { status: 400 });
    }

    const result = await applyChange(request, { publish });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
