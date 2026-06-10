// =====================================================================
// CONTROL DE VELOCIDAD PID - ESP32 (VERSION CORREGIDA)
// =====================================================================
//sdad
// --- POR QUE EXISTE ESTA VERSION ---
//
// En la version original (codigoESP32ControlMotor.ino) se usaba:
//
//     const float CPR = 2256.0;
// re
// Ese valor asume conteo CUADRUPLO (4X): ambos flancos de ambos
// canales del encoder.
//
//     CPR 4X = 12 PPR x 4 flancos x 47:1 = 2256
//
// Sin embargo, la ISR solo cuenta FLANCOS DE SUBIDA del canal A
// (conteo 1X), que produce 4 veces menos pulsos por vuelta:
//
//     CPR 1X = 12 PPR x 1 flanco x 47:1 = 564  <-- valor correcto
//
// Consecuencia: la velocidad medida era 4 veces menor a la real.
//
//     v_medida = v_real / 4
//
// El motor llegaba a ~17 rad/s reales, pero el serial mostraba
// ~4.25 rad/s. El setpoint de 10 rad/s nunca era alcanzable
// porque la velocidad maxima medida era solo ~4.5 rad/s.
//
// Ademas, la funcion de transferencia identificada con esos datos:
//
//     G_original(z) = 0.47045z / (z - 0.68281)  [escala erronea]
//
// tiene una ganancia 4x menor a la real. Al corregir el CPR,
// la planta real es:
//
//     G_corregida(z) = 1.8818z / (z - 0.68281)  [0.47045 x 4]
//
// El polo z = 0.68281 NO cambia: la DINAMICA del motor es identica.
// Solo cambia la GANANCIA ESTATICA por el factor de escala del CPR.
//
// Por eso los parametros PID tambien cambian: fueron re-calculados
// con autotuning_corregido.py usando la planta corregida.
//
// --- RESUMEN DE CAMBIOS ---
//
//   CPR:  2256  -->  564
//   Kp:   2.617 -->  ver autotuning_corregido.py
//   Ki:  20.000 -->  ver autotuning_corregido.py
//   Kd:   0.000 -->  ver autotuning_corregido.py
//   Setpoint: cualquier valor hasta ~15 rad/s (antes maximo ~4.5)
//
// =====================================================================

// ==========================================
// PID MOTOR DC — ESP32 + TB6612FNG
// Motor: MDC-ENCO-150R-9.5KG  9V 150RPM
// ==========================================

// ==========================================
// PID MOTOR DC — ESP32 + TB6612FNG
// Motor: MDC-ENCO-150R-9.5KG  9V 150RPM
// CPR = 432 (medido físicamente, 1 flanco)
// ==========================================
// ==========================================
// PID MOTOR DC — ESP32 + TB6612FNG
// Motor: MDC-ENCO-150R-9.5KG  9V 150RPM
// CPR = 432 (medido físicamente, 1 flanco)
// v2 — dirección corregida
// ==========================================
// ==========================================
// PID MOTOR DC — ESP32 + TB6612FNG
// Motor: MDC-ENCO-150R-9.5KG  9V 150RPM
// CPR = 432 (medido físicamente, 1 flanco)
// v2 — dirección corregida
// ==========================================

// -- Pines -----------------------------------------------------
const int pinPWM  = 25;
const int pinIN1  = 26;
const int pinIN2  = 27;
const int pinEncA = 32;
const int pinEncB = 33;

// -- Motor / Encoder -------------------------------------------
const float CPR     = 432.0f;
const float V_MOTOR = 9.0f;
const float Ts      = 0.05f;
const int   Ts_ms   = 50;
float ALPHA   = 0.7f;  // filtro pasa-bajas velocidad

// -- Parámetros PID --------------------------------------------
float Kp = 0.45f;
float Ki = 11.000f;
float Kd = 0.30000f;
int   N  = 10;

//const float Kp = 0.897f;
//const float Ki = 9.500f;
//const float Kd = 0.30000f;
//const int   N  = 10;
// -- Setpoint --------------------------------------------------
float setpoint = 14.0f;  // rad/s deseados

// -- Variables internas PID ------------------------------------
float errorActual   = 0.0f;
float errorAnterior = 0.0f;
float integral      = 0.0f;
float derivFiltrada = 0.0f;
float salidaPID     = 0.0f;
float velFiltrada   = 0.0f;
int   pwmOut        = 0;

// -- Encoder ---------------------------------------------------
volatile long cuentasEncoder = 0;
long          cuentasPrevias = 0;
unsigned long tiempoPrevio  = 0;

// --------------------------------------------------------------
void IRAM_ATTR leerEncoder() {
  if (digitalRead(pinEncB) > 0) cuentasEncoder++;
  else                            cuentasEncoder--;
}

long leerCuentasAtomic() {
  noInterrupts();
  long s = cuentasEncoder;
  interrupts();
  return s;
}

float calcVelocidad(long delta) {
  float v = (delta / CPR) * (2.0f * PI / Ts);
  velFiltrada = ALPHA * velFiltrada + (1.0f - ALPHA) * v;
  return velFiltrada;
}

int sign(float x) { return (x > 0) - (x < 0); }

void setMotor(float voltaje) {
  int pwm = (int)((fabs(voltaje) / V_MOTOR) * 255.0f);
  pwm = constrain(pwm, 0, 255);

  if (voltaje >= 0.0f) {
    digitalWrite(pinIN1, HIGH);  // dirección corregida
    digitalWrite(pinIN2, LOW);
  } else {
    digitalWrite(pinIN1, LOW);
    digitalWrite(pinIN2, HIGH);
  }

  pwmOut = pwm;
  analogWrite(pinPWM, pwmOut);
}

// --------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(10); // Evitar que la lectura serial bloquee el PID

  pinMode(pinPWM,  OUTPUT);
  pinMode(pinIN1,  OUTPUT);
  pinMode(pinIN2,  OUTPUT);
  pinMode(pinEncA, INPUT_PULLUP);
  pinMode(pinEncB, INPUT_PULLUP);

  attachInterrupt(digitalPinToInterrupt(pinEncA), leerEncoder, RISING);

  setMotor(0.0f);

  Serial.println("Setpoint(rad/s),Velocidad(rad/s),PWM");
  tiempoPrevio = millis();
}

// --------------------------------------------------------------
void loop() {
  // Procesar comandos seriales entrantes desde la web
  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\n');
    msg.trim();
    // Formato esperado: SP:14.0,KP:0.45,KI:11.0,KD:0.3,N:10,A:0.7
    int idxSP = msg.indexOf("SP:");
    int idxKP = msg.indexOf("KP:");
    int idxKI = msg.indexOf("KI:");
    int idxKD = msg.indexOf("KD:");
    int idxN  = msg.indexOf("N:");
    int idxA  = msg.indexOf("A:");
    
    if (idxSP != -1) setpoint = msg.substring(idxSP + 3).toFloat();
    if (idxKP != -1) Kp = msg.substring(idxKP + 3).toFloat();
    if (idxKI != -1) Ki = msg.substring(idxKI + 3).toFloat();
    if (idxKD != -1) Kd = msg.substring(idxKD + 3).toFloat();
    if (idxN  != -1) N = msg.substring(idxN + 2).toInt();
    if (idxA  != -1) ALPHA = msg.substring(idxA + 2).toFloat();
  }

  unsigned long tiempoActual = millis();

  if (tiempoActual - tiempoPrevio >= Ts_ms) {
    tiempoPrevio = tiempoActual;

    // A. Leer encoder de forma atómica
    long cuentasAhora = leerCuentasAtomic();
    long delta        = cuentasAhora - cuentasPrevias;
    cuentasPrevias    = cuentasAhora;

    // B. Velocidad con filtro pasa-bajas
    float velocidadRadS = calcVelocidad(delta);

    // C. PID con derivada filtrada
    errorActual   = setpoint - velocidadRadS;
    integral     += errorActual * Ts;
    // Filtro derivativo (Euler Hacia Atrás - Incondicionalmente estable)
    derivFiltrada = ((float)N * (errorActual - errorAnterior) + derivFiltrada) / (1.0f + (float)N * Ts);
    salidaPID = Kp * errorActual
              + Ki * integral
              + Kd * derivFiltrada;
    errorAnterior = errorActual;

    // D. Saturación + Anti-windup
    float salidaClamp = constrain(salidaPID, 0.0f, V_MOTOR);
    if (salidaPID != salidaClamp) {
      if (sign(errorActual) == sign(integral)) {
        integral -= errorActual * Ts;
      }
    }

    // E. Aplicar al motor
    setMotor(salidaClamp);

    // F. Telemetría serial
    Serial.print("Setpoint:");   Serial.print(setpoint, 2);
    Serial.print(",Velocidad:"); Serial.print(velocidadRadS, 2);
    Serial.print(",PWM:");       Serial.println(pwmOut);
  }
}