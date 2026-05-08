import { useEffect, useState } from 'react'
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
    return <div className="text-slate-400">Loading...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Nodes</h2>
      {nodes.length === 0 ? (
        <p className="text-slate-500">No nodes registered</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map(node => (
            <NodeCard key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  )
}