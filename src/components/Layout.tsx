import { useEffect } from 'react'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { useLeagueState } from '../data/DataProvider'
import type { LeagueData } from '../data/types'
import { Nav } from './Nav'
import { ErrorState, LoadingState } from './StatusStates'

export function useLeague(): LeagueData {
  return useOutletContext<LeagueData>()
}

export function Layout() {
  const { state, retry } = useLeagueState()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Nav />
      <main className="page">
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'error' && <ErrorState detail={state.error.message} onRetry={retry} />}
        {state.status === 'ready' && <Outlet context={state.data} />}
      </main>
      <footer className="footer">
        <div className="wrap footer-inner">
          <span className="lbl mute">Liga Lucu Depok · Fun football tiap weekend</span>
          <span className="lbl gold">Depok · Cibinong · Sekitarnya</span>
        </div>
      </footer>
    </>
  )
}
