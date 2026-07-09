import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Intercept requests going to the proxy, but skip our own auth route
  if (request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/api/auth/')) {
    const apiKey = request.cookies.get('ice_api_key')?.value;
    const requestHeaders = new Headers(request.headers);
    
    if (apiKey) {
      requestHeaders.set('Authorization', `Bearer ${apiKey}`);
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  return NextResponse.next();
}
