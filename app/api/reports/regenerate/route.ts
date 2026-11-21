import { NextRequest, NextResponse } from 'next/server';
import { POST as handleReportPost } from '../route';

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> }
): Promise<NextResponse> {
  return handleReportPost(req, context);
}
