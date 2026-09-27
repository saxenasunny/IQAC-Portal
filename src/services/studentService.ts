import { supabase } from '@/lib/supabase'
import type { Student } from '@/types'

export const studentService = {
  async list(params: { q?: string; departmentId?: string; limit?: number; offset?: number }) {
    if (!supabase) return { data: [] as Student[], error: null }
    let query = supabase.from('students').select('*', { count: 'exact' }).eq('is_archived', false)
    if (params.departmentId) query = query.eq('department_id', params.departmentId)
    if (params.q) {
      query = query.or(`full_name.ilike.%${params.q}%,registration_id.ilike.%${params.q}%`)
    }
    const { data, error } = await query.range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 25) - 1)
    return { data: data ?? [], error }
  },
}
