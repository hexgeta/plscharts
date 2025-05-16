import { createClient } from '@supabase/supabase-js'

console.log('Environment check:', {
  hasSupabaseUrl: !!process.env.SUPABASE_URL,
  hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
  nodeEnv: process.env.NODE_ENV
})

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required')
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is required')
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Create a client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to get the client
export const getSupabaseClient = () => supabase 