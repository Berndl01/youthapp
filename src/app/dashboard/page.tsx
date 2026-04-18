'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function doRedirect() {
      try {
        if (!supabase) { router.push('/login'); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        // Try 1: Read role from profiles table
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'coach' || profile?.role === 'admin') {
          router.push('/dashboard/coach')
          return
        }

        // Try 2: Read role from auth user metadata (set during registration)
        const metaRole = user.user_metadata?.role
        if (metaRole === 'coach' || metaRole === 'admin') {
          router.push('/dashboard/coach')
          return
        }

        // Try 3: Check if user has any coach team memberships
        const { data: coachMemberships } = await supabase
          .from('team_memberships')
          .select('id')
          .eq('user_id', user.id)
          .eq('role_in_team', 'coach')
          .limit(1)
        if (coachMemberships && coachMemberships.length > 0) {
          router.push('/dashboard/coach')
          return
        }

        // Default: player
        router.push('/dashboard/player')
      } catch {
        router.push('/login')
      }
    }
    doRedirect()
  }, [])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="text-4xl mb-4">⏳</div>
        <div style={{ color: 'var(--muted)' }}>Wird geladen...</div>
      </div>
    </div>
  )
}
