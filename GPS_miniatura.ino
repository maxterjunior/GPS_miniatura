#include <TinyGPSPlus.h>
#include <SoftwareSerial.h>
#include "WiFi.h"
#include <esp_task_wdt.h>
#include "ArduinoOTA.h"
#include <HTTPClient.h>
#include <ArduinoJson.h>
// #include "BluetoothSerial.h"

static const int RXPin = 16, TXPin = 17;  // Los pines RX(20) y TX(21) son propios del ESP32C3
static const uint32_t GPSBaud = 9600;     // se debe hacer la conexión en pines diferentes para Arduino o ESP


// #define ssid "MOVISTAR_8F30"
// #define pass "88888888"

// #define ssid "CorAll D&R-2.4G"
// #define pass "coralldr2022"

#define ssid "YAWI"
#define pass "Y@w!.19*"

String serverName = "http://192.168.15.73:9999/datos-satelite";
// String serverName = "http://192.168.100.171:9999/datos-satelite";


/*
Pines    |  RX  TX  |
Uno/Nano |  1   0   |
Esp32    |  3   1   |
*/

TinyGPSPlus gps;

// Comunicación serial con el GPS
SoftwareSerial ss(RXPin, TXPin);

void setup() {
  esp_task_wdt_init(300, true);
  esp_task_wdt_add(NULL);
  Serial.begin(115200);
  ss.begin(GPSBaud);
  ledcSetup(0, 5000, 8);
  ledcAttachPin(2, 0);
  ledcWrite(0, 0);
  connectWifi();
}

void loop() {


  smartDelay(1000);

  // if (gps.location.isUpdated()) {
    printFloat(gps.location.lat(), gps.location.isValid(), 12, 6);
    Serial.print(",");
    printFloat(gps.location.lng(), gps.location.isValid(), 12, 6);
    Serial.print(",");
    Serial.print(gps.satellites.value());
    Serial.print(",");
    Serial.print(gps.charsProcessed());
    Serial.println();

    sendPost(gps.location.lat(), gps.location.lng(), gps.satellites.value());
  // }

  esp_task_wdt_reset();

  ArduinoOTA.handle();
}

static void smartDelay(unsigned long ms) {
  unsigned long start = millis();
  do {
    while (ss.available())
      gps.encode(ss.read());
  } while (millis() - start < ms);
}

static void printFloat(float val, bool valid, int len, int prec) {
  if (!valid) {
    while (len-- > 1)
      Serial.print('*');
  } else {
    Serial.print(val, prec);
    int vi = abs((int)val);
    int flen = prec + (val < 0.0 ? 2 : 1);  // . Y -
    flen += vi >= 1000 ? 4 : vi >= 100 ? 3
                           : vi >= 10  ? 2
                                       : 1;
    for (int i = flen; i < len; ++i)
      Serial.print(' ');
  }
  smartDelay(0);
}

static void printInt(unsigned long val, bool valid, int len) {
  char sz[32] = "***************";
  if (valid)
    sprintf(sz, "%ld", val);
  sz[len] = 0;
  for (int i = strlen(sz); i < len; ++i)
    sz[i] = ' ';
  if (len > 0)
    sz[len - 1] = ' ';
  Serial.print(sz);
  smartDelay(0);
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pass);
  Serial.print("Connecting to ");
  Serial.println(ssid);
  Serial.println(pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Conectado");
  Serial.print("WiFi connected, IP address: ");
  Serial.println(WiFi.localIP());
  ledcWrite(0, 20);

  // ArduinoOTA.setPort(3232);
  ArduinoOTA.setPassword("maxter");
  ArduinoOTA.begin();
}

void reconnect() {
  if (WiFi.status() != WL_CONNECTED) {
    ledcWrite(0, 0);
    Serial.print("Reconectando...");
    WiFi.reconnect();
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("Reconectado!");
  }
}

void sendPost(float lat, float lng, int sat) {
  HTTPClient http;

  // Especifica el destino para la solicitud HTTP
  http.begin(serverName);

  // Especifica el tipo de contenido de la solicitud
  http.addHeader("Content-Type", "application/json");

  // Prepara los datos que se enviarán
  DynamicJsonDocument doc(1024);
  doc["lat"] = lat;
  doc["lng"] = lng;
  doc["sat"] = sat;
  String httpRequestData;
  serializeJson(doc, httpRequestData);

  // Enviar la solicitud HTTP POST
  int httpResponseCode = http.POST(httpRequestData);

  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }

  // Cerrar la conexión
  http.end();
}