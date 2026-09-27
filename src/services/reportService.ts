import { supabase } from '@/lib/supabase'

export const reportService = {
  async studentCountsByProgramme() {
    if (!supabase) return { data: [], error: null }
    return supabase.from('students').select('programme_id')
  },
}
