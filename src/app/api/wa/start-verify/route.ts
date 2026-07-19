import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const code = generateCode()

  const serviceRole = createServiceRoleClient()
  const { error } = await serviceRole
    .from('profiles')
    .update({
      wa_verify_code: code,
      wa_verified: false,
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Gagal menyimpan kode verifikasi' }, { status: 500 })
  }

  return NextResponse.json({ code })
}
