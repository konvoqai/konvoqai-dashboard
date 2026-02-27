import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3008';

export async function GET() {
  return NextResponse.redirect(`${BACKEND_URL}/widget/preview`);
}

