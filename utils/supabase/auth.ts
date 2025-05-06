import { supabase } from '@/supabaseClient'

export async function getAuthUserCount() {
  try {
    // Query the auth.users table directly with proper RLS policies
    const { count, error } = await supabase
      .from('auth.users')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.error('Error fetching auth user count:', error)
      return null
    }

    return count
  } catch (error) {
    console.error('Error in getAuthUserCount:', error)
    return null
  }
} 