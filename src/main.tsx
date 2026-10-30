import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { NotFound } from './components/StatusStates'
import { DataProvider } from './data/DataProvider'
import { mulaiAnalytics } from './lib/analytics'
import Home from './pages/Home'
import PlayerProfile from './pages/PlayerProfile'
import Players from './pages/Players'
import SessionDetail from './pages/SessionDetail'
import Sessions from './pages/Sessions'
import Stats from './pages/Stats'
import './styles/tokens.css'
import './styles/global.css'

// Analytics gagal dimuat (misalnya diblokir ad blocker) tidak boleh mengganggu web.
mulaiAnalytics().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="statistik" element={<Stats />} />
            <Route path="pemain" element={<Players />} />
            <Route path="pemain/:id" element={<PlayerProfile />} />
            <Route path="sesi" element={<Sessions />} />
            <Route path="sesi/:id" element={<SessionDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  </StrictMode>,
)
