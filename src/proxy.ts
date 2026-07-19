import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const protectedRoutes = ['/onboarding', '/dashboard/reports', '/dashboard/settings']
const publicRoutes = ['/login', '/signup', '/forgot-password', '/']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/admin')) {
    const { supabase, supabaseResponse, user } = await updateSession(request)

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return supabaseResponse
  }

  const authCookie = request.cookies.getAll().some((c) =>
    c.name.startsWith('sb-')
  )

  const isProtected = protectedRoutes.some((r) => path.startsWith(r))
  const isPublic = publicRoutes.some((r) => path === r)

  if (isProtected && !authCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublic && authCookie && path !== '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|dashboard$).*)',
  ],
}
