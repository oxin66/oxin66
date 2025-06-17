import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Define a function to create the Supabase client for server components/actions
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  // Ensure environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase URL or Anon Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.'
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // The \`set\` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // The \`delete\` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// For Route Handlers or operations requiring service_role key (admin privileges)
// This would typically use a different key stored securely.
// export function createSupabaseAdminClient() {
//   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // This should NOT be public

//   if (!supabaseUrl || !supabaseServiceKey) {
//     throw new Error(
//       'Supabase URL or Service Role Key is missing for admin client.'
//     );
//   }
//   // Note: For admin client, you usually use the main 'supabase' package, not '@supabase/ssr' directly
//   // import { createClient } from '@supabase/supabase-js';
//   // return createClient(supabaseUrl, supabaseServiceKey);
//   console.warn("Admin client setup is placeholder and needs actual implementation with service_role key.");
//   return null; // Placeholder
// }
