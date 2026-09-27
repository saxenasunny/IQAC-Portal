import { supabase } from '@/lib/supabase'

export const documentService = {
  async list() {
    if (!supabase) return { data: [], error: null }
    return supabase.from('documents').select('*').order('created_at', { ascending: false })
  },
}
