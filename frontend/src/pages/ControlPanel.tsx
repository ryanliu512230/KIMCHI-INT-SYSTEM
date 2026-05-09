import { useEffect, useState } from 'react'

interface Node {
  id: string
  name: string
  type: string
}

export default function ControlPanel() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [selectedNode, setSelectedNode] = useState<string>('')
  const [command, setCommand] = useState({ actuator: 'relay_1', value: false })
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(setNodes)
  }, [])

  const sendCommand = async () => {
    if (!selectedNode) return

    setLoading(true)
    setStatus('sending')

    try {
      const response = await fetch(`/api/nodes/${selectedNode}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'set_actuator',
          actuator: command.actuator,
          value: command.value
        })
      })

      if (response.ok) {
        setStatus('success')
        setTimeout(() => setStatus(''), 2000)
      } else {
        setStatus('error')
        setTimeout(() => setStatus(''), 2000)
      }
    } catch {
      setStatus('error')
      setTimeout(() => setStatus(''), 2000)
    } finally {
      setLoading(false)
    }
  }

  const actuators = [
    { id: 'relay_1', name: 'RELAY_01', description: 'Primary Relay Channel' },
    { id: 'relay_2', name: 'RELAY_02', description: 'Secondary Relay Channel' },
    { id: 'pwm_1', name: 'PWM_OUT', description: 'Pulse Width Modulation' },
  ]

  const selectedNodeData = nodes.find(n => n.id === selectedNode)

  return (
    <div className="pb-20">
      <div className="mb-8">
        <h2 className="text-lg font-bold tracking-widest text-[var(--text-secondary)] uppercase">
          <span className="text-[var(--accent-magenta)] mr-2">//</span>
          ACTUATOR CONTROL INTERFACE
        </h2>
        <div className="h-1 w-24 bg-gradient-to-r from-[var(--accent-cyan)] to-transparent mt-2"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 relative">
          <div className="corner-decoration corner-tl"></div>
          <div className="corner-decoration corner-tr"></div>
          <div className="corner-decoration corner-bl"></div>
          <div className="corner-decoration corner-br"></div>

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold tracking-widest text-[var(--text-secondary)] uppercase">TARGET SELECTION</h3>
            <div className={`led ${selectedNode ? 'led-cyan' : 'led-magenta'}`}></div>
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-2">Node ID</label>
            <select
              className="w-full bg-[var(--bg-secondary)] border border-[rgba(0,245,212,0.2)] px-4 py-3 mono text-sm focus:border-[var(--accent-cyan)] outline-none transition"
              value={selectedNode}
              onChange={e => setSelectedNode(e.target.value)}
            >
              <option value="">-- SELECT NODE --</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.name} [{n.id}]</option>
              ))}
            </select>
          </div>

          {selectedNodeData && (
            <div className="bg-[var(--bg-secondary)] p-4 mb-6">
              <div className="mono text-xs text-[var(--text-secondary)] opacity-50 mb-1">SELECTED TARGET</div>
              <div className="flex items-center gap-2">
                <div className="led led-cyan"></div>
                <span className="font-bold">{selectedNodeData.name}</span>
              </div>
              <div className="mono text-xs text-[var(--accent-cyan)] mt-1">{selectedNodeData.id}</div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-3">ACTUATOR</label>
            <div className="space-y-2">
              {actuators.map(act => (
                <label
                  key={act.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition border ${
                    command.actuator === act.id
                      ? 'border-[var(--accent-cyan)] bg-[rgba(0,245,212,0.1)]'
                      : 'border-[rgba(0,245,212,0.1)] hover:border-[var(--accent-cyan)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="actuator"
                    value={act.id}
                    checked={command.actuator === act.id}
                    onChange={e => setCommand({ ...command, actuator: e.target.value })}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 flex items-center justify-center ${
                    command.actuator === act.id ? 'border-[var(--accent-cyan)]' : 'border-[var(--text-secondary)]'
                  }`}>
                    {command.actuator === act.id && (
                      <div className="w-2 h-2 bg-[var(--accent-cyan)]"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{act.name}</div>
                    <div className="mono text-xs text-[var(--text-secondary)] opacity-50">{act.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-3">STATE</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="value"
                  checked={command.value === true}
                  onChange={() => setCommand({ ...command, value: true })}
                  className="sr-only"
                />
                <div className={`w-6 h-6 border-2 flex items-center justify-center ${
                  command.value === true ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]' : 'border-[var(--text-secondary)]'
                }`}>
                  {command.value === true && (
                    <svg className="w-4 h-4 text-[var(--bg-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="mono text-sm">ON</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="value"
                  checked={command.value === false}
                  onChange={() => setCommand({ ...command, value: false })}
                  className="sr-only"
                />
                <div className={`w-6 h-6 border-2 flex items-center justify-center ${
                  command.value === false ? 'border-[var(--accent-magenta)] bg-[var(--accent-magenta)]' : 'border-[var(--text-secondary)]'
                }`}>
                  {command.value === false && (
                    <svg className="w-4 h-4 text-[var(--bg-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <span className="mono text-sm">OFF</span>
              </label>
            </div>
          </div>

          <button
            onClick={sendCommand}
            disabled={!selectedNode || loading}
            className={`btn-primary w-full py-4 text-lg ${(!selectedNode || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'TRANSMITTING...' : 'SEND COMMAND'}
          </button>

          {status === 'success' && (
            <div className="mt-4 p-3 bg-[rgba(0,245,212,0.1)] border border-[var(--accent-cyan)]">
              <div className="flex items-center gap-2">
                <div className="led led-cyan"></div>
                <span className="mono text-sm text-[var(--accent-cyan)]">COMMAND EXECUTED SUCCESSFULLY</span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 p-3 bg-[rgba(247,37,133,0.1)] border border-[var(--accent-magenta)]">
              <div className="flex items-center gap-2">
                <div className="led led-magenta"></div>
                <span className="mono text-sm text-[var(--accent-magenta)]">TRANSMISSION FAILED</span>
              </div>
            </div>
          )}
        </div>

        <div className="card p-6 relative">
          <div className="corner-decoration corner-tl"></div>
          <div className="corner-decoration corner-tr"></div>
          <div className="corner-decoration corner-bl"></div>
          <div className="corner-decoration corner-br"></div>

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold tracking-widest text-[var(--text-secondary)] uppercase">TRANSMISSION LOG</h3>
            <div className="led led-cyan"></div>
          </div>

          <div className="space-y-3 mono text-xs">
            <div className="p-3 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[var(--accent-cyan)]">[00:00:00]</span>
                <span className="badge badge-online">READY</span>
              </div>
              <div className="text-[var(--text-secondary)] opacity-70">System initialized - awaiting commands</div>
            </div>

            {selectedNode && (
              <div className="p-3 bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[var(--accent-cyan)]">[TARGET SET]</span>
                  <span className="badge badge-online">OK</span>
                </div>
                <div className="text-[var(--text-secondary)] opacity-70">
                  Node: {selectedNode} | Actuator: {command.actuator}
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="p-3 bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[var(--accent-cyan)]">[{new Date().toLocaleTimeString()}]</span>
                  <span className="badge badge-online">SUCCESS</span>
                </div>
                <div className="text-[var(--text-secondary)] opacity-70">
                  Command: SET_{command.actuator.toUpperCase()} = {command.value ? 'ON' : 'OFF'}
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="p-3 bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[var(--accent-magenta)]">[{new Date().toLocaleTimeString()}]</span>
                  <span className="badge badge-offline">FAILED</span>
                </div>
                <div className="text-[var(--text-secondary)] opacity-70">
                  Connection timeout - retrying...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
