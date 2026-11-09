import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { parseLeague } from './parse'
import { langganTabel } from './tabel'
import type { LeagueData } from './types'

export type LeagueState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: LeagueData }

interface LeagueContextValue {
  state: LeagueState
  retry: () => void
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

// Berlangganan data: perubahan dari admin langsung muncul tanpa muat ulang.
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LeagueState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setState({ status: 'loading' })
    return langganTabel({
      data: (t) => setState({ status: 'ready', data: parseLeague(t) }),
      error: (error) => setState({ status: 'error', error }),
    })
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return <LeagueContext.Provider value={{ state, retry }}>{children}</LeagueContext.Provider>
}

export function useLeagueState(): LeagueContextValue {
  const ctx = useContext(LeagueContext)
  if (!ctx) throw new Error('useLeagueState harus dipakai di dalam DataProvider')
  return ctx
}
