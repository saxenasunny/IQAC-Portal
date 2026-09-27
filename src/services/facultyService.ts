import { supabase } from '@/lib/supabase'

export const facultyService = {
  async list() {
    if (!supabase) return { data: [], error: null }
    return supabase.from('faculty').select('*').eq('is_active', true)
  },
}
