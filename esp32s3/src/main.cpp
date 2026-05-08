#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "KIMCHI";
const char* password = "0974102335";
const char* mqtt_server = "192.168.0.150";
const int mqtt_port = 1884;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
  DynamicJsonDocument doc(256);
  deserializeJson(doc, payload, length);

  String node_id = doc["node_id"].as<String>();
  String command = doc["command"].as<String>();
  String actuator = doc["actuator"].as<String>();
  bool value = doc["value"].as<bool>();

  char response_topic[64];
  snprintf(response_topic, sizeof(response_topic), "cmd/%s/response", node_id.c_str());

  DynamicJsonDocument response(256);
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
