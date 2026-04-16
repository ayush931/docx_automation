import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter for Edge runtime.
// Note: In a real serverless/edge deployment, this map will be isolated per instance/isolate
// and reset frequently. For a robust solution without external dependencies in a single Node server, 
// this works. Since the prompt asks for no external API keys, this is the best self-contained approach.
const ipRequestMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

export function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    const now = Date.now();
    const requestData = ipRequestMap.get(ip);
    
    if (requestData) {
      if (now - requestData.timestamp > RATE_LIMIT_WINDOW) {
        ipRequestMap.set(ip, { count: 1, timestamp: now });
      } else {
        requestData.count += 1;
        if (requestData.count > MAX_REQUESTS) {
          return NextResponse.json(
            { error: 'Too many requests', code: 'RATE_LIMITED' },
            { status: 429 }
          );
        }
      }
    } else {
      ipRequestMap.set(ip, { count: 1, timestamp: now });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
