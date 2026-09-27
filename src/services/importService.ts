import { supabase } from '@/lib/supabase'

export const importService = {
  async create(fileName: string, entity: string) {
    if (!supabase) return { data: null, error: null }
    return supabase.from('imports').insert({ file_name: fileName, entity }).select().single()
  },
}
