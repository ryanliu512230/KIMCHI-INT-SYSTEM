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

  useEffect(() => {
    fetch('/api/nodes')
      .then(res => res.json())
      .then(setNodes)
  }, [])

  const sendCommand = async () => {
    if (!selectedNode) return
    await fetch(`/api/nodes/${selectedNode}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'set_actuator',
        actuator: command.actuator,
        value: command.value
      })
    })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Control Panel</h2>
      <div className="bg-slate-800 rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-sm mb-2">Select Node</label>
          <select
            className="w-full bg-slate-700 rounded px-3 py-2"
            value={selectedNode}
            onChange={e => setSelectedNode(e.target.value)}
          >
            <option value="">-- Select --</option>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-2">Actuator</label>
          <select
            className="w-full bg-slate-700 rounded px-3 py-2"
            value={command.actuator}
            onChange={e => setCommand({ ...command, actuator: e.target.value })}
          >
            <option value="relay_1">Relay 1</option>
            <option value="relay_2">Relay 2</option>
            <option value="pwm_1">PWM 1</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-2">Value</label>
          <input
            type="checkbox"
            checked={command.value}
            onChange={e => setCommand({ ...command, value: e.target.checked })}
            className="w-5 h-5"
          />
        </div>
        <button
          onClick={sendCommand}
          disabled={!selectedNode}
          className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 px-4 py-2 rounded transition"
        >
          Send Command
        </button>
      </div>
    </div>
  )
}