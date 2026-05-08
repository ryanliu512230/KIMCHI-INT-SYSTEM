# ESP32 MQTT 主控系統

使用 ESP32S3 作為主控，透過 MQTT 控制多個 ESP32C3 節點，實現感測與控制功能。

## 系統架構

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

## 功能特色

- 🌡️ **感測器支援** - DHT22 溫濕度感測器
- 🎛️ **致動器控制** - 繼電器、PWM 控制
- 📊 **即時數據** - MQTT 訊息即時處理
- 🌐 **Web Dashboard** - 即時查看所有節點狀態
- 📈 **歷史數據** - 查看感測器歷史記錄

## 快速開始

### 1. Docker 服務

```bash
docker-compose up -d
```

服務運行後：
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 文件: http://localhost:8000/docs

### 2. 燒錄韌體

**ESP32S3（主控）**
```bash
cd esp32s3
pio run --target upload
```

**ESP32C3（節點）**
```bash
cd esp32c3
pio run --target upload --upload-port COM4
```

### 3. 設定 WiFi

修改 `esp32s3/src/main.cpp` 和 `esp32c3/src/main.cpp`：

```cpp
const char* ssid = "你的WiFi名稱";
const char* password = "你的WiFi密碼";
const char* mqtt_server = "MQTT Broker IP";
const int mqtt_port = 1884;
```

## MQTT Topics

| Topic | 方向 | 用途 |
|-------|------|------|
| `sys/{node_id}/status` | C3→S3 | 節點狀態心跳 |
| `sen/{node_id}/temperature` | C3→S3 | 溫度數據 |
| `sen/{node_id}/humidity` | C3→S3 | 濕度數據 |
| `act/{node_id}/{actuator}` | S3→C3 | 控制指令 |

## API Endpoints

| Method | Endpoint | 用途 |
|--------|----------|------|
| GET | `/api/nodes` | 取得所有節點 |
| GET | `/api/nodes/{id}` | 取得單一節點 |
| GET | `/api/nodes/{id}/sensors` | 取得感測器歷史 |
| POST | `/api/nodes/{id}/command` | 發送控制指令 |
| GET | `/health` | 健康檢查 |

## 技術棧

- **ESP32 韌體**: PlatformIO + Arduino framework
- **MQTT Broker**: Eclipse Mosquitto
- **後端**: Python FastAPI
- **前端**: React + Vite + TailwindCSS
- **數據庫**: SQLite

## 專案結構

```
ESP32-MQTT-System/
├── docker-compose.yml
├── mosquitto/
│   └── config/
│       └── mosquitto.conf
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── mqtt_client.py
│   └── routers/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   └── components/
│   └── package.json
├── esp32s3/
│   └── src/
│       └── main.cpp
├── esp32c3/
│   └── src/
│       └── main.cpp
└── docs/
```

## 故障排除

**節點連不上 MQTT？**
- 檢查 WiFi 密碼是否正確
- 確認 MQTT Broker IP 可達
- 檢查防火牆是否開放 1884 連接埠

**Dashboard 沒有數據？**
- 確認 Backend 已啟動：`docker-compose ps`
- 檢查 Backend 日誌：`docker-compose logs backend`
- 確認 MQTT 有連線：`docker-compose logs mosquitto`

## License

MIT
