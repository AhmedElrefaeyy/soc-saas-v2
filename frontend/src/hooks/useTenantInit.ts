import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useTenantStore } from '@/stores/tenantStore'
import { fetchMyTenants } from '@/api/tenants'
import type { MemberRole } from '@/types/tenant'

export function useTenantInit() {
  const navigate       = useNavigate()
  const location       = useLocation()
  const accessToken    = useAuthStore((s) => s.accessToken)
  const activeTenant   = useTenantStore((s) => s.activeTenant)
  const setAuthTenant  = useAuthStore((s) => s.setActiveTenant)
  const setStoreTenant = useTenantStore((s) => s.setActiveTenant)
  const running        = useRef(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!accessToken) return
    if (activeTenant) return
    if (location.pathname === '/setup') return   // already on setup page
    if (running.current) return
    running.current = true

    fetchMyTenants()
      .then((tenants) => {
        running.current = false
        if (tenants.length === 0) {
          // New user with no workspaces — send to setup
          navigate('/setup', { replace: true })
          return
        }
        const tenant = tenants[0]
        const role: MemberRole = 'owner'
        setStoreTenant(tenant, role)
        setAuthTenant(tenant.id)
      })
      .catch((err) => {
        console.warn('[useTenantInit] fetch failed, will retry:', err)
        running.current = false
        setTimeout(() => setRetryKey((k) => k + 1), 3000)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeTenant, retryKey, location.pathname])
}
