#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <dht.h>
#include <Update.h>

const char* ssid = "KIMCHI";
const char* password = "0974102335";
const char* mqtt_server = "192.168.0.150";
const int mqtt_port = 1884;
const char* node_id = "esp-c3-001";

const char* ota_topic = "ota/c3/firmware";
const char* ota_status_topic = "ota/c3/status";

#define DHTPIN 2
#define DHTTYPE DHT::DHT22
DHT dht;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

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
  }
  else if (action == "data") {
    int chunk_size = doc["chunk"].as<int>();
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
  if (strncmp(topic, "ota/c3/", 8) == 0) {
    handle_ota_command(topic, payload, length);
    return;
  }

  DynamicJsonDocument doc(256);
  deserializeJson(doc, payload, length);

  String command = doc["command"].as<String>();
  String actuator = doc["actuator"].as<String>();
  bool value = doc["value"].as<bool>();

  if (command == "set_actuator") {
    char response_topic[64];
    snprintf(response_topic, sizeof(response_topic), "cmd/%s/response", node_id);
    DynamicJsonDocument response(256);
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
      mqttClient.subscribe(ota_topic);
    }
    delay(5000);
  }
}

void publish_sensor_data() {
  float temp = dht.getTemperature();
  float humidity = dht.getHumidity();

  if (!isnan(temp) && !isnan(humidity)) {
    char temp_topic[64];
    snprintf(temp_topic, sizeof(temp_topic), "sen/%s/temperature", node_id);
    DynamicJsonDocument temp_doc(256);
    temp_doc["value"] = temp;
    temp_doc["unit"] = "C";
    temp_doc["timestamp"] = millis() / 1000;
    char buffer[256];
    serializeJson(temp_doc, buffer);
    mqttClient.publish(temp_topic, buffer);

    char hum_topic[64];
    snprintf(hum_topic, sizeof(hum_topic), "sen/%s/humidity", node_id);
    DynamicJsonDocument hum_doc(256);
    hum_doc["value"] = humidity;
    hum_doc["unit"] = "%";
    hum_doc["timestamp"] = millis() / 1000;
    serializeJson(hum_doc, buffer);
    mqttClient.publish(hum_topic, buffer);
  }
}

void setup() {
  Serial.begin(115200);
  dht.setup(DHTPIN);
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