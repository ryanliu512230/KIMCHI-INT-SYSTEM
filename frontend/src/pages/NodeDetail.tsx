import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SensorData {
  value: number
  unit: string
  timestamp: number
}

export default function NodeDetail() {
  const { id } = useParams()
  const [data, setData] = useState<{node_id: string, sensor_type: string, data: SensorData[]}>({
    node_id: '', sensor_type: '', data: []
  })

  useEffect(() => {
    if (id) {
      fetch(`/api/nodes/${id}/sensors`)
        .then(res => res.json())
        .then(setData)
    }
  }, [id])

  const chartData = data.data.map(d => ({
    time: new Date(d.timestamp * 1000).toLocaleTimeString(),
    value: d.value,
    unit: d.unit
  }))

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Node: {id}</h2>
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Sensor: {data.sensor_type}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}