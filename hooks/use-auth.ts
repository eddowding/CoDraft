'use client'

import { useQuery } from '@tanstack/react-query'
import { createClientSupabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

/**
 * Hook to get the current authenticated user with React Query caching
 * Cached for 30 seconds by default
 */
export function useAuth() {
  const supabase = createClientSupabase()

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async (): Promise<User | null> => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
  }
}
