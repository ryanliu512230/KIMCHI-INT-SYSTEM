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