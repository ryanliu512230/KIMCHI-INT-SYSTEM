#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Update.h>

const char* ssid = "KIMCHI";
const char* password = "0974102335";
const char* mqtt_server = "192.168.0.150";
const int mqtt_port = 1884;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

const char* ota_topic = "ota/s3/firmware";
const char* ota_status_topic = "ota/s3/status";

static size_t firmware_size = 0;
static int total_received = 0;

void handle_ota_command(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  deserializeJson(doc, payload, length);

  String action = doc["action"].as<String>();

  if (action == "start") {
    Serial.println("OTA: Starting update...");
    firmware_size = doc["size"].as<size_t>();
    String version = doc["version"].as<String>();

    total_received = 0;

    char status_msg[128];
    snprintf(status_msg, sizeof(status_msg), "{\"status\":\"started\",\"size\":%d,\"version\":\"%s\"}", firmware_size, version.c_str());
    mqttClient.publish(ota_status_topic, status_msg);

    Serial.printf("OTA: Expected size: %d bytes\n", firmware_size);
    Serial.printf("OTA: Version: %s\n", version.c_str());
  }
  else if (action == "data") {
    String data = doc["data"].as<String>();
    int chunk_size = data.length();
    int offset = doc["offset"].as<int>();

    if (offset == 0) {
      Update.begin(firmware_size);
      total_received = 0;
      Serial.println("OTA: Begin update");
    }

    Serial.printf("OTA: Received chunk %d bytes at offset %d\n", chunk_size, offset);
    total_received += chunk_size;

    char status_msg[128];
    int progress = (total_received * 100) / firmware_size;
    snprintf(status_msg, sizeof(status_msg), "{\"status\":\"downloading\",\"progress\":%d}", progress);
    mqttClient.publish(ota_status_topic, status_msg);
  }
  else if (action == "end") {
    if (Update.end(true)) {
      Serial.println("OTA: Update complete! Rebooting...");
      mqttClient.publish(ota_status_topic, "{\"status\":\"complete\"}");
      delay(1000);
      ESP.restart();
    } else {
      Serial.printf("OTA: Update failed: %s\n", Update.errorString());
      mqttClient.publish(ota_status_topic, "{\"status\":\"failed\"}");
    }
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  if (strncmp(topic, "ota/s3/", 8) == 0) {
    handle_ota_command(topic, payload, length);
    return;
  }

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
      mqttClient.subscribe(ota_topic);
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
