import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SensorData {
  value: number
  unit: string
  timestamp: number
}

interface NodeInfo {
  id: string
  name: string
  type: string
  last_seen?: number
}

export default function NodeDetail() {
  const { id } = useParams()
  const [node, setNode] = useState<NodeInfo | null>(null)
  const [data, setData] = useState<{node_id: string, sensor_type: string, data: SensorData[]}>({
    node_id: '', sensor_type: '', data: []
  })

  useEffect(() => {
    if (id) {
      fetch(`/api/nodes/${id}`)
        .then(res => res.json())
        .then(setNode)
        .catch(() => {})

      fetch(`/api/nodes/${id}/sensors`)
        .then(res => res.json())
        .then(setData)
        .catch(() => {})
    }
  }, [id])

  const chartData = data.data.map(d => ({
    time: new Date(d.timestamp * 1000).toLocaleTimeString(),
    value: d.value,
    unit: d.unit
  })).reverse()

  const isOnline = node?.last_seen && (Date.now() / 1000 - node.last_seen) < 300

  return (
    <div className="pb-20">
      <Link to="/" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] mb-6 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="mono text-sm">BACK TO REGISTRY</span>
      </Link>

      <div className="card p-6 mb-6 relative">
        <div className="corner-decoration corner-tl"></div>
        <div className="corner-decoration corner-tr"></div>
        <div className="corner-decoration corner-bl"></div>
        <div className="corner-decoration corner-br"></div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`led ${isOnline ? 'led-cyan' : 'led-magenta'}`}></div>
              <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-wide">{node?.name || id}</h2>
            <div className="mono text-sm text-[var(--accent-cyan)] mt-1">{node?.id}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] opacity-50">Type</div>
            <div className="mono text-[var(--accent-magenta)]">{node?.type?.toUpperCase() || 'ESP32'}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[var(--bg-secondary)] p-4">
            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-1">Temperature</div>
            <div className="value-display text-2xl">
              {data.data[0]?.value || '--'}
              <span className="text-lg ml-1">{data.data[0]?.unit || '°C'}</span>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-4">
            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-1">Humidity</div>
            <div className="value-display text-2xl">
              {data.data[1]?.value || '--'}
              <span className="text-lg ml-1">{data.data[1]?.unit || '%'}</span>
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-4">
            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] opacity-50 mb-1">Last Update</div>
            <div className="mono text-lg text-[var(--accent-cyan)]">
              {data.data[0]?.timestamp
                ? new Date(data.data[0].timestamp * 1000).toLocaleTimeString()
                : '--:--:--'}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 relative">
        <div className="corner-decoration corner-tl"></div>
        <div className="corner-decoration corner-tr"></div>
        <div className="corner-decoration corner-bl"></div>
        <div className="corner-decoration corner-br"></div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            <span className="text-[var(--accent-magenta)] mr-2">//</span>
            SENSOR DATA
          </h3>
          <div className="mono text-xs text-[var(--text-secondary)]">
            {data.data.length} <span className="opacity-50">RECORDS</span>
          </div>
        </div>

        <div className="h-72">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,212,0.1)" />
                <XAxis dataKey="time" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--accent-cyan)',
                    borderRadius: 0,
                    fontFamily: 'JetBrains Mono'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--accent-cyan)', strokeWidth: 0, r: 3 }}
                  activeDot={{ fill: 'var(--accent-magenta)', strokeWidth: 0, r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="led led-magenta mx-auto mb-4" style={{ width: 12, height: 12 }}></div>
                <div className="mono text-sm text-[var(--text-secondary)]">NO DATA AVAILABLE</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
