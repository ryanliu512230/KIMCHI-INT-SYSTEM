import { Link } from 'react-router-dom'

interface NodeCardProps {
  node: {
    id: string
    name: string
    type: string
    last_seen?: number
  }
}

export default function NodeCard({ node }: NodeCardProps) {
  const lastSeen = node.last_seen
    ? new Date(node.last_seen * 1000).toLocaleString()
    : 'Never'

  return (
    <Link to={`/node/${node.id}`}>
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-cyan-500 transition">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">{node.name}</h3>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded">{node.type}</span>
        </div>
        <p className="text-slate-400 text-sm">ID: {node.id}</p>
        <p className="text-slate-500 text-xs mt-1">Last seen: {lastSeen}</p>
      </div>
    </Link>
  )
}