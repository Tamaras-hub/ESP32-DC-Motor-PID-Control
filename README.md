# DC Motor PID Control and Monitoring System

## 📖 Descripción

Este proyecto implementa un sistema completo de control de velocidad para un motor DC utilizando un ESP32, un encoder incremental y un controlador PID discreto. La interfaz web permite el monitoreo y ajuste de parámetros en tiempo real, sin necesidad de recompilar el firmware.

---

## 🚀 Características

- Control PID de velocidad en tiempo real.
- Medición mediante encoder incremental.
- Driver TB6612FNG para accionamiento del motor.
- Dashboard web responsivo con glassmorphism.
- Ajuste dinámico de parámetros PID.
- Comunicación bidireccional entre ESP32 y servidor web (WebSocket).
- Visualización de velocidad, PWM y set‑point.
- Registro de datos experimentales.
- Identificación de la planta mediante respuesta al escalón.
- Script de autotuning para diseño y ajuste del controlador.

---

## ⚙️ Hardware utilizado

- ESP32 Dev Module
- Motor DC MDC-ENCO-150R-9.5KG
- Encoder incremental integrado
- Driver TB6612FNG
- Fuente de alimentación de 9 V

---

## 🧠 Parámetros del controlador

| Parámetro | Valor |
| --------- | ----- |
| Kp        | 0.45 |
| Ki        | 11.0 |
| Kd        | 0.30 |
| N         | 10 |
| Ts        | 50 ms |
| Setpoint  | 14 rad/s |
| CPR       | 432 pulsos/vuelta |

---

## 🖥️ Dashboard Web

El dashboard muestra en tiempo real:

- Velocidad del motor.
- Señal PWM aplicada.
- Set‑point configurado.

### Funciones disponibles

- Visualización de velocidad.
- Visualización de PWM aplicado.
- Ajuste de set‑point.
- Ajuste de Kp, Ki y Kd.
- Monitoreo de variables del controlador.
- Comunicación en tiempo real con el ESP32.

#### Capturas

![Dashboard principal](images/dashboard1.png)
![Dashboard de monitoreo](images/dashboard2.png)

---

## 🌐 Ejecución del Dashboard

1. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```
2. **Ejecutar el servidor**
   ```bash
   python server/app.py
   ```
   También puede ejecutarse como:
   ```bash
   py server/app.py
   ```
3. **Abrir el navegador**
   Acceder a `http://localhost:5000`.

---

## 📈 Identificación del Sistema

La identificación de la planta se realiza mediante el método de respuesta al escalón.

### Procedimiento

1. Cargar el firmware `firmware/step_response/step_response.ino`.
2. Aplicar una entrada escalón al motor.
3. Medir la velocidad mediante el encoder.
4. Registrar los datos experimentales.
5. Guardar los resultados en `data/step_response.csv`.
6. Utilizar los datos para identificar la función de transferencia del sistema.

---

## 🤖 Autotuning del PID

El script `analysis/autotuning.py` utiliza los datos de identificación para calcular automáticamente los parámetros óptimos del controlador PID.

---

## 🔌 Esquema del Sistema

### Circuito de conexión

![Esquema Circuito](images/Esquema_circuito.png)

### Diagrama de control PID

![Diagrama PID](images/esquema_PID.png)

---

## 📂 Estructura del Proyecto

```
PID-Motor-Control/
│
├── analysis/
│   └── autotuning.py
│
├── data/
│   └── step_response.csv
│
├── docs/
│   ├── Identificacion_Modelo_Motor_DC.pdf
│   └── Practica_Control_PID.pdf
│
├── firmware/
│   ├── PID_MOTOR/
│   │   └── PID_MOTOR.ino
│   │
│   └── step_response/
│       └── step_response.ino
│
├── images/
│   ├── dashboard1.png
│   ├── dashboard2.png
│   ├── Esquema_circuito.png
│   └── esquema_PID.png
│
├── server/
│   └── app.py
│
├── web/
│   ├── index.html
│   ├── style.css
│   └── pid_sim.js
│
├── requirements.txt
├── README.md
└── LICENSE
```

---

## 📚 Documentación

La carpeta `docs/` contiene:

- Informe de identificación del sistema.
- Modelado matemático del motor.
- Diseño del controlador PID.
- Resultados experimentales.
- Análisis del desempeño del sistema.

---

## 👩💻 Autor

**Tamara Valeria Escobar Andrade, Santiago Rodríguez Bermeo, Dania Sofía Serrano Perdomo y Thomas Trujillo Cerquera** – Estudiantes de Ingeniería Mecatrónica.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia MIT.

---

## 🙏 Agradecimientos

- Gracias a la comunidad de **ESP32** y **Flask** por sus excelentes librerías.
- Inspiración en los diseños de **Glassmorphism** de Dribbble y **Micro‑animations** de CSS‑tricks.

---

*¡Disfruta controlando tu motor con estilo!*

## 📖 Descripción

Este proyecto implementa un sistema completo de control de velocidad para un motor DC utilizando un ESP32, un encoder incremental y un controlador PID discreto.

El sistema integra una interfaz web para monitoreo y ajuste de parámetros en tiempo real, permitiendo modificar el setpoint y las ganancias del controlador directamente desde el navegador sin necesidad de reprogramar el microcontrolador.

Además, el proyecto incluye la identificación experimental de la planta mediante respuesta al escalón, el diseño del controlador PID y herramientas de análisis para la sintonización automática de parámetros.

---

## 🚀 Características

* Control PID de velocidad en tiempo real.
* Medición mediante encoder incremental.
* Driver TB6612FNG para accionamiento del motor.
* Dashboard web responsivo.
* Ajuste dinámico de parámetros PID.
* Comunicación entre ESP32 y servidor web.
* Visualización de velocidad, PWM y referencia en tiempo real.
* Registro de datos experimentales.
* Identificación de la planta mediante respuesta al escalón.
* Script de autotuning para diseño y ajuste del controlador.

---

## ⚙️ Hardware utilizado

* ESP32 Dev Module
* Motor DC MDC-ENCO-150R-9.5KG
* Encoder incremental integrado
* Driver TB6612FNG
* Fuente de alimentación de 9 V

---

## 🧠 Parámetros del controlador

| Parámetro | Valor |
| --------- | ----- |
| Kp        | 0.45 |
| Ki        | 11.0 |
| Kd        | 0.30 |
| N         | 10 |
| Ts        | 50 ms |
| Setpoint  | 14 rad/s |
| CPR       | 432 pulsos/vuelta |

---

## 🖥️ Dashboard Web

El sistema incorpora una interfaz web para monitorear el comportamiento del motor y modificar los parámetros del controlador en tiempo real.

### Funciones disponibles

* Visualización de velocidad.
* Visualización de PWM aplicado.
* Ajuste de setpoint.
* Ajuste de Kp, Ki y Kd.
* Monitoreo de variables del controlador.
* Comunicación en tiempo real con el ESP32.

#### Capturas

![Dashboard principal](images/dashboard1.png)

![Dashboard de monitoreo](images/dashboard2.png)

---

## 🌐 Ejecución del Dashboard

1. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```
2. **Ejecutar el servidor**
   ```bash
   python server/app.py
   ```
   También puede ejecutarse como:
   ```bash
   py server/app.py
   ```
3. **Abrir el navegador**
   Acceder a `http://localhost:5000`.

---

## 📈 Identificación del Sistema

La identificación de la planta se realiza mediante el método de respuesta al escalón.

### Procedimiento

1. Cargar el firmware `firmware/step_response/step_response.ino`.
2. Aplicar una entrada escalón al motor.
3. Medir la velocidad mediante el encoder.
4. Registrar los datos experimentales.
5. Guardar los resultados en `data/step_response.csv`.
6. Utilizar los datos obtenidos para identificar la función de transferencia del sistema.

---

## 🤖 Autotuning del PID

El proyecto incluye una herramienta para análisis y sintonización automática:

```text
analysis/autotuning.py
```

Este script utiliza los datos experimentales obtenidos durante la identificación para calcular parámetros adecuados del controlador PID.

---

## 🔌 Esquema del Sistema

### Circuito de conexión

![Esquema Circuito](images/Esquema_circuito.png)

### Diagrama de control PID

![Diagrama PID](images/esquema_PID.png)

---

## 📂 Estructura del Proyecto

```
PID-Motor-Control/
│
├── analysis/
│   └── autotuning.py
│
├── data/
│   └── step_response.csv
│
├── docs/
│   ├── Identificacion_Modelo_Motor_DC.pdf
│   └── Practica_Control_PID.pdf
│
├── firmware/
│   ├── PID_MOTOR/
│   │   └── PID_MOTOR.ino
│   │
│   └── step_response/
│       └── step_response.ino
│
├── images/
│   ├── dashboard1.png
│   ├── dashboard2.png
│   ├── Esquema_circuito.png
│   └── esquema_PID.png
│
├── server/
│   └── app.py
│
├── web/
│   ├── index.html
│   ├── style.css
│   └── pid_sim.js
│
├── requirements.txt
├── README.md
└── LICENSE
```

---

## 📚 Documentación

La carpeta `docs/` contiene:

* Informe de identificación del sistema.
* Modelado matemático del motor.
* Diseño del controlador PID.
* Resultados experimentales.
* Análisis del desempeño del sistema.

---

## 👩💻 Autor

**Tamara Escobar** – Estudiante de Ingeniería Mecatrónica.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia MIT.

---

## 📖 Descripción

Este proyecto implementa un sistema completo de control de velocidad para un motor DC utilizando un ESP32, un encoder incremental y un controlador PID discreto.

El sistema integra una interfaz web para monitoreo y ajuste de parámetros en tiempo real, permitiendo modificar el setpoint y las ganancias del controlador directamente desde el navegador sin necesidad de reprogramar el microcontrolador.

Además, el proyecto incluye la identificación experimental de la planta mediante respuesta al escalón, el diseño del controlador PID y herramientas de análisis para la sintonización automática de parámetros.

---

## 🚀 Características

* Control PID de velocidad en tiempo real.
* Medición mediante encoder incremental.
* Driver TB6612FNG para accionamiento del motor.
* Dashboard web responsivo.
* Ajuste dinámico de parámetros PID.
* Comunicación entre ESP32 y servidor web.
* Visualización de velocidad, PWM y referencia en tiempo real.
* Registro de datos experimentales.
* Identificación de la planta mediante respuesta al escalón.
* Script de autotuning para diseño y ajuste del controlador.

---

## ⚙️ Hardware utilizado

* ESP32 Dev Module
* Motor DC MDC-ENCO-150R-9.5KG
* Encoder incremental integrado
* Driver TB6612FNG
* Fuente de alimentación de 9 V

---

## 🧠 Parámetros del controlador

| Parámetro | Valor |
| --------- | ----- |
| Kp        | 0.45 |
| Ki        | 11.0 |
| Kd        | 0.30 |
| N         | 10 |
| Ts        | 50 ms |
| Setpoint  | 14 rad/s |
| CPR       | 432 pulsos/vuelta |

---

## 🖥️ Dashboard Web

El sistema incorpora una interfaz web para monitorear el comportamiento del motor y modificar los parámetros del controlador en tiempo real.

### Funciones disponibles

* Visualización de velocidad.
* Visualización de PWM aplicado.
* Ajuste de setpoint.
* Ajuste de Kp, Ki y Kd.
* Monitoreo de variables del controlador.
* Comunicación en tiempo real con el ESP32.

#### Capturas

![Dashboard principal](images/dashboard1.png)

![Dashboard de monitoreo](images/dashboard2.png)

---

## 🌐 Ejecución del Dashboard

1. **Instalar dependencias**
   ```bash
   pip install -r requirements.txt
   ```
2. **Ejecutar el servidor**
   ```bash
   python server/app.py
   ```
   También puede ejecutarse como:
   ```bash
   py server/app.py
   ```
3. **Abrir el navegador**
   Acceder a `http://localhost:5000`.

---

## 📈 Identificación del Sistema

La identificación de la planta se realiza mediante el método de respuesta al escalón.

### Procedimiento

1. Cargar el firmware `firmware/step_response/step_response.ino`.
2. Aplicar una entrada escalón al motor.
3. Medir la velocidad mediante el encoder.
4. Registrar los datos experimentales.
5. Guardar los resultados en `data/step_response.csv`.
6. Utilizar los datos obtenidos para identificar la función de transferencia del sistema.

---

## 🤖 Autotuning del PID

El proyecto incluye una herramienta para análisis y sintonización automática:

```text
analysis/autotuning.py
```

Este script utiliza los datos experimentales obtenidos durante la identificación para calcular parámetros adecuados del controlador PID.

---

## 🔌 Esquema del Sistema

### Circuito de conexión

![Esquema Circuito](images/Esquema_circuito.png)

### Diagrama de control PID

![Diagrama PID](images/esquema_PID.png)

---

## 📂 Estructura del Proyecto

```
PID-Motor-Control/
│
├── analysis/
│   └── autotuning.py
│
├── data/
│   └── step_response.csv
│
├── docs/
│   ├── Identificacion_Modelo_Motor_DC.pdf
│   └── Practica_Control_PID.pdf
│
├── firmware/
│   ├── PID_MOTOR/
│   │   └── PID_MOTOR.ino
│   │
│   └── step_response/
│       └── step_response.ino
│
├── images/
│   ├── dashboard1.png
│   ├── dashboard2.png
│   ├── Esquema_circuito.png
│   └── esquema_PID.png
│
├── server/
│   └── app.py
│
├── web/
│   ├── index.html
│   ├── style.css
│   └── pid_sim.js
│
├── requirements.txt
├── README.md
└── LICENSE
```

---

## 📚 Documentación

La carpeta `docs/` contiene:

* Informe de identificación del sistema.
* Modelado matemático del motor.
* Diseño del controlador PID.
* Resultados experimentales.
* Análisis del desempeño del sistema.

---

## 👩💻 Autor

**Tamara Valeria Escobar Andrade, Santiago Rodríguez Bermeo, Dania Sofía Serrano Perdomo y Thomas Trujillo Cerquera** – Estudiantes de Ingeniería Mecatrónica.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia MIT.


**Tamara Escobar** – Estudiante de Ingeniería Mecatrónica.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia MIT.


---

## 📖 Descripción del proyecto

Este repositorio contiene una **dashboard web** para el control y visualización en tiempo real de un motor DC gestionado por un ESP32 mediante un algoritmo PID.  La interfaz está diseñada con una estética premium (glassmorphism, tipografía moderna y micro‑animaciones) y mantiene la lógica funcional completa del controlador.

- **Frontend**: HTML5, CSS3 (variables, gradientes, modo oscuro) y JavaScript para la comunicación WebSocket con el ESP32.
- **Backend**: Servidor ligero (Python/Flask) que expone la API del PID y sirve la página estática.
- **Firmware**: Código Arduino/ESP‑IDF que ejecuta el algoritmo PID y transmite datos vía WebSocket.

---

## 🚀 Características principales

- Interfaz de usuario moderna y responsiva.
- Visualización en tiempo real de la señal de error, salida PWM y set‑point.
- Ajuste dinámico de los parámetros *Kp*, *Ki* y *Kd* directamente desde el navegador.
- Soporte para modo oscuro y efectos de vidrio (glassmorphism).
- Comunicación bidireccional fiable con ESP32 usando WebSockets.
- Documentación completa y script de instalación automática.

---

## 🛠️ Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Python      | 3.9            |
| pip         | latest         |
| Node (opcional, solo para desarrollo) | 14.x |
| Arduino IDE / ESP‑IDF | última versión |
| Git         | cualquier      |

---

## 📦 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/PID_MOTOR.git
   cd PID_MOTOR
   ```
2. **Crear entorno virtual y activar**
   ```bash
   python -m venv venv
   venv\Scripts\activate   # Windows
   # source venv/bin/activate   # Linux/macOS
   ```
3. **Instalar dependencias del backend**
   ```bash
   pip install -r requirements.txt
   ```
4. **Compilar y cargar el firmware en el ESP32**
   - Abrir `firmware/esp32_pid.ino` con Arduino IDE.
   - Seleccionar la placa **ESP32 Dev Module** y el puerto correcto.
   - Pulsar **Upload**.
5. **Ejecutar el servidor**
   ```bash
   python app.py
   ```
   La aplicación quedará disponible en `http://localhost:5000`.

---



## 🧑‍💻 Contribuir al desarrollo

1. **Crear una rama** para tu feature o bug‑fix:
   ```bash
   git checkout -b feature/nueva‑interfaz
   ```
2. **Realizar los cambios** y probar localmente.
3. **Commit** con mensajes claros siguiendo el estilo **Conventional Commits**.
4. **Push** y abrir un Pull Request.

> **Tip:** Usa `npm run lint` (si tienes `node` instalado) para mantener la calidad del CSS/JS.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulte el archivo `LICENSE` para más detalles.

---

## 🙏 Agradecimientos

- Gracias a la comunidad de **ESP32** y **Flask** por sus excelentes librerías.
- Inspiración en los diseños de **Glassmorphism** de Dribbble y **Micro‑animations** de CSS‑tricks.

---

*¡Disfruta controlando tu motor con estilo!*
