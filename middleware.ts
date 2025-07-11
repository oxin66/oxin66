import { type NextRequest, NextResponse } from 'next/server';
// import { createServerClient } from '@supabase/ssr'; // Or your specific Supabase client for middleware
// import { updateSession } from '@/lib/supabase/middleware'; // Example utility for session management

export async function middleware(request: NextRequest) {
  // --- 1. Supabase Session Management (Recommended by @supabase/ssr) ---
  // This is crucial for keeping the user's session updated, especially with Server Components.
  // Example:
  // This function `updateSession` is recommended by Supabase for App Router.
  // It refreshes the session cookie and handles the request/response cycle for cookies.
  // You might need to create this utility or adapt it from Supabase examples.
  // For now, let's use the more direct approach with createServerClient as shown in Supabase docs.

  const res = NextResponse.next(); // Get the response object to modify its headers for cookies

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Middleware: Supabase URL or Anon Key is not defined.");
    // Potentially redirect to an error page or return a specific error response
    return NextResponse.json({ message: "پیکربندی سرور ناقص است." }, { status: 500 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // If the cookie is set, add it to the NextResponse to send it back to the client
        request.cookies.set({ name, value, ...options }); // Update request cookies for current processing
        res.cookies.set({ name, value, ...options });    // Update response cookies to send to browser
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        res.cookies.set({ name, value: '', ...options });
      },
    },
  });

  // Refresh session if expired - crucial for Server Components
  const { data: { session } } = await supabase.auth.getSession();

  // --- Role-Based Access Control (RBAC) ---
  const { pathname } = request.nextUrl;

  // Public paths that do not require authentication
  const publicPaths = ['/', '/login', '/signup', '/api/auth/callback'];

  if (publicPaths.includes(pathname) || pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.endsWith('.ico') || pathname.endsWith('.svg') || pathname.endsWith('.png')) {
    return res; // Allow access to public paths and static assets
  }

  // If no session and path is not public, redirect to login
  if (!session) {
    if (!publicPaths.includes(pathname) && !pathname.startsWith('/api/')) { // Don't redirect API calls usually, let them handle auth
        console.log(`Middleware: No session, redirecting from ${pathname} to /login`);
        return NextResponse.redirect(new URL(`/login?message=لطفا ابتدا وارد شوید&redirectedFrom=${pathname}`, request.url));
    }
    // For API routes (not auth callback), if no session, let the API route handle it or return 401
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
        return NextResponse.json({ message: 'دسترسی غیرمجاز، نیاز به ورود.' }, { status: 401 });
    }
    return res; // Allow access to auth API routes or other specific public API routes
  }

  // If there IS a session, proceed with role-based checks for dashboard routes
  if (session) {
    // Fetch user's role from your 'profiles' table
    // Note: Calling DB from middleware can add latency. Consider alternatives for high-traffic apps
    // (e.g., storing role in JWT custom claims if possible with Supabase, or a faster cache).
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116: 0 rows (profile might not exist yet)
      console.error('Middleware: Error fetching profile:', profileError.message);
      // Potentially redirect to an error page or allow access with unknown role
    }

    const userRole = profile?.role;

    if (pathname.startsWith('/dashboard/user')) {
      if (userRole !== 'user' && userRole !== 'admin') { // Assuming admin can access user dashboard
        console.log(`Middleware: Unauthorized access to /dashboard/user for role: ${userRole}`);
        return NextResponse.redirect(new URL('/?error=unauthorized_dashboard', request.url)); // Or a specific unauthorized page
      }
    } else if (pathname.startsWith('/dashboard/chef')) {
      if (userRole !== 'chef' && userRole !== 'admin') { // Assuming admin can access chef dashboard
        console.log(`Middleware: Unauthorized access to /dashboard/chef for role: ${userRole}`);
        return NextResponse.redirect(new URL('/?error=unauthorized_dashboard', request.url));
      }
    } else if (pathname.startsWith('/dashboard/admin')) {
      if (userRole !== 'admin') {
        console.log(`Middleware: Unauthorized access to /dashboard/admin for role: ${userRole}. Redirecting.`);
        return NextResponse.redirect(new URL('/?error=admin_only_access_denied', request.url)); // Redirect to home with a specific error
      }
    }

    // If user is logged in and tries to access /login or /signup, redirect them to their dashboard or home
    if (pathname === '/login' || pathname === '/signup') {
        if (userRole === 'user') return NextResponse.redirect(new URL('/dashboard/user', request.url));
        if (userRole === 'chef') return NextResponse.redirect(new URL('/dashboard/chef', request.url));
        // if (userRole === 'admin') return NextResponse.redirect(new URL('/dashboard/admin', request.url));
        return NextResponse.redirect(new URL('/', request.url)); // Fallback to home
    }
  }

  return res; // Return the response object with updated cookies


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
