# ESP32 MQTT 主控系統實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個使用 ESP32S3 主控搭配多個 ESP32C3 節點的 MQTT 系統，包含完整的 Docker 部署、前後端和韌體。

**Architecture:** 使用 Eclipse Mosquitto 作為 MQTT Broker，FastAPI 後端處理 API 和 WebSocket，React 前端提供儀表板。ESP32 使用 PlatformIO 開發。

**Tech Stack:** Python FastAPI, React + Vite + TailwindCSS, Eclipse Mosquitto, PlatformIO, SQLite

---

## 檔案結構

```
ESP32-MQTT-System/
├── docker-compose.yml
├── mosquitto/
│   └── config/
│       └── mosquitto.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── mqtt_client.py
│   └── routers/
│       ├── nodes.py
│       └── commands.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── NodeDetail.tsx
│       │   └── ControlPanel.tsx
│       └── components/
│           ├── NodeCard.tsx
│           └── SensorChart.tsx
├── esp32s3/
│   ├── platformio.ini
│   └── src/
│       └── main.cpp
└── esp32c3/
    ├── platformio.ini
    └── src/
        └── main.cpp
```

---

## 任務清單

### 任務 1：Docker 基礎設施

**建立：**
- `docker-compose.yml`
- `mosquitto/config/mosquitto.conf`

- [ ] **Step 1: 建立 docker-compose.yml**

```yaml
version: '3.8'

services:
  mosquitto:
    image: eclipse-mosquitto:latest
    container_name: esp32-mosquitto
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
    networks:
      - esp-network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: esp32-backend
    ports:
      - "8000:8000"
    depends_on:
      - mosquitto
    networks:
      - esp-network
    volumes:
      - ./backend:/app
    environment:
      - MQTT_BROKER=mosquitto
      - MQTT_PORT=1883
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: esp32-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - esp-network
    restart: unless-stopped

networks:
  esp-network:
    driver: bridge
```

- [ ] **Step 2: 建立 mosquitto.conf**

```
allow_anonymous true
listener 1883
protocol mqtt
persistence true
persistence_location /mosquitto/data/
persistence_file mosquitto.db
retained_persistence true
log_dest stdout
log_type error
log_type warning
log_type notice
log_type information
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml mosquitto/config/mosquitto.conf
git commit -m "feat: add Docker infrastructure with Mosquitto"
```

---

### 任務 2：後端 - 資料庫與模型

**建立：**
- `backend/database.py`
- `backend/models.py`

- [ ] **Step 1: 建立 backend 目錄結構**

```bash
mkdir -p backend/routers
```

- [ ] **Step 2: 建立 database.py**

```python
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DATABASE_PATH = Path(__file__).parent / "esp32_system.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS nodes (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                ip_address TEXT,
                last_seen INTEGER,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            );

            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                node_id TEXT NOT NULL,
                sensor_type TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT,
                timestamp INTEGER,
                FOREIGN KEY (node_id) REFERENCES nodes(id)
            );

            CREATE TABLE IF NOT EXISTS actuator_state (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                node_id TEXT NOT NULL,
                actuator_type TEXT NOT NULL,
                state INTEGER NOT NULL,
                timestamp INTEGER,
                FOREIGN KEY (node_id) REFERENCES nodes(id)
            );

            CREATE TABLE IF NOT EXISTS commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                node_id TEXT NOT NULL,
                command TEXT NOT NULL,
                payload TEXT,
                status TEXT DEFAULT 'pending',
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (node_id) REFERENCES nodes(id)
            );

            CREATE INDEX IF NOT EXISTS idx_sensor_node ON sensor_data(node_id);
            CREATE INDEX IF NOT EXISTS idx_sensor_timestamp ON sensor_data(timestamp);
        """)
```

- [ ] **Step 3: 建立 models.py**

```python
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class NodeBase(BaseModel):
    id: str
    name: str
    type: str

class NodeCreate(NodeBase):
    pass

class Node(NodeBase):
    ip_address: Optional[str] = None
    last_seen: Optional[int] = None
    created_at: int

    class Config:
        from_attributes = True

class SensorDataBase(BaseModel):
    node_id: str
    sensor_type: str
    value: float
    unit: Optional[str] = None
    timestamp: int

class SensorData(SensorDataBase):
    id: int

    class Config:
        from_attributes = True

class ActuatorCommand(BaseModel):
    command: str
    actuator: str
    value: Any

class CommandResponse(BaseModel):
    id: int
    node_id: str
    command: str
    status: str
    created_at: int

class SensorHistoryResponse(BaseModel):
    node_id: str
    sensor_type: str
    data: List[Dict[str, Any]]
```

- [ ] **Step 4: Commit**

```bash
git add backend/database.py backend/models.py
git commit -m "feat: add database and models"
```

---

### 任務 3：後端 - MQTT 用戶端

**建立：**
- `backend/mqtt_client.py`

- [ ] **Step 1: 建立 mqtt_client.py**

```python
import json
import paho.mqtt.client as mqtt
from typing import Callable, Dict, Any
import threading

class MQTTClient:
    def __init__(self, broker: str, port: int = 1883):
        self.broker = broker
        self.port = port
        self.client = mqtt.Client()
        self.handlers: Dict[str, Callable] = {}
        self._connected = False

        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self._connected = True
            for topic in self.handlers:
                client.subscribe(topic)
        else:
            print(f"MQTT connection failed with code {rc}")

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = json.loads(msg.payload.decode())

        for pattern, handler in self.handlers.items():
            if self._match_topic(pattern, topic):
                handler(topic, payload)

    def _match_topic(self, pattern: str, topic: str) -> bool:
        pattern_parts = pattern.split('/')
        topic_parts = topic.split('/')

        if len(pattern_parts) != len(topic_parts):
            return False

        for p, t in zip(pattern_parts, topic_parts):
            if p == '+':
                continue
            if p == '#':
                return True
            if p != t:
                return False
        return True

    def subscribe(self, topic: str, handler: Callable[[str, Dict], None]):
        self.handlers[topic] = handler
        if self._connected:
            self.client.subscribe(topic)

    def publish(self, topic: str, payload: Dict[str, Any]):
        self.client.publish(topic, json.dumps(payload))

    def start(self):
        self.client.connect(self.broker, self.port, keepalive=60)
        thread = threading.Thread(target=self.client.loop_start)
        thread.daemon = True
        thread.start()

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()

mqtt_client: Optional[MQTTClient] = None

def get_mqtt_client() -> MQTTClient:
    global mqtt_client
    return mqtt_client

def init_mqtt_client(broker: str, port: int) -> MQTTClient:
    global mqtt_client
    mqtt_client = MQTTClient(broker, port)
    mqtt_client.start()
    return mqtt_client
```

- [ ] **Step 2: Commit**

```bash
git add backend/mqtt_client.py
git commit -m "feat: add MQTT client wrapper"
```

---

### 任務 4：後端 - API 路由

**建立：**
- `backend/routers/nodes.py`
- `backend/routers/commands.py`

- [ ] **Step 1: 建立 routers/nodes.py**

```python
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import Node, SensorData, SensorHistoryResponse

router = APIRouter(prefix="/api/nodes", tags=["nodes"])

@router.get("", response_model=List[Node])
def get_nodes():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM nodes").fetchall()
        return [dict(row) for row in rows]

@router.get("/{node_id}", response_model=Node)
def get_node(node_id: str):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM nodes WHERE id = ?", (node_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")
        return dict(row)

@router.get("/{node_id}/sensors", response_model=SensorHistoryResponse)
def get_sensor_history(
    node_id: str,
    sensor_type: str = None,
    from_ts: int = None,
    to_ts: int = None
):
    with get_db() as conn:
        query = "SELECT * FROM sensor_data WHERE node_id = ?"
        params = [node_id]

        if sensor_type:
            query += " AND sensor_type = ?"
            params.append(sensor_type)
        if from_ts:
            query += " AND timestamp >= ?"
            params.append(from_ts)
        if to_ts:
            query += " AND timestamp <= ?"
            params.append(to_ts)

        query += " ORDER BY timestamp DESC LIMIT 1000"
        rows = conn.execute(query, params).fetchall()

        return {
            "node_id": node_id,
            "sensor_type": sensor_type or "all",
            "data": [
                {"value": row["value"], "unit": row["unit"], "timestamp": row["timestamp"]}
                for row in rows
            ]
        }

@router.post("/{node_id}/sensors")
def add_sensor_data(node_id: str, data: SensorData):
    with get_db() as conn:
        conn.execute(
            """INSERT INTO sensor_data (node_id, sensor_type, value, unit, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (node_id, data.sensor_type, data.value, data.unit, data.timestamp)
        )
        conn.commit()
        return {"status": "ok"}
```

- [ ] **Step 2: 建立 routers/commands.py**

```python
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models import ActuatorCommand, CommandResponse
from ..mqtt_client import get_mqtt_client

router = APIRouter(prefix="/api/nodes", tags=["commands"])

@router.post("/{node_id}/command", response_model=CommandResponse)
def send_command(node_id: str, command: ActuatorCommand):
    mqtt = get_mqtt_client()
    if not mqtt:
        raise HTTPException(status_code=500, detail="MQTT client not initialized")

    topic = f"act/{node_id}/{command.actuator}"
    mqtt.publish(topic, {
        "command": command.command,
        "actuator": command.actuator,
        "value": command.value
    })

    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO commands (node_id, command, payload, status)
               VALUES (?, ?, ?, 'sent')""",
            (node_id, command.command, str(command.model_dump()))
        )
        conn.commit()
        cmd_id = cursor.lastrowid

        row = conn.execute(
            "SELECT * FROM commands WHERE id = ?", (cmd_id,)
        ).fetchone()
        return dict(row)
```

- [ ] **Step 3: 建立 routers/__init__.py**

```python
from .nodes import router as nodes_router
from .commands import router as commands_router

__all__ = ["nodes_router", "commands_router"]
```

- [ ] **Step 4: Commit**

```bash
git add backend/routers/nodes.py backend/routers/commands.py backend/routers/__init__.py
git commit -m "feat: add API routers for nodes and commands"
```

---

### 任務 5：後端 - FastAPI 主程式

**建立：**
- `backend/main.py`
- `backend/requirements.txt`
- `backend/Dockerfile`

- [ ] **Step 1: 建立 main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from .database import init_db
from .mqtt_client import init_mqtt_client, get_mqtt_client
from .routers import nodes_router, commands_router
from .database import get_db

mqtt_broker = os.getenv("MQTT_BROKER", "mosquitto")
mqtt_port = int(os.getenv("MQTT_PORT", "1883"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_mqtt_client(mqtt_broker, mqtt_port)

    mqtt = get_mqtt_client()
    mqtt.subscribe("sen/+/+", handle_sensor_data)

    yield

    mqtt = get_mqtt_client()
    if mqtt:
        mqtt.stop()

def handle_sensor_data(topic: str, payload: dict):
    node_id = topic.split('/')[1]
    sensor_type = topic.split('/')[2]

    with get_db() as conn:
        conn.execute(
            """INSERT INTO sensor_data (node_id, sensor_type, value, unit, timestamp)
               VALUES (?, ?, ?, ?, ?)""",
            (node_id, sensor_type, payload.get("value", 0),
             payload.get("unit"), payload.get("timestamp", 0))
        )
        conn.execute(
            """INSERT OR REPLACE INTO nodes (id, name, type, last_seen)
               VALUES (?, ?, ?, ?)""",
            (node_id, payload.get("name", node_id), "esp32c3",
             payload.get("timestamp", 0))
        )
        conn.commit()

app = FastAPI(title="ESP32 MQTT System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes_router)
app.include_router(commands_router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

- [ ] **Step 2: 建立 requirements.txt**

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
paho-mqtt==1.6.1
pydantic==2.5.0
python-multipart==0.0.6
```

- [ ] **Step 3: 建立 Dockerfile**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 4: Commit**

```bash
git add backend/main.py backend/requirements.txt backend/Dockerfile
git commit -m "feat: add FastAPI main application"
```

---

### 任務 6：前端 - 基礎設定

**建立：**
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/tailwind.config.js`
- `frontend/Dockerfile`

- [ ] **Step 1: 建立 package.json**

```json
{
  "name": "esp32-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.303.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 2: 建立 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': 'http://backend:8000',
      '/ws': 'ws://backend:8000'
    }
  }
})
```

- [ ] **Step 3: 建立 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 4: 建立 Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/vite.config.ts frontend/tailwind.config.js frontend/Dockerfile
git commit -m "feat: add frontend base configuration"
```

---

### 任務 7：前端 - 元件與頁面

**建立：**
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/src/index.css`
- `frontend/src/components/NodeCard.tsx`
- `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: 建立 src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 2: 建立 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0f172a;
  color: #f1f5f9;
}
```

- [ ] **Step 3: 建立 src/App.tsx**

```tsx
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
```

- [ ] **Step 4: 建立 src/components/NodeCard.tsx**

```tsx
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
```

- [ ] **Step 5: 建立 src/pages/Dashboard.tsx**

```tsx
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
```

- [ ] **Step 6: 建立 src/pages/NodeDetail.tsx**

```tsx
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
```

- [ ] **Step 7: 建立 src/pages/ControlPanel.tsx**

```tsx
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
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/main.tsx frontend/src/index.css frontend/src/App.tsx
git add frontend/src/components/NodeCard.tsx
git add frontend/src/pages/Dashboard.tsx frontend/src/pages/NodeDetail.tsx frontend/src/pages/ControlPanel.tsx
git commit -m "feat: add frontend components and pages"
```

---

### 任務 8：ESP32S3 韌體

**建立：**
- `esp32s3/platformio.ini`
- `esp32s3/src/main.cpp`

- [ ] **Step 1: 建立 platformio.ini**

```ini
[env:esp32-s3-devkitc-1]
platform = espressif32
board = esp32-s3-devkitc-1
framework = arduino
lib_deps =
    pubsubclient
    ArduinoJson
monitor_speed = 115200
```

- [ ] **Step 2: 建立 src/main.cpp**

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);

  String node_id = doc["node_id"];
  String command = doc["command"];
  String actuator = doc["actuator"];
  auto value = doc["value"];

  char response_topic[64];
  snprintf(response_topic, sizeof(response_topic), "cmd/%s/response", node_id.c_str());

  StaticJsonDocument<256> response;
  response["status"] = "ok";
  response["command"] = command;
  char buffer[256];
  serializeJson(response, buffer);
  mqttClient.publish(response_topic, buffer);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (mqttClient.connect("ESP32S3-Controller")) {
      Serial.println("connected");
      mqttClient.subscribe("sys/+/config");
      mqttClient.subscribe("cmd/+/+");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(callback);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnect();
  }
  mqttClient.loop();
}
```

- [ ] **Step 3: Commit**

```bash
git add esp32s3/platformio.ini esp32s3/src/main.cpp
git commit -m "feat: add ESP32S3 controller firmware"
```

---

### 任務 9：ESP32C3 韌體

**建立：**
- `esp32c3/platformio.ini`
- `esp32c3/src/main.cpp`

- [ ] **Step 1: 建立 platformio.ini**

```ini
[env:esp32-c3-devkitm-1]
platform = espressif32
board = esp32-c3-devkitm-1
framework = arduino
lib_deps =
    pubsubclient
    ArduinoJson
    DHT sensor library
monitor_speed = 115200
```

- [ ] **Step 2: 建立 src/main.cpp**

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100";
const int mqtt_port = 1883;
const char* node_id = "esp-c3-001";

#define DHTPIN 2
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

WiFiClient espClient;
PubSubClient mqttClient(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);

  String command = doc["command"];
  String actuator = doc["actuator"];
  auto value = doc["value"];

  if (command == "set_actuator") {
    char response_topic[64];
    snprintf(response_topic, sizeof(response_topic), "cmd/%s/response", node_id);
    StaticJsonDocument<256> response;
    response["status"] = "ok";
    response["actuator"] = actuator;
    char buffer[256];
    serializeJson(response, buffer);
    mqttClient.publish(response_topic, buffer);
  }
}

void setup_wifi() {
  delay(10);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void reconnect() {
  while (!mqttClient.connected()) {
    if (mqttClient.connect(node_id)) {
      char status_topic[64];
      snprintf(status_topic, sizeof(status_topic), "sys/%s/status", node_id);
      mqttClient.subscribe(status_topic);
      mqttClient.subscribe("act/+/+");
    }
    delay(5000);
  }
}

void publish_sensor_data() {
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (!isnan(temp) && !isnan(humidity)) {
    char temp_topic[64];
    snprintf(temp_topic, sizeof(temp_topic), "sen/%s/temperature", node_id);
    StaticJsonDocument<256> temp_doc;
    temp_doc["value"] = temp;
    temp_doc["unit"] = "C";
    temp_doc["timestamp"] = Unix.timestamp();
    char buffer[256];
    serializeJson(temp_doc, buffer);
    mqttClient.publish(temp_topic, buffer);

    char hum_topic[64];
    snprintf(hum_topic, sizeof(hum_topic), "sen/%s/humidity", node_id);
    StaticJsonDocument<256> hum_doc;
    hum_doc["value"] = humidity;
    hum_doc["unit"] = "%";
    hum_doc["timestamp"] = Unix.timestamp();
    serializeJson(hum_doc, buffer);
    mqttClient.publish(hum_topic, buffer);
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  setup_wifi();
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(callback);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnect();
  }
  mqttClient.loop();

  static unsigned long lastPublish = 0;
  if (millis() - lastPublish > 60000) {
    publish_sensor_data();
    lastPublish = millis();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add esp32c3/platformio.ini esp32c3/src/main.cpp
git commit -m "feat: add ESP32C3 node firmware"
```

---

### 任務 10：最終整合

- [ ] **Step 1: 驗證 docker-compose 可以啟動**

```bash
docker-compose config --quiet && echo "Valid"
```

- [ ] **Step 2: 提交所有變更**

```bash
git add -A
git commit -m "feat: complete ESP32 MQTT system"
```

---

## 實作選項

**1. Subagent-Driven（推薦）** - 每個任務由獨立的 subagent 執行，兩階段審查

**2. Inline Execution** - 在本 session 中按批次執行任務，並有檢查點

你偏好哪種方式？