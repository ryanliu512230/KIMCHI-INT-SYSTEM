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