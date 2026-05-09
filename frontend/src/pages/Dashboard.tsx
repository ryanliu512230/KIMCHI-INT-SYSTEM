import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import NodeCard from '../components/NodeCard'

interface Node {
  id: string
  name: string
  type: string
  last_seen?: number
}

export default function Dashboard() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(data => {
        setNodes(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="led led-cyan mx-auto mb-4" style={{ width: 20, height: 20 }}></div>
          <div className="mono text-[var(--text-secondary)]">INITIALIZING SENSORS...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            <span className="text-[var(--accent-magenta)] mr-2">//</span>
            NODE REGISTRY
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-[var(--accent-cyan)] to-transparent mt-2"></div>
        </div>
        <div className="mono text-sm text-[var(--text-secondary)]">
          <span className="opacity-50">REGISTERED:</span>
          <span className="text-[var(--accent-cyan)] ml-2">{nodes.length}</span>
          <span className="opacity-50 ml-1">UNITS</span>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="card p-12 text-center relative">
          <div className="corner-decoration corner-tl"></div>
          <div className="corner-decoration corner-tr"></div>
          <div className="corner-decoration corner-bl"></div>
          <div className="corner-decoration corner-br"></div>

          <div className="led led-magenta mx-auto mb-6" style={{ width: 16, height: 16 }}></div>
          <h3 className="text-xl font-bold text-[var(--text-secondary)] mb-2">NO NODES DETECTED</h3>
          <p className="mono text-sm text-[var(--text-secondary)] opacity-70">
            Waiting for ESP32 devices to connect to the network...
          </p>
          <div className="mt-6 text-xs mono text-[var(--accent-magenta)]">
            TIP: Check WiFi connection and MQTT broker status
          </div>
        </div>
      ) : (
        <div className="grid-responsive stagger-children">
          {nodes.map((node, idx) => (
            <NodeCard key={node.id} node={node} index={idx} />
          ))}
        </div>
      )}

      <div className="mt-8 card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            SYSTEM LOG
          </h3>
          <div className="flex items-center gap-2">
            <div className="led led-cyan"></div>
            <span className="mono text-xs text-[var(--accent-cyan)]">LIVE</span>
          </div>
        </div>
        <div className="mono text-xs text-[var(--text-secondary)] space-y-1 opacity-70">
          <div>[{new Date().toLocaleTimeString()}] System initialized</div>
          <div>[{new Date().toLocaleTimeString()}] MQTT broker: connected</div>
          <div>[{new Date().toLocaleTimeString()}] Waiting for node registration...</div>
        </div>
      </div>
    </div>
  )
}
