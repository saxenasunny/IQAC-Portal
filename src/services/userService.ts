import { supabase } from '@/lib/supabase'
import { catalog, usePortalStore } from '@/store/portalStore'
import type { Profile, UserRole } from '@/types'

export interface PortalUser extends Profile {
  createdAt: string
}

export interface CreatePortalUser {
  email: string
  fullName: string
  password: string
  role: UserRole
  schoolCode?: string
  departmentCode?: string
}

function requireSupabase() {
  if (!supabase) throw new Error('Configure Supabase before managing portal users.')
  return supabase
}

export const userService = {
  async list(): Promise<PortalUser[]> {
    const client = requireSupabase()
    const { data, error } = await client
      .from('profiles')
      .select('id,email,full_name,phone,role,school_id,department_id,is_active,created_at')
      .order('created_at', { ascending: true })
    if (error) throw error
    if (!data?.length) return []

    const schoolIds = [...new Set(data.map((row) => row.school_id).filter((id): id is string => Boolean(id)))]
    const departmentIds = [...new Set(data.map((row) => row.department_id).filter((id): id is string => Boolean(id)))]
    const [schoolsResult, departmentsResult] = await Promise.all([
      schoolIds.length ? client.from('schools').select('id,code').in('id', schoolIds) : Promise.resolve({ data: [], error: null }),
      departmentIds.length ? client.from('departments').select('id,code').in('id', departmentIds) : Promise.resolve({ data: [], error: null }),
    ])
    if (schoolsResult.error) throw schoolsResult.error
    if (departmentsResult.error) throw departmentsResult.error

    const schoolCodeById = new Map((schoolsResult.data ?? []).map((row) => [row.id, row.code]))
    const departmentCodeById = new Map((departmentsResult.data ?? []).map((row) => [row.id, row.code]))
    return data.map((row) => {
      const role = row.role as UserRole
      if (!row.email || !row.full_name) throw new Error('A user profile is missing its email or name.')
      const schoolCode = row.school_id ? schoolCodeById.get(row.school_id) : undefined
      const departmentCode = row.department_id ? departmentCodeById.get(row.department_id) : undefined
      return {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone ?? undefined,
        role,
        schoolId: schoolCode ? catalog.schools.find((school) => school.code === schoolCode)?.id : undefined,
        departmentId: departmentCode ? catalog.departments.find((department) => department.code === departmentCode)?.id : undefined,
        isActive: row.is_active,
        createdAt: row.created_at,
      }
    })
  },

  async create(user: CreatePortalUser): Promise<void> {
    const currentUser = usePortalStore.getState().currentUser
    if (currentUser && currentUser.role !== 'super_admin') {
      throw new Error('Only a super administrator can create portal users.')
    }

    const client = requireSupabase()

    // 1. Try PostgreSQL stored procedure first (direct, zero edge function deployment needed)
    const { data: rpcData, error: rpcError } = await client.rpc('admin_create_portal_user', {
      p_email: user.email,
      p_full_name: user.fullName,
      p_password: user.password,
      p_role: user.role,
      p_school_code: user.schoolCode ?? null,
      p_department_code: user.departmentCode ?? null,
    })

    if (!rpcError && (rpcData as { success?: boolean })?.success) {
      return
    }

    // 2. If RPC not found (PGRST202), fallback to edge function if deployed
    if (rpcError && rpcError.code === 'PGRST202') {
      const { data, error } = await client.functions.invoke('create-portal-user', { body: user })
      if (error) {
        const response = error.context
        if (response instanceof Response) {
          const body = await response.json().catch(() => null) as { error?: string } | null
          throw new Error(body?.error ?? error.message)
        }
        throw error
      }
      if (!data || data.success !== true) throw new Error('The server did not confirm user creation.')
      return
    }

    if (rpcError) {
      throw new Error(rpcError.message)
    }
  },

  async updateStatus(userId: string, isActive: boolean): Promise<void> {
    const client = requireSupabase()
    const { error } = await client
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) throw error
  },
}
