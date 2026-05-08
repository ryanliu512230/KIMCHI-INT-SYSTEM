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