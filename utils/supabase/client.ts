import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = 'https://surhzkquxduscyjdiroh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cmh6a3F1eGR1c2N5amRpcm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5NjA0NDUsImV4cCI6MjA0MTUzNjQ0NX0.YbUGtumPQESZTKGRmQavdkbuM0zdMD4LvJwveR4CTcs'

export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
} 