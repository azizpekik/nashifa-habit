import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const protectedRoutes = ['/onboarding', '/dashboard', '/dashboard/reports', '/dashboard/settings']
const publicRoutes = ['/login', '/signup', '/forgot-password', '/']

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const path = request.nextUrl.pathname
  const isProtected = protectedRoutes.some((r) => path.startsWith(r))
  const isPublic = publicRoutes.some((r) => path === r)

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublic && user && path !== '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
