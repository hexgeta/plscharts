import { supabase } from '@/supabaseClient'

export const getAudioUrl = async (fileName: string) => {
  try {
    const { data } = await supabase
      .storage
      .from('audio')
      .getPublicUrl(fileName)

    if (data) {
      console.log('Audio URL generated:', fileName);
    }

    return data.publicUrl
  } catch (error) {
    console.error('Error getting audio URL:', error)
    return null
  }
}

// Test function to check Supabase setup
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .storage
      .from('audio')
      .list()

    if (error) {
      console.error('Supabase storage error:', error)
      return false
    }

    console.log('Found files in audio bucket:', data)
    return true
  } catch (error) {
    console.error('Failed to connect to Supabase:', error)
    return false
  }
}

export const listAudioFiles = async () => {
  try {
    const { data, error } = await supabase
      .storage
      .from('audio')
      .list();
    if (error) {
      console.error('Error listing audio files:', error);
      return [];
    }
    return (data || []).filter((f: any) => f.name.endsWith('.mp3')).map((f: any) => f.name);
  } catch (error) {
    console.error('Error listing audio files:', error);
    return [];
  }
} 