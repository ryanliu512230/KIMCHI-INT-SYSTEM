import json
import paho.mqtt.client as mqtt
from typing import Callable, Dict, Any, Optional
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
