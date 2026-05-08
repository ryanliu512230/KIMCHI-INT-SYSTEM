#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <dht.h>

const char* ssid = "KIMCHI";
const char* password = "0974102335";
const char* mqtt_server = "192.168.0.150";
const int mqtt_port = 1884;
const char* node_id = "esp-c3-001";

#define DHTPIN 2
#define DHTTYPE DHT::DHT22
DHT dht;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
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