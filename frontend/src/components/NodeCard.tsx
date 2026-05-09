import { Link } from 'react-router-dom'

interface Node {
  id: string
  name: string
  type: string
  last_seen?: number
}

interface NodeCardProps {
  node: Node
  index?: number
}

export default function NodeCard({ node, index = 0 }: NodeCardProps) {
  const lastSeen = node.last_seen
    ? new Date(node.last_seen * 1000).toLocaleString()
    : null

  const isOnline = lastSeen && (Date.now() / 1000 - node.last_seen) < 300

  return (
    <Link to={`/node/${node.id}`}>
      <div className="card p-6 relative animate-slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
        <div className="corner-decoration corner-tl"></div>
        <div className="corner-decoration corner-tr"></div>
        <div className="corner-decoration corner-bl"></div>
        <div className="corner-decoration corner-br"></div>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`led ${isOnline ? 'led-cyan' : 'led-magenta'}`}></div>
            <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div className="mono text-xs text-[var(--text-secondary)] opacity-50">
            #{String(index + 1).padStart(3, '0')}
          </div>
        </div>

        <h3 className="text-xl font-bold mb-1 tracking-wide">{node.name}</h3>
        <div className="mono text-xs text-[var(--accent-cyan)] mb-4">{node.id}</div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="text-[var(--text-secondary)] text-xs uppercase tracking-widest opacity-50">Type</div>
            <div className="mono text-[var(--accent-magenta)]">{node.type.toUpperCase()}</div>
          </div>
          <div className="text-right">
            <div className="text-[var(--text-secondary)] text-xs uppercase tracking-widest opacity-50">Last Seen</div>
            <div className="mono text-xs">
              {lastSeen ? (
                <span className={isOnline ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-secondary)]'}>
                  {lastSeen.split(' ')[1]}
                </span>
              ) : (
                <span className="text-[var(--accent-magenta)]">NEVER</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[rgba(0,245,212,0.1)]">
          <div className="flex items-center justify-between">
            <span className="mono text-xs text-[var(--text-secondary)] opacity-50">VIEW DETAILS</span>
            <svg className="w-4 h-4 text-[var(--accent-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}
