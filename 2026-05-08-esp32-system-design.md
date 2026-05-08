# ESP32 主控系統設計規格

**日期：** 2026-05-08
**狀態：** 已核准

---

## 1. 系統概覽

使用 ESP32S3 作為主控，透過 MQTT 控制多個 ESP32C3 節點，实现感測與控制功能。系統包含完整的前後端及 Docker 部署。

---

## 2. 系統架構

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  ESP32S3   │────▶│   MQTT     │◀────│  ESP32C3   │
│  (主控)    │     │   Broker   │     │  (節點)    │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                    ┌─────▼─────┐
                    │  Backend  │
                    │  FastAPI  │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │  Frontend │
                    │  React   │
                    └───────────┘
```

**技術棧：**
- ESP32 韌體：PlatformIO + Arduino framework
- MQTT Broker：Eclipse Mosquitto（Docker）
- 後端：Python FastAPI（Docker）
- 前端：React + Vite + TailwindCSS（Docker）
- 數據庫：SQLite

---

## 3. 通訊協議

### MQTT Topics

| Topic | 方向 | 用途 |
|-------|------|------|
| `sys/{node_id}/status` | C3→S3 | 節點狀態心跳 |
| `sys/{node_id}/config` | S3→C3 | 配置下發 |
| `sen/{node_id}/+` | C3→S3 | 感測器數據上報 |
| `act/{node_id}/+` | S3→C3 | 控制指令下發 |
| `cmd/{node_id}/+` | S3→C3 | 命令下發 |

### 訊息格式（JSON）

```json
{
  "node_id": "esp-c3-001",
  "type": "sensor",
  "sensor": "dht22",
  "data": { "temp": 25.5, "humidity": 60 },
  "timestamp": 1715200000
}
```

---

## 4. API 設計（RESTful + WebSocket）

| Method | Endpoint | 用途 |
|--------|----------|------|
| GET | `/api/nodes` | 取得所有節點列表 |
| GET | `/api/nodes/{id}` | 取得單一節點狀態 |
| POST | `/api/nodes/{id}/command` | 發送命令給節點 |
| GET | `/api/nodes/{id}/sensors` | 取得感測器歷史 |
| WS | `/ws/sensors` | 即時感測器數據流 |
| WS | `/ws/nodes` | 即時節點狀態 |

**命令格式：**
```json
{
  "command": "set_actuator",
  "actuator": "relay_1",
  "value": true
}
```

---

## 5. Docker 部署

### docker-compose.yml

```yaml
services:
  mosquitto:
    image: eclipse-mosquitto:latest
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
    networks:
      - esp-network

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - mosquitto
    networks:
      - esp-network

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - esp-network

networks:
  esp-network:
    driver: bridge
```

### Mosquitto config (mosquitto.conf)

```
allow_anonymous true
listener 1883
persistence true
persistence_location /mosquitto/data/
```

---

## 6. 前端功能模組

| 頁面 | 功能 |
|------|------|
| 儀表板 | 顯示所有節點狀態、地圖視圖 |
| 節點詳情 | 即時數據、歷史圖表、控制介面 |
| 控制面板 | 統一控制所有致動器 |
| 歷史數據 | 查詢、下載數據報表 |
| 設定 | 新增節點、設定警示閾值 |

---

## 7. 數據庫設計

### Tables

- `nodes` - 節點基本資訊
- `sensor_data` - 感測器讀數
- `actuator_state` - 致動器狀態
- `commands` - 命令日誌

---

## 8. 支援的感測器/致動器類型

**感測器：**
- 數位：DHT11/DHT22（溫濕度）、超聲波 HC-SR04
- 類比：光敏電阻、電位計、土壤濕度
- I2C：BMP280（氣壓）、MPU6050（姿態）

**致動器：**
- 繼電器模組
- DC 馬達（透過 motor driver）
- PWM 控制（風扇、燈光亮度）

---

## 9. 專案目錄結構

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
│   ├── mqtt_client.py
│   └── routers/
│       ├── nodes.py
│       └── commands.py
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── pages/
│       └── components/
├── esp32s3/
│   ├── platformio.ini
│   └── src/
│       └── main.cpp
├── esp32c3/
│   ├── platformio.ini
│   └── src/
│       └── main.cpp
└── docs/
    └── specs/
        └── 2026-05-08-esp32-system-design.md
```
