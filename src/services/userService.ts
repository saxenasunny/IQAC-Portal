import { supabase } from '@/lib/supabase'

export const userService = {
  async currentProfile() {
    if (!supabase) return { data: null, error: null }
    const { data: session } = await supabase.auth.getUser()
    if (!session.user) return { data: null, error: null }
    return supabase.from('profiles').select('*').eq('id', session.user.id).single()
  },
}
