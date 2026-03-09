import { NextRequest, NextResponse } from "next/server";

export async function webhookLogger(req: NextRequest) {
  // Generate a unique request ID
  const requestId = Math.random().toString(36).substring(2, 15);

  console.log(`[${requestId}] Webhook received: ${req.method} ${req.url}`);
  console.log(
    `[${requestId}] Headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}`
  );

  // Clone the request to read its body without consuming it
  const clonedReq = req.clone();
  try {
    const body = await clonedReq.text();
    console.log(`[${requestId}] Body preview: ${body.substring(0, 200)}...`);
  } catch (error) {
    console.log(`[${requestId}] Could not read body: ${error}`);
  }

  // Continue processing the request
  return NextResponse.next();
}
