import { createBrowserClient } from '@supabase/ssr';

// Define a function to create the Supabase client for browser components
export function createClient() {
  // Ensure environment variables are defined
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase URL or Anon Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
