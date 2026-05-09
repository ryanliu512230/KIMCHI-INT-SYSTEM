import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import NodeDetail from './pages/NodeDetail'
import ControlPanel from './pages/ControlPanel'

function NavBar() {
  const location = useLocation()

  return (
    <nav className="navbar fixed top-0 left-0 right-0 z-50 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="led led-cyan"></div>
          <h1 className="text-2xl font-bold tracking-wider">
            <span className="text-[var(--accent-cyan)]">ESP</span>
            <span className="text-[var(--text-secondary)]">32</span>
            <span className="text-[var(--accent-magenta)]">NET</span>
          </h1>
        </div>

        <div className="flex items-center gap-8">
          <Link to="/" className={`nav-link text-lg font-semibold tracking-wide ${location.pathname === '/' ? 'text-[var(--accent-cyan)]' : ''}`}>
            <span className="mr-2 opacity-50">01</span> DASHBOARD
          </Link>
          <Link to="/control" className={`nav-link text-lg font-semibold tracking-wide ${location.pathname === '/control' ? 'text-[var(--accent-cyan)]' : ''}`}>
            <span className="mr-2 opacity-50">02</span> CONTROL
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="led led-cyan"></div>
            <span className="mono text-sm text-[var(--text-secondary)]">ONLINE</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

function SystemStatus() {
  const [stats, setStats] = useState({ nodes: 0, sensors: 0, commands: 0 })

  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(data => setStats(s => ({ ...s, nodes: data.length })))
      .catch(() => {})
  }, [])

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <div className="card p-4 relative">
        <div className="corner-decoration corner-tl"></div>
        <div className="corner-decoration corner-tr"></div>
        <div className="corner-decoration corner-bl"></div>
        <div className="corner-decoration corner-br"></div>
        <div className="text-[var(--text-secondary)] text-sm uppercase tracking-widest mb-2">Total Nodes</div>
        <div className="value-display">{stats.nodes}</div>
      </div>
      <div className="card p-4 relative">
        <div className="corner-decoration corner-tl"></div>
        <div className="corner-decoration corner-tr"></div>
        <div className="corner-decoration corner-bl"></div>
        <div className="corner-decoration corner-br"></div>
        <div className="text-[var(--text-secondary)] text-sm uppercase tracking-widest mb-2">Active Sensors</div>
        <div className="value-display">{stats.sensors}</div>
      </div>
      <div className="card p-4 relative">
        <div className="corner-decoration corner-tl"></div>
        <div className="corner-decoration corner-tr"></div>
        <div className="corner-decoration corner-bl"></div>
        <div className="corner-decoration corner-br"></div>
        <div className="text-[var(--text-secondary)] text-sm uppercase tracking-widest mb-2">Commands Sent</div>
        <div className="value-display">{stats.commands}</div>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-grid pt-20">
        <NavBar />
        <main className="p-8 max-w-7xl mx-auto">
          <SystemStatus />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/node/:id" element={<NodeDetail />} />
            <Route path="/control" element={<ControlPanel />} />
          </Routes>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 navbar px-8 py-3">
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <div className="mono">
              <span className="opacity-50">SYS://</span> ESP32_NETWORK_CONTROLLER
            </div>
            <div className="flex items-center gap-4">
              <span className="mono">MQTT: <span className="text-[var(--accent-cyan)]">CONNECTED</span></span>
              <span className="mono">UPTIME: <span className="text-[var(--accent-cyan)]">ACTIVE</span></span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
