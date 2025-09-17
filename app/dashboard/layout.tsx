import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return <>{children}</>
}

