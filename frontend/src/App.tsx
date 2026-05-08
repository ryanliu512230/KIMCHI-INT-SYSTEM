import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NodeDetail from './pages/NodeDetail'
import ControlPanel from './pages/ControlPanel'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900">
        <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-cyan-400">ESP32 System</h1>
            <div className="flex gap-4">
              <a href="/" className="hover:text-cyan-400 transition">Dashboard</a>
              <a href="/control" className="hover:text-cyan-400 transition">Control</a>
            </div>
          </div>
        </nav>
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/node/:id" element={<NodeDetail />} />
            <Route path="/control" element={<ControlPanel />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App