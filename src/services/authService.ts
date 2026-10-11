import { supabase } from '@/lib/supabase'
import { catalog } from '@/store/portalStore'
import type { Profile, UserRole } from '@/types'

const USER_ROLES: UserRole[] = [
  'super_admin',
  'iqac_admin',
  'iqac_viewer',
  'registrar',
  'dean',
  'hod',
  'faculty',
  'data_entry',
  'verifier',
  'auditor',
]

function toProfile(row: Record<string, unknown>): Profile {
  if (typeof row.id !== 'string' || typeof row.email !== 'string' || typeof row.full_name !== 'string') {
    throw new Error('Your Supabase profile is missing required identity fields.')
  }
  if (typeof row.role !== 'string' || !USER_ROLES.includes(row.role as UserRole)) {
    throw new Error('Your Supabase profile has an unsupported role.')
  }
  if (row.is_active === false) throw new Error('This account is inactive. Contact your administrator.')

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: typeof row.phone === 'string' ? row.phone : undefined,
    role: row.role as UserRole,
    schoolId: typeof row.school_id === 'string' ? row.school_id : undefined,
    departmentId: typeof row.department_id === 'string' ? row.department_id : undefined,
    isActive: row.is_active !== false,
  }
}

export const authService = {
  async profileForUser(userId: string): Promise<Profile> {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,role,school_id,department_id,is_active')
      .eq('id', userId)
      .single()
    if (error) throw error
    const row = data as Record<string, unknown>
    if (typeof row.school_id === 'string') {
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('code')
        .eq('id', row.school_id)
        .single()
      if (schoolError) throw schoolError
      const schoolId = catalog.schools.find((item) => item.code === school.code)?.id
      if (!schoolId) throw new Error('Your profile references a school that is not in the portal catalogue.')
      row.school_id = schoolId
    }
    if (typeof row.department_id === 'string') {
      const { data: department, error: departmentError } = await supabase
        .from('departments')
        .select('code')
        .eq('id', row.department_id)
        .single()
      if (departmentError) throw departmentError
      const departmentId = catalog.departments.find((item) => item.code === department.code)?.id
      if (!departmentId) throw new Error('Your profile references a department that is not in the portal catalogue.')
      row.department_id = departmentId
    }
    return toProfile(row)
  },

  async signIn(email: string, password: string): Promise<Profile> {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user) throw new Error('Supabase did not return an authenticated user.')
    try {
      return await this.profileForUser(data.user.id)
    } catch (profileError) {
      await supabase.auth.signOut()
      throw profileError
    }
  },

  async signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}
