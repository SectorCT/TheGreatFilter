// ESP32 demo firmware for lab-equipment USB import.
// Protocol: newline-delimited JSON requests/responses over Serial.

const int powerPin = 25;
const int sensePin = 34;
const int threshold = 3000;

const int SAMPLES_FOR_MEDIAN = 5;

struct ParamSample {
  const char* code;
  const char* name;
  const char* unit;
  float minValue;
  float maxValue;
  int decimals;
};

ParamSample PARAMS[] = {
  {"EC", "Electrical Conductance", "uS/cm", 50.0, 2000.0, 0},
  {"O2-Dis", "Dissolved Oxygen", "mg/l", 3.0, 13.0, 1},
  {"TURB", "Turbidity", "NTU", 0.5, 50.0, 1},
  {"Cl-Tot", "Chloride - Total", "mg/l", 2.0, 300.0, 1}
};

const int PARAMS_COUNT = sizeof(PARAMS) / sizeof(PARAMS[0]);

float randomFloat(float minValue, float maxValue) {
  long raw = random(0, 10001);
  float ratio = raw / 10000.0;
  return minValue + ((maxValue - minValue) * ratio);
}

float roundTo(float value, int decimals) {
  float scale = 1.0;
  for (int i = 0; i < decimals; i++) {
    scale *= 10.0;
  }
  return round(value * scale) / scale;
}

int readWaterSensorSingle() {
  digitalWrite(powerPin, HIGH);
  delay(10);
  int value = analogRead(sensePin);
  digitalWrite(powerPin, LOW);
  return value;
}

int readWaterSensorMedian() {
  int values[SAMPLES_FOR_MEDIAN];
  for (int i = 0; i < SAMPLES_FOR_MEDIAN; i++) {
    values[i] = readWaterSensorSingle();
    delay(4);
  }

  for (int i = 0; i < SAMPLES_FOR_MEDIAN - 1; i++) {
    for (int j = i + 1; j < SAMPLES_FOR_MEDIAN; j++) {
      if (values[j] < values[i]) {
        int tmp = values[i];
        values[i] = values[j];
        values[j] = tmp;
      }
    }
  }

  return values[SAMPLES_FOR_MEDIAN / 2];
}

bool isWet() {
  int reading = readWaterSensorMedian();
  return reading < threshold;
}

String extractRequestId(const String& line) {
  int keyIndex = line.indexOf("\"requestId\"");
  if (keyIndex < 0) return "";
  int firstQuote = line.indexOf('"', keyIndex + 11);
  if (firstQuote < 0) return "";
  int secondQuote = line.indexOf('"', firstQuote + 1);
  if (secondQuote < 0) return "";
  return line.substring(firstQuote + 1, secondQuote);
}

void sendAck(const String& requestId) {
  Serial.print("{\"type\":\"ACK\",\"requestId\":\"");
  Serial.print(requestId);
  Serial.println("\"}");
}

void sendDry(const String& requestId) {
  Serial.print("{\"type\":\"MEASUREMENT\",\"requestId\":\"");
  Serial.print(requestId);
  Serial.println("\",\"status\":\"DRY\",\"reason\":\"probes_not_wet\"}");
}

void sendWetMeasurement(const String& requestId) {
  float temperature = roundTo(randomFloat(6.0, 28.0), 1);
  float ph = roundTo(randomFloat(6.5, 8.5), 2);

  int selectedCount = random(3, 6);
  bool selected[PARAMS_COUNT];
  for (int i = 0; i < PARAMS_COUNT; i++) {
    selected[i] = false;
  }

  int picked = 0;
  while (picked < selectedCount) {
    int index = random(0, PARAMS_COUNT);
    if (!selected[index]) {
      selected[index] = true;
      picked++;
    }
  }

  Serial.print("{\"type\":\"MEASUREMENT\",\"requestId\":\"");
  Serial.print(requestId);
  Serial.print("\",\"status\":\"WET\",\"measurement\":{");
  Serial.print("\"source\":\"lab_equipment\",");
  Serial.print("\"temperature\":");
  Serial.print(temperature, 1);
  Serial.print(",\"ph\":");
  Serial.print(ph, 2);
  Serial.print(",\"parameters\":[");

  bool firstParam = true;
  for (int i = 0; i < PARAMS_COUNT; i++) {
    if (!selected[i]) continue;
    float value = roundTo(randomFloat(PARAMS[i].minValue, PARAMS[i].maxValue), PARAMS[i].decimals);
    if (!firstParam) {
      Serial.print(",");
    }
    firstParam = false;
    Serial.print("{\"file\":\"demo_esp32\",\"parameterCode\":\"");
    Serial.print(PARAMS[i].code);
    Serial.print("\",\"parameterName\":\"");
    Serial.print(PARAMS[i].name);
    Serial.print("\",\"unit\":\"");
    Serial.print(PARAMS[i].unit);
    Serial.print("\",\"value\":");
    if (PARAMS[i].decimals == 0) {
      Serial.print((int)value);
    } else {
      Serial.print(value, PARAMS[i].decimals);
    }
    Serial.print("}");
  }

  Serial.println("]}}");
}

void processCommand(const String& line) {
  if (line.indexOf("\"cmd\":\"READ_MEASUREMENT\"") < 0) {
    return;
  }

  String requestId = extractRequestId(line);
  if (requestId.length() == 0) {
    requestId = "missing-request-id";
  }

  sendAck(requestId);
  if (!isWet()) {
    sendDry(requestId);
    return;
  }
  sendWetMeasurement(requestId);
}

void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  pinMode(powerPin, OUTPUT);
  digitalWrite(powerPin, LOW);
}

void loop() {
  if (Serial.available() == 0) {
    delay(2);
    return;
  }

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) {
    return;
  }
  processCommand(line);
}
