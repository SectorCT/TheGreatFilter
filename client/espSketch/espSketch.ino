#include <ArduinoJson.h>
#include <algorithm>

// --- Configuration ---
const int powerPin = 25;
const int sensePin = 34;
const int threshold = 3000; // ADC Threshold (Lower = Wet, Higher = Dry)
const long baudRate = 115200;

// --- GFQA Range Definitions (p5 - p95) ---
struct ParameterDef {
  const char* code;
  const char* name;
  const char* unit;
  float minVal;
  float maxVal;
  int decimals;
};

ParameterDef extraParams[] = {
  {"DO", "Dissolved Oxygen", "mg/L", 4.2, 11.8, 2},
  {"TURB", "Turbidity", "NTU", 0.8, 45.0, 1},
  {"TDS", "Total Dissolved Solids", "mg/L", 50.0, 850.0, 0},
  {"NO3", "Nitrate", "mg/L", 0.05, 12.5, 3},
  {"CHL-A", "Chlorophyll a", "ug/L", 0.1, 25.0, 2},
  {"ORP", "Oxidation-Reduction Potential", "mV", -150.0, 550.0, 0}
};

// --- Helpers ---
float getRandomFloat(float min, float max) {
  return min + (static_cast<float>(rand()) / (static_cast<float>(RAND_MAX / (max - min))));
}

// --- Sensor Logic ---
int readMedianADC() {
  int readings[5];
  digitalWrite(powerPin, HIGH);
  delay(15); // Stabilization delay

  for (int i = 0; i < 5; i++) {
    readings[i] = analogRead(sensePin);
    delay(2);
  }
  
  digitalWrite(powerPin, LOW); // Prevent corrosion

  // Sort for median
  std::sort(readings, readings + 5);
  return readings[2];
}

// --- Serial Processing ---
void processRequest() {
  if (Serial.available() > 0) {
    StaticJsonDocument<512> reqDoc;
    DeserializationError error = deserializeJson(reqDoc, Serial);

    if (error) return; // Ignore malformed JSON

    const char* cmd = reqDoc["cmd"];
    const char* requestId = reqDoc["requestId"];

    if (cmd && strcmp(cmd, "READ_MEASUREMENT") == 0) {
      // Send ACK immediately if requested (Optional)
      StaticJsonDocument<128> ackDoc;
      ackDoc["type"] = "ACK";
      ackDoc["requestId"] = requestId;
      serializeJson(ackDoc, Serial);
      Serial.println();

      // Perform Measurement
      int adcValue = readMedianADC();
      bool isWet = (adcValue < threshold);

      // Construct Response
      DynamicJsonDocument resDoc(1536);
      resDoc["type"] = "MEASUREMENT";
      resDoc["requestId"] = requestId;

      if (!isWet) {
        resDoc["status"] = "DRY";
        resDoc["reason"] = "probes_not_wet";
      } else {
        resDoc["status"] = "WET";
        JsonObject measurement = resDoc.createNestedObject("measurement");
        measurement["source"] = "lab_equipment";
        
        // Required Core Parameters
        measurement["temperature"] = serialized(String(getRandomFloat(3.9, 31.4), 1));
        measurement["ph"] = serialized(String(getRandomFloat(6.6, 8.527), 2));

        JsonArray params = measurement.createNestedArray("parameters");
        
        // Add Electrical Conductance (Mandatory in payload)
        JsonObject ec = params.createNestedObject();
        ec["file"] = "demo_esp32";
        ec["parameterCode"] = "EC";
        ec["parameterName"] = "Electrical Conductance";
        ec["unit"] = "uS/cm";
        ec["value"] = (int)getRandomFloat(150, 1200);

        // Add 3-5 random extra GFQA parameters
        int extraCount = random(3, 6); 
        std::random_shuffle(std::begin(extraParams), std::end(extraParams));
        
        for (int i = 0; i < extraCount; i++) {
          JsonObject p = params.createNestedObject();
          p["file"] = "demo_esp32";
          p["parameterCode"] = extraParams[i].code;
          p["parameterName"] = extraParams[i].name;
          p["unit"] = extraParams[i].unit;
          float val = getRandomFloat(extraParams[i].minVal, extraParams[i].maxVal);
          p["value"] = serialized(String(val, extraParams[i].decimals));
        }
      }

      serializeJson(resDoc, Serial);
      Serial.println(); // Terminal newline
    }
  }
}

void setup() {
  Serial.begin(baudRate);
  pinMode(powerPin, OUTPUT);
  digitalWrite(powerPin, LOW);
  
  // Seed random with floating noise
  randomSeed(analogRead(35) + micros()); 
}

void loop() {
  processRequest();
}