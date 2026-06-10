// ============================================================
//  pid_sim.js — Simulador PID Motor DC
//  Planta discreta: G(z) = 1.8818·z / (z - 0.68281)
//  Motor: MDC-ENCO-150R-9.5KG | ESP32 + TB6612FNG
// ============================================================

'use strict';

// ── Parámetros de la planta (motor real identificado) ──────
const PLANT = {
  b: 1.8818,   // numerador
  a: -0.68281, // coeficiente (z - 0.68281 → y[k] = b*u[k-1] + 0.68281*y[k-1])
  V_MOTOR: 9.0,
  Ts: 0.05,    // 50 ms
  maxRadS: 20.0,
};

// ── Estado de la UI ────────────────────────────────────────
let currentView = 'velocity';
let simData = null;
let chart = null;

// ── Estado Web Serial ──────────────────────────────────────
let port;
let reader;
let writer;
let isRealMode = false;
let realData = { time: [], velocity: [], setpoints: [], errors: [], pwm: [], integral: [] };
let realTimeOffset = 0;

// ── Obtener valores de los sliders ────────────────────────
const sliders = {
  sp: document.getElementById('slider-sp'),
  kp: document.getElementById('slider-kp'),
  ki: document.getElementById('slider-ki'),
  kd: document.getElementById('slider-kd'),
  n: document.getElementById('slider-n'),
  alpha: document.getElementById('slider-alpha'),
};
const valLabels = {
  sp: document.getElementById('val-sp'),
  kp: document.getElementById('val-kp'),
  ki: document.getElementById('val-ki'),
  kd: document.getElementById('val-kd'),
  n: document.getElementById('val-n'),
  alpha: document.getElementById('val-alpha'),
};
const ptLabels = {
  kp: document.getElementById('pt-kp'),
  ki: document.getElementById('pt-ki'),
  kd: document.getElementById('pt-kd'),
  n: document.getElementById('pt-n'),
  sp: document.getElementById('pt-sp'),
  alpha: document.getElementById('pt-alpha'),
};

function getParams() {
  return {
    sp: parseFloat(sliders.sp.value),
    Kp: parseFloat(sliders.kp.value),
    Ki: parseFloat(sliders.ki.value),
    Kd: parseFloat(sliders.kd.value),
    N: parseInt(sliders.n.value),
    alpha: parseFloat(sliders.alpha.value),
  };
}

// ── Formatear número según magnitud ───────────────────────
function fmt(v, d = 3) {
  if (v === null || isNaN(v)) return '—';
  return v.toFixed(d);
}

// ── Actualizar indicadores de valor en tiempo real ────────
function updateLabels() {
  const p = getParams();
  const decs = { sp: 1, kp: 2, ki: 2, kd: 3, n: 0, alpha: 2 };
  for (const key of Object.keys(sliders)) {
    const val = key === 'n' ? parseInt(sliders[key].value) : parseFloat(sliders[key].value);
    valLabels[key].textContent = val.toFixed(decs[key]);
  }
  ptLabels.kp.textContent = p.Kp.toFixed(3);
  ptLabels.ki.textContent = p.Ki.toFixed(3);
  ptLabels.kd.textContent = p.Kd.toFixed(3);
  ptLabels.n.textContent = p.N;
  ptLabels.sp.textContent = p.sp.toFixed(1) + ' rad/s';
  ptLabels.alpha.textContent = p.alpha.toFixed(2);
}

// ── Vincular sliders ───────────────────────────────────────
for (const key of Object.keys(sliders)) {
  sliders[key].addEventListener('input', () => {
    updateLabels();
    if (isRealMode) sendParamsSerial();
  });
}
updateLabels();

// ============================================================
//  SIMULACIÓN — discreto paso a paso
// ============================================================
function simulate(params, steps = 400) {
  const { sp, Kp, Ki, Kd, N } = params;
  const alpha = params.alpha;
  const { b, a, V_MOTOR, Ts } = PLANT;

  // Arrays de resultados
  const time = [];
  const velocity = [];
  const setpoints = [];
  const errors = [];
  const pwmArr = [];
  const intArr = [];

  // Estado planta (modelo ARX de primer orden)
  let y_prev = 0;   // salida anterior del motor [rad/s]
  let u_prev = 0;   // entrada anterior (voltaje)

  // Estado PID
  let integral = 0;
  let errorPrev = 0;
  let derivFiltrada = 0;
  let velFiltrada = 0;

  for (let k = 0; k < steps; k++) {
    const t = k * Ts;

    // ── Setpoint: step en t=0 ──
    const spk = (k >= 0) ? sp : 0;

    // ── Dinámica de la planta: y[k] = b·u[k-1] + 0.68281·y[k-1] ──
    const y_raw = b * u_prev + 0.68281 * y_prev;
    // Saturar a máxima velocidad física
    const y_sat = Math.max(-PLANT.maxRadS, Math.min(PLANT.maxRadS, y_raw));
    // Filtro pasa-bajas (simula el de velocidad en el .ino)
    velFiltrada = alpha * velFiltrada + (1 - alpha) * y_sat;

    // ── PID con derivada filtrada (igual al .ino) ──
    const errorActual = spk - velFiltrada;
    integral += errorActual * Ts;

    derivFiltrada = N * (errorActual - errorPrev)
      + (1 - N * Ts) * derivFiltrada;

    let salidaPID = Kp * errorActual + Ki * integral + Kd * derivFiltrada;

    // Saturación + Anti-windup
    const salidaClamp = Math.max(0, Math.min(salidaPID, V_MOTOR));
    if (salidaPID !== salidaClamp) {
      const signError = Math.sign(errorActual);
      const signIntegral = Math.sign(integral);
      if (signError === signIntegral) {
        integral -= errorActual * Ts;
      }
    }

    // PWM equivalente
    const pwm = Math.round((Math.abs(salidaClamp) / V_MOTOR) * 255);

    // Guardar datos
    time.push(t);
    velocity.push(parseFloat(velFiltrada.toFixed(4)));
    setpoints.push(spk);
    errors.push(parseFloat(errorActual.toFixed(4)));
    pwmArr.push(pwm);
    intArr.push(parseFloat(integral.toFixed(4)));

    // ── Actualizar estado para siguiente paso ──
    y_prev = y_sat;
    u_prev = salidaClamp;
    errorPrev = errorActual;
  }

  return { time, velocity, setpoints, errors, pwm: pwmArr, integral: intArr };
}

// ============================================================
//  MÉTRICAS
// ============================================================
function calcMetrics(data) {
  const { time, velocity, setpoints, errors } = data;
  const sp = setpoints[0];
  if (sp === 0) return { overshoot: 0, rise: 0, settle: 0, steady: 0, iae: 0 };

  const n = time.length;
  const Ts = PLANT.Ts;

  // Sobreimpulso
  const maxV = Math.max(...velocity);
  const overshoot = Math.max(0, ((maxV - sp) / sp) * 100);

  // Tiempo de subida (10% → 90% del setpoint)
  let t10 = null, t90 = null;
  for (let i = 0; i < n; i++) {
    if (t10 === null && velocity[i] >= 0.1 * sp) t10 = time[i];
    if (t90 === null && velocity[i] >= 0.9 * sp) { t90 = time[i]; break; }
  }
  const rise = (t10 !== null && t90 !== null) ? t90 - t10 : null;

  // Tiempo de asentamiento (±2% del setpoint)
  const band = 0.02 * sp;
  let settle = null;
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(velocity[i] - sp) > band) {
      settle = time[Math.min(i + 1, n - 1)];
      break;
    }
  }
  if (settle === null) settle = 0;

  // Error en estado estacionario (últimos 20 puntos)
  const last = velocity.slice(-20);
  const steadyV = last.reduce((a, b) => a + b, 0) / last.length;
  const steady = Math.abs(sp - steadyV);

  // IAE (Integral Absolute Error)
  let iae = 0;
  for (const e of errors) iae += Math.abs(e) * Ts;

  return { overshoot, rise, settle, steady, iae };
}

// ============================================================
//  GRÁFICA — Chart.js
// ============================================================
function initChart() {
  const ctx = document.getElementById('pidChart').getContext('2d');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Setpoint',
          data: [],
          borderColor: 'rgba(140,148,200,0.6)',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0,
          yAxisID: 'y',
        },
        {
          label: 'Velocidad',
          data: [],
          borderColor: '#6c63ff',
          backgroundColor: 'rgba(108,99,255,0.08)',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#8890b8',
            usePointStyle: true,
            pointStyleWidth: 12,
            font: { family: 'Inter', size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#1a1e30',
          borderColor: '#2a2f4a',
          borderWidth: 1,
          titleColor: '#e8ecff',
          bodyColor: '#8890b8',
          callbacks: {
            label: ctx => {
              const u = currentView === 'pwm' ? '' : ' rad/s';
              return ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)}${u}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Tiempo (s)', color: '#555e80', font: { size: 11 } },
          grid: { color: 'rgba(42,47,74,0.6)' },
          ticks: { color: '#555e80', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 12 },
        },
        y: {
          title: { display: true, text: 'rad/s', color: '#555e80', font: { size: 11 } },
          grid: { color: 'rgba(42,47,74,0.6)' },
          ticks: { color: '#555e80', font: { family: 'JetBrains Mono', size: 10 } },
        },
      },
    },
  });
}

function updateChart(data) {
  if (!chart) return;

  // Desactivar animaciones en modo real para evitar lag y saltos en la gráfica
  if (isRealMode) {
    chart.options.animation = false;
  } else {
    chart.options.animation = { duration: 600, easing: 'easeOutQuart' };
  }

  const labels = data.time;
  let ds0, ds1;

  if (currentView === 'velocity') {
    chart.options.scales.y.title.text = 'Velocidad (rad/s)';
    ds0 = { label: 'Setpoint', data: data.setpoints, borderColor: 'rgba(140,148,200,0.6)', borderDash: [6, 4] };
    ds1 = { label: 'Velocidad', data: data.velocity, borderColor: '#6c63ff', backgroundColor: 'rgba(108,99,255,0.08)' };
  } else if (currentView === 'error') {
    chart.options.scales.y.title.text = 'Error (rad/s)';
    ds0 = { label: 'Error', data: data.errors, borderColor: '#ff4d6a', backgroundColor: 'rgba(255,77,106,0.08)', borderDash: [] };
    ds1 = { label: 'Cero', data: data.time.map(() => 0), borderColor: 'rgba(140,148,200,0.3)', borderDash: [4, 4] };
  } else { // pwm
    chart.options.scales.y.title.text = 'PWM (0–255)';
    ds0 = { label: 'PWM', data: data.pwm, borderColor: '#ff8c42', backgroundColor: 'rgba(255,140,66,0.08)', borderDash: [] };
    ds1 = { label: 'Max', data: data.time.map(() => 255), borderColor: 'rgba(140,148,200,0.3)', borderDash: [4, 4] };
  }

  chart.data.labels = labels;
  chart.data.datasets[0] = {
    ...chart.data.datasets[0],
    label: ds0.label,
    data: ds0.data,
    borderColor: ds0.borderColor,
    backgroundColor: ds0.backgroundColor || 'transparent',
    borderDash: ds0.borderDash ?? [],
    pointRadius: 0,
    tension: 0,
    fill: false,
    yAxisID: 'y',
  };
  chart.data.datasets[1] = {
    ...chart.data.datasets[1],
    label: ds1.label,
    data: ds1.data,
    borderColor: ds1.borderColor,
    backgroundColor: ds1.backgroundColor || 'transparent',
    borderDash: ds1.borderDash ?? [],
    pointRadius: 0,
    tension: 0.3,
    fill: currentView === 'velocity',
    yAxisID: 'y',
  };
  chart.update();
}

// ============================================================
//  ACTUALIZAR MÉTRICAS EN UI
// ============================================================
function displayMetrics(m) {
  document.getElementById('mv-overshoot').textContent = m.overshoot !== null ? m.overshoot.toFixed(1) : '—';
  document.getElementById('mv-rise').textContent = m.rise !== null ? m.rise.toFixed(2) : '—';
  document.getElementById('mv-settle').textContent = m.settle !== null ? m.settle.toFixed(2) : '—';
  document.getElementById('mv-steady').textContent = m.steady !== null ? m.steady.toFixed(3) : '—';
  document.getElementById('mv-iae').textContent = m.iae !== null ? m.iae.toFixed(2) : '—';

  // Colores dinámicos para sobreimpulso
  const ovEl = document.getElementById('metric-overshoot');
  ovEl.style.borderColor = m.overshoot > 20 ? 'rgba(255,77,106,.4)' : m.overshoot > 10 ? 'rgba(255,140,66,.4)' : 'var(--border)';

  // Indicador de estabilidad
  updateStability(m);
}

function updateStability(m) {
  const dot = document.getElementById('stabDot');
  const text = document.getElementById('stabText');
  const fill = document.getElementById('gmFill');
  const gmV = document.getElementById('gmValue');

  // Heurística simple de estabilidad basada en sobreimpulso y error estacionario
  const ov = m.overshoot;
  const ss = m.steady;

  let status, label, gmPct;
  if (ss > 2 || ov > 50) {
    status = 'unstable'; label = 'Inestable / Divergente'; gmPct = 95;
  } else if (ov > 20 || ss > 0.5) {
    status = 'warning'; label = 'Marginalmente Estable'; gmPct = 60;
  } else {
    status = 'stable'; label = 'Estable ✓'; gmPct = Math.max(5, 100 - ov * 3 - ss * 20);
  }

  dot.className = 'stab-dot ' + status;
  text.textContent = label;
  fill.style.width = gmPct + '%';
  gmV.textContent = gmPct.toFixed(0) + '% margen';
}

// ============================================================
//  EJECUTAR SIMULACIÓN COMPLETA
// ============================================================
function runSimulation() {
  const params = getParams();
  const data = simulate(params, 400);
  const metrics = calcMetrics(data);

  simData = data;

  // Mostrar gráfica
  document.getElementById('chartOverlay').classList.add('hidden');
  updateChart(data);
  displayMetrics(metrics);

  // Flash en badge
  const badge = document.getElementById('statusBadge');
  badge.style.background = 'rgba(0,229,125,.2)';
  setTimeout(() => badge.style.background = '', 800);
}



// ============================================================
//  EVENT LISTENERS (UI)
// ============================================================
document.getElementById('btn-simulate').addEventListener('click', () => {
  runSimulation();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  // Restaurar valores estables
  sliders.sp.value = 14.0;
  sliders.kp.value = 0.15;
  sliders.ki.value = 2.0;
  sliders.kd.value = 0.01;
  sliders.n.value = 20;
  sliders.alpha.value = 0.75;
  updateLabels();
  runSimulation();
});

// Chart view toggle
document.querySelectorAll('.chart-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    if (simData) updateChart(simData);
  });
});

// ============================================================
//  WEB SERIAL & MODO HARDWARE
// ============================================================

const btnUsb = document.getElementById('btn-connect-usb');
const modeToggle = document.getElementById('mode-toggle-checkbox');
const modeLabel = document.getElementById('mode-label');

modeToggle.addEventListener('change', (e) => {
  isRealMode = e.target.checked;
  modeLabel.textContent = isRealMode ? 'Hardware Real' : 'Simulación';
  modeLabel.className = 'mode-label ' + (isRealMode ? 'real-mode' : 'sim-mode');

  if (!isRealMode) {
    runSimulation(); // volver a simular al desactivar
  } else {
    // Si entramos a modo real, vaciamos datos para empezar fresco
    realData = { time: [], velocity: [], setpoints: [], errors: [], pwm: [], integral: [] };
    realTimeOffset = 0;
    if (port) sendParamsSerial();
  }
});

btnUsb.addEventListener('click', async () => {
  if (port) {
    // Desconectar
    try {
      if (reader) await reader.cancel();
      if (writer) await writer.close();
      await port.close();
    } catch (e) { }
    port = null;
    btnUsb.textContent = '🔌 Conectar ESP32';
    btnUsb.classList.remove('connected');
    document.getElementById('statusBadge').textContent = '● DESCONECTADO';
    document.getElementById('statusBadge').className = 'badge badge-red';
  } else {
    // Conectar
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      writer = port.writable.getWriter();

      btnUsb.textContent = '🔌 Desconectar';
      btnUsb.classList.add('connected');
      document.getElementById('statusBadge').textContent = '● CONECTADO';
      document.getElementById('statusBadge').className = 'badge badge-green';

      // Pasar a modo real automáticamente
      modeToggle.checked = true;
      modeToggle.dispatchEvent(new Event('change'));

      readSerialLoop();
    } catch (e) {
      console.error(e);
      alert("Error al conectar: " + e.message);
    }
  }
});

async function sendParamsSerial() {
  if (!port || !writer || !isRealMode) return;
  const p = getParams();
  // Formato: SP:14.0,KP:0.45,KI:11.0,KD:0.3,N:10,A:0.7
  const cmd = `SP:${p.sp},KP:${p.Kp},KI:${p.Ki},KD:${p.Kd},N:${p.N},A:${p.alpha}\n`;
  const data = new TextEncoder().encode(cmd);
  await writer.write(data);
}

async function readSerialLoop() {
  while (port && port.readable) {
    reader = port.readable.getReader();
    try {
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        buffer += text;

        let lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;

          if (line.includes('Setpoint:') && line.includes('Velocidad:')) {
            const parts = line.split(',');
            let sp = 0, v = 0, pwm = 0;
            parts.forEach(p => {
              if (p.startsWith('Setpoint:')) sp = parseFloat(p.split(':')[1]);
              if (p.startsWith('Velocidad:')) v = parseFloat(p.split(':')[1]);
              if (p.startsWith('PWM:')) pwm = parseInt(p.split(':')[1]);
            });
            appendRealData(sp, v, pwm);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      reader.releaseLock();
    }
  }
}

function appendRealData(sp, v, pwm) {
  if (!isRealMode) return;

  const MAX_POINTS = 400; // 20 segundos aprox a 50ms (400 muestras)

  realData.time.push(realTimeOffset);
  realData.setpoints.push(sp);
  realData.velocity.push(v);
  realData.errors.push(sp - v);
  realData.pwm.push(pwm);

  realTimeOffset += PLANT.Ts;

  if (realData.time.length > MAX_POINTS) {
    realData.time.shift();
    realData.setpoints.shift();
    realData.velocity.shift();
    realData.errors.shift();
    realData.pwm.shift();
  }

  simData = realData;
  updateChart(realData);

  // Actualizar algunas métricas simples
  const m = calcMetrics(realData);
  displayMetrics(m);
}

// ── Inicializar ────────────────────────────────────────────
initChart();
runSimulation();
