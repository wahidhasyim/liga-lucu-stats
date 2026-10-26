import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadLeague } from './sheets'
import type { LeagueData } from './types'

export type LeagueState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: LeagueData }

interface LeagueContextValue {
  state: LeagueState
  retry: () => void
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LeagueState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    loadLeague().then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (error: unknown) => !cancelled && setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return <LeagueContext.Provider value={{ state, retry }}>{children}</LeagueContext.Provider>
}

export function useLeagueState(): LeagueContextValue {
  const ctx = useContext(LeagueContext)
  if (!ctx) throw new Error('useLeagueState harus dipakai di dalam DataProvider')
  return ctx
}
