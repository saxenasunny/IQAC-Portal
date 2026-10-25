import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const roles = [
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
] as const

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond(405, { error: 'Only POST is supported.' })

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!url || !anonKey || !serviceRoleKey) {
    return respond(500, { error: 'User management is not configured on the Supabase project.' })
  }
  if (!authorization?.startsWith('Bearer ')) return respond(401, { error: 'Sign in before creating portal users.' })

  let body: {
    email?: unknown
    fullName?: unknown
    password?: unknown
    role?: unknown
    schoolCode?: unknown
    departmentCode?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return respond(400, { error: 'The request body must be valid JSON.' })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const role = body.role
  const schoolCode = typeof body.schoolCode === 'string' ? body.schoolCode.trim() : ''
  const departmentCode = typeof body.departmentCode === 'string' ? body.departmentCode.trim() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond(400, { error: 'Enter a valid email address.' })
  if (!fullName || fullName.length > 150) return respond(400, { error: 'Enter a name of 1 to 150 characters.' })
  if (password.length < 12 || password.length > 128) {
    return respond(400, { error: 'Temporary passwords must be between 12 and 128 characters.' })
  }
  if (typeof role !== 'string' || !roles.includes(role as typeof roles[number])) {
    return respond(400, { error: 'Select a valid portal role.' })
  }
  if (role === 'dean' && !schoolCode) return respond(400, { error: 'Select a school for a dean account.' })
  if ((role === 'hod' || role === 'faculty') && !departmentCode) {
    return respond(400, { error: 'Select a department for this account.' })
  }
  if (!['dean', 'hod', 'faculty'].includes(role) && (schoolCode || departmentCode)) {
    return respond(400, { error: 'This role does not accept a school or department scope.' })
  }

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: callerResult, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerResult.user) return respond(401, { error: 'Your Supabase session is invalid or expired.' })

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: callerProfile, error: profileError } = await admin
    .from('profiles')
    .select('id,full_name,role,is_active')
    .eq('id', callerResult.user.id)
    .single()
  if (profileError || !callerProfile?.is_active || callerProfile.role !== 'super_admin') {
    return respond(403, { error: 'Only an active super administrator can create portal users.' })
  }

  let schoolId: string | null = null
  let departmentId: string | null = null
  if (departmentCode) {
    const { data: department, error } = await admin
      .from('departments')
      .select('id,school_id')
      .eq('code', departmentCode)
      .single()
    if (error || !department) return respond(400, { error: 'The selected department was not found.' })
    departmentId = department.id
    schoolId = department.school_id
  } else if (schoolCode) {
    const { data: school, error } = await admin
      .from('schools')
      .select('id')
      .eq('code', schoolCode)
      .single()
    if (error || !school) return respond(400, { error: 'The selected school was not found.' })
    schoolId = school.id
  }

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createError || !createdUser.user) {
    return respond(400, { error: createError?.message ?? 'Supabase did not create the authentication user.' })
  }

  const { error: insertProfileError } = await admin.from('profiles').insert({
    id: createdUser.user.id,
    email,
    full_name: fullName,
    role,
    school_id: schoolId,
    department_id: departmentId,
    is_active: true,
  })
  if (insertProfileError) {
    const { error: rollbackError } = await admin.auth.admin.deleteUser(createdUser.user.id)
    if (rollbackError) {
      return respond(500, {
        error: `The profile could not be created, and Supabase could not remove the incomplete auth user. Contact an administrator. ${rollbackError.message}`,
      })
    }
    return respond(400, { error: insertProfileError.message })
  }

  const { error: auditError } = await admin.from('audit_logs').insert({
    actor_id: callerResult.user.id,
    actor_name: callerProfile.full_name,
    action: 'Created portal user',
    entity: 'Profile',
    entity_id: createdUser.user.id,
    new_value: { email, role, school_id: schoolId, department_id: departmentId },
  })
  if (auditError) {
    const { error: deleteProfileError } = await admin.from('profiles').delete().eq('id', createdUser.user.id)
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(createdUser.user.id)
    if (deleteProfileError || deleteAuthError) {
      return respond(500, { error: 'User creation could not be audited or safely rolled back. Contact an administrator.' })
    }
    return respond(500, { error: 'The user was not created because the audit record could not be saved.' })
  }

  return respond(201, { success: true, userId: createdUser.user.id })
})
