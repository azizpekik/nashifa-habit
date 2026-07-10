import { type NextRequest, NextResponse } from 'next/server'

const protectedRoutes = ['/onboarding', '/dashboard/reports', '/dashboard/settings']
const publicRoutes = ['/login', '/signup', '/forgot-password', '/']

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  const authCookie = request.cookies.get('sb-orowixgzamdvrzloumpx-auth-token')

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
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
