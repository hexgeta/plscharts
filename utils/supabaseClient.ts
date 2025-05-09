import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create a client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create a client with admin privileges for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

// Helper function to get the appropriate client based on context
export const getSupabaseClient = (useAdmin = false) => {
  return useAdmin ? supabaseAdmin : supabase
} 