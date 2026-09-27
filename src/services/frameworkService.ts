import { supabase } from '@/lib/supabase'

export const frameworkService = {
  async listRequirements(frameworkVersionId: string) {
    if (!supabase) return { data: [], error: null }
    return supabase.from('framework_requirements').select('*').eq('framework_version_id', frameworkVersionId)
  },
}
