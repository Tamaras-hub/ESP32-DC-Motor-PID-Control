// ==========================================
// PRÁCTICA: IDENTIFICACIÓN DEL MOTOR DC
// ==========================================

// 1. Definición de Pines
const int pinPWM = 25;
const int pinIN1 = 26;
const int pinIN2 = 27;
const int pinEncA = 32;
const int pinEncB = 33;

// 2. Parámetros del Motor y Muestreo
// Motor: MDC-ENCO-150R-9.5KG
// 9VDC, 150RPM, 9.5Kg/cm
// CPR medido físicamente = 432 (1 flanco, canal A)
// Velocidad máxima teórica = 150 RPM = 15.7 rad/s
const float CPR = 432.0;
const int Ts_ms = 50;
const float Ts_sec = Ts_ms * 0.001;

const float V_ALIMENTACION = 9.0;
const float VEL_MAX_RAD_S = 40.0;   // filtro anti-picos

volatile long cuentasEncoder = 0;
long cuentasAnteriores = 0;

unsigned long tiempoAnterior = 0;
unsigned long tiempoInicio = 0;

int voltajePWM = 0;
float voltajeReal = 0.0;
float velocidadAngular = 0.0;

void IRAM_ATTR leerEncoder() {
  // Sentido corregido del encoder
  if (digitalRead(pinEncB) > 0) {
    cuentasEncoder++;
  } else {
    cuentasEncoder--;
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(pinPWM, OUTPUT);
  pinMode(pinIN1, OUTPUT);
  pinMode(pinIN2, OUTPUT);
  pinMode(pinEncA, INPUT_PULLUP);
  pinMode(pinEncB, INPUT_PULLUP);

  attachInterrupt(digitalPinToInterrupt(pinEncA), leerEncoder, RISING);

  digitalWrite(pinIN1, LOW);
  digitalWrite(pinIN2, LOW);
  analogWrite(pinPWM, 0);

  Serial.println("Tiempo(s),Voltaje_PWM,Voltaje_Real(V),Velocidad_rad_s");

  delay(2000);
  tiempoInicio = millis();
  tiempoAnterior = millis();
}

void loop() {
  unsigned long tiempoActual = millis();

  if (tiempoActual - tiempoAnterior >= Ts_ms) {
    tiempoAnterior = tiempoActual;

    float tiempoSegundos = (tiempoActual - tiempoInicio) / 1000.0;

    if (tiempoSegundos > 2.0 && tiempoSegundos < 6.0) {
      digitalWrite(pinIN1, HIGH);
      digitalWrite(pinIN2, LOW);
      voltajePWM = 150;
      analogWrite(pinPWM, voltajePWM);
    } else {
      digitalWrite(pinIN1, LOW);
      digitalWrite(pinIN2, LOW);
      voltajePWM = 0;
      analogWrite(pinPWM, 0);
    }

    voltajeReal = (voltajePWM / 255.0) * V_ALIMENTACION;

    long cuentasActuales = cuentasEncoder;
    long deltaCuentas = cuentasActuales - cuentasAnteriores;
    cuentasAnteriores = cuentasActuales;

    float velocidadNueva = (deltaCuentas / CPR) * (2.0 * PI) / Ts_sec;

    // Filtro anti-picos: ignora valores imposibles
    if (abs(velocidadNueva) < VEL_MAX_RAD_S) {
      velocidadAngular = velocidadNueva;
    }

    Serial.print(tiempoSegundos, 3);
    Serial.print(",");
    Serial.print(voltajePWM);
    Serial.print(",");
    Serial.print(voltajeReal, 4);
    Serial.print(",");
    Serial.println(velocidadAngular, 4);
  }
}