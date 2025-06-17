import { type NextRequest, NextResponse } from 'next/server';
// import { createServerClient } from '@supabase/ssr'; // Or your specific Supabase client for middleware
// import { updateSession } from '@/lib/supabase/middleware'; // Example utility for session management

export async function middleware(request: NextRequest) {
  // --- 1. Supabase Session Management (Recommended by @supabase/ssr) ---
  // This is crucial for keeping the user's session updated, especially with Server Components.
  // Example:
  // const { supabase, response } = createSupabaseMiddlewareClient(request); // Custom function to get client & response
  // await supabase.auth.getSession(); // Refreshes the session cookie
  // return response; // Return the response object with updated cookies
  // For now, this is a placeholder. Will need to integrate with src/lib/supabase/server.ts or a dedicated middleware client.
  // console.log('Middleware: Supabase session management would go here.');


  // --- 2. CSRF Protection ---
  // Placeholder for CSRF protection logic.
  // This might involve checking a CSRF token for POST/PUT/DELETE requests.
  // Libraries like 'csurf' are typically for Express; for Next.js, custom implementation or
  // a Next.js-compatible library might be needed.
  // For API routes handled by Next.js, SameSite cookies offer some protection.
  // if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS') {
  //   // const csrfTokenHeader = request.headers.get('X-CSRF-Token');
  //   // const csrfTokenCookie = request.cookies.get('csrf-token')?.value;
  //   // if (!csrfTokenHeader || !csrfTokenCookie || csrfTokenHeader !== csrfTokenCookie) {
  //   //   return NextResponse.json({ message: 'توکن CSRF نامعتبر است' }, { status: 403 });
  //   // }
  //   console.log(\`Middleware: CSRF check for \${request.method} \${request.nextUrl.pathname}\`);
  // }


  // --- 3. Rate Limiting ---
  // Placeholder for rate limiting logic (e.g., using @upstash/ratelimit).
  // This would typically involve checking the request IP or user ID against a counter.
  // Example:
  // const { success } = await ratelimit.limit(request.ip ?? '127.0.0.1');
  // if (!success) {
  //   return NextResponse.json({ message: 'تعداد درخواست‌ها بیش از حد مجاز است' }, { status: 429 });
  // }
  // console.log('Middleware: Rate limiting check would go here.');


  // --- 4. Role-Based Access Control (RBAC) ---
  // Placeholder for RBAC. This will check user roles for protected routes.
  // Example for an admin route:
  // if (request.nextUrl.pathname.startsWith('/admin')) {
  //   // const user = await getUserFromSession(request); // Function to get user (e.g., from Supabase session)
  //   // if (!user || user.role !== 'admin') {
  //   //   return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
  //   // }
  //   console.log('Middleware: Admin route access check for', request.nextUrl.pathname);
  // }
  // Example for a doctor route:
  // if (request.nextUrl.pathname.startsWith('/doctor-panel')) { // Assuming a route like /doctor-panel
  //   // const user = await getUserFromSession(request);
  //   // if (!user || user.role !== 'doctor') {
  //   //   return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
  //   // }
  //   console.log('Middleware: Doctor panel access check for', request.nextUrl.pathname);
  // }


  // --- IMPORTANT: Supabase SSR session update ---
  // According to Supabase docs for Next.js App Router, middleware is key for session management.
  // The createServerClient (from @supabase/ssr) needs to be used here to manage cookies.
  // This is a more concrete example based on Supabase docs:
  /*
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
      },
    },
  });

  // Refresh session if expired - crucial for Server Components
  // await supabase.auth.getSession();
  // This is a simplified version. The actual Supabase middleware might involve creating a response object
  // and passing it along, as shown in their examples, to correctly handle cookie setting.
  // e.g., const { response, data: { session } } = await updateSession(request);
  */

  // For now, just proceed to the requested route.
  // The actual session handling and response manipulation for Supabase will be more involved.
  // console.log(\`Middleware processing: \${request.method} \${request.nextUrl.pathname}\`);
  return NextResponse.next(); // Continue to the next middleware or the route handler
}

// --- Middleware Config (Matcher) ---
// Define which paths the middleware should run on.
// Avoid running middleware on static assets and API routes that don't need it (e.g., _next/static, _next/image, favicon.ico).
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/callback (Supabase callback)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - / (the landing page, if you want it to be public without session checks yet)
     * - /login
     * - /signup
     * - /public (any other public assets)
     *
     * You might want to adjust this based on your auth logic.
     * For example, if all /api routes (except auth) should be protected, include them.
     * If pages like /doctors should be public, exclude them or handle them differently.
     */
    // '/dashboard/:path*',
    // '/appointments/:path*',
    // '/doctor/:path*',
    // '/admin/:path*',
    // '/api/doctors/:path*', // Example of protecting specific API routes
    // '/api/appointments/:path*',
    // '/api/users/:path*',
    // This default matcher runs it on most paths, adjust as needed.
     '/((?!api/auth/|_next/static|_next/image|favicon.ico|images/|fonts/).*)',
  ],
};
