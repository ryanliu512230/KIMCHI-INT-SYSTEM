from fastapi import APIRouter, HTTPException
from database import get_db
from models import ActuatorCommand, CommandResponse
from mqtt_client import get_mqtt_client

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