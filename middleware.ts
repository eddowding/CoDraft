import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not signed in and the current path is not /auth, redirect to /auth
  // EXCEPT for public documents that allow anonymous access and API routes
  if (!user && request.nextUrl.pathname !== '/auth' && request.nextUrl.pathname !== '/' && !request.nextUrl.pathname.startsWith('/api/')) {
    // Check if this is a public document that allows anonymous access
    if (request.nextUrl.pathname.startsWith('/public/')) {
      const documentId = request.nextUrl.pathname.split('/')[2]

      if (documentId) {
        try {
          // Check if document allows anonymous access
          const { data: document } = await supabase
            .from('documents')
            .select('is_public, login_not_required')
            .eq('id', documentId)
            .single()

          // Allow access if document is public AND login is not required
          if (document?.is_public && document?.login_not_required) {
            return supabaseResponse
          }
        } catch (error) {
          // If document doesn't exist or error occurs, continue with auth redirect
          console.error('Error checking document access:', error)
        }
      }
    }

    // Default behavior: redirect to auth
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  // If user is signed in and the current path is /auth, redirect to /dashboard
  if (user && request.nextUrl.pathname === '/auth') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}