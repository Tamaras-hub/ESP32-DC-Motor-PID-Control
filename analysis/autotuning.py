"""
Auto-Tuning PID por Optimización (Evolución Diferencial)
=========================================================
Planta: Motor DC identificado  G(z) = 1.8818·z / (z - 0.68281),  Ts = 50 ms
Criterio: ITAE + penalización de sobreimpulso + error en estado estacionario

Salida: Kp, Ki, Kd listos para copiar al código del ESP32.
"""

import control as ctrl
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import differential_evolution
import warnings
warnings.filterwarnings('ignore')

# ─── Planta ───────────────────────────────────────────────────────────────────
Ts  = 0.02
Gz  = ctrl.TransferFunction([1.010016, 0], [1, -0.80017], dt=Ts)
N   = 10        # coeficiente del filtro derivativo (fijo)

# ─── PID Discreto con derivada filtrada ───────────────────────────────────────
#   P  = Kp
#   I  = Ki·(Ts/2)·(z+1)/(z-1)           Tustin
#   D  = Kd·N·(z-1) / (z-(1-N·Ts))       Derivada filtrada
def pid_z(kp, ki, kd):
    P = ctrl.TransferFunction([kp], [1], dt=Ts)
    I = ki * (Ts/2) * ctrl.TransferFunction([1, 1], [1, -1], dt=Ts)
    D = kd * N * ctrl.TransferFunction([1, -1], [1, -(1 - N*Ts)], dt=Ts)
    return P + I + D

# ─── Función de Costo (ITAE + penalizaciones) ─────────────────────────────────
#
#   ITAE = ∫ t·|e(t)| dt   →  respuesta rápida y sin oscilaciones tardías
#   Penalización sobreimpulso  →  protege el motor de picos mecánicos
#   Penalización error SS      →  garantiza seguimiento perfecto
#
def cost(params):
    kp, ki, kd = params
    try:
        LC = ctrl.feedback(pid_z(kp, ki, kd) * Gz, 1)

        # Descarta sistemas inestables
        if np.any(np.abs(ctrl.poles(LC)) >= 1.0):
            return 1e10

        t, y = ctrl.step_response(LC)

        if np.max(np.abs(y)) > 1e4 or np.any(np.isnan(y)):
            return 1e10

        error       = 1.0 - y
        itae        = np.trapezoid(t * np.abs(error), t)
        overshoot   = max(0.0, np.max(y) - 1.0)
        ss_error    = abs(np.mean(y[int(0.8*len(y)):]) - 1.0)

        return itae + 200 * overshoot**2 + 80 * ss_error

    except Exception:
        return 1e10

# ─── Optimización ─────────────────────────────────────────────────────────────
#   Bounds ajustados para G_corregida (ganancia 4x mayor que G_original):
#   los parámetros óptimos son ~4x menores que los de la planta original.
#
#   G_original  → Kp ∈ [0.01, 6.0],  Ki ∈ [0, 20],  Kd ∈ [0, 1.0]
#   G_corregida → Kp ∈ [0.01, 3.0],  Ki ∈ [0, 10],  Kd ∈ [0, 0.5]
bounds = [(0.01, 3.0), (0.0, 10.0), (0.0, 0.5)]

print("=" * 55)
print("  AUTO-TUNING PID — Motor DC (Evolución Diferencial)")
print("=" * 55)
print(f"  Planta:  G(z) = 1.8818z / (z - 0.68281),  Ts={Ts}s")
print(f"  Filtro derivativo:  N = {N}")
print()
print("  Buscando Kp, Ki, Kd óptimos...")
print("  (puede tardar 20-60 s)")
print()

result = differential_evolution(
    cost,
    bounds,
    seed=42,
    maxiter=300,
    popsize=20,
    tol=1e-7,
    mutation=(0.5, 1.5),
    recombination=0.9,
    disp=True,
    workers=1,
)

Kp_opt, Ki_opt, Kd_opt = result.x

# ─── Resultados ───────────────────────────────────────────────────────────────
LC_opt  = ctrl.feedback(pid_z(Kp_opt, Ki_opt, Kd_opt) * Gz, 1)
t, y    = ctrl.step_response(LC_opt)
poles   = ctrl.poles(LC_opt)
stable  = np.all(np.abs(poles) < 1.0)

# Métricas
ov      = max(0.0, (np.max(y) - 1.0) * 100)
ss_err  = abs(np.mean(y[int(0.8*len(y)):]) - 1.0) * 100
itae_v  = np.trapezoid(t * np.abs(1.0 - y), t)

idx_10  = np.argmax(y >= 0.10)
idx_90  = np.argmax(y >= 0.90)
tr      = (t[idx_90] - t[idx_10]) if idx_90 > idx_10 else float('nan')

band    = 0.02
ts_val  = t[-1]
for i in range(len(t)-1, -1, -1):
    if abs(y[i] - 1.0) > band:
        ts_val = t[min(i+1, len(t)-1)]
        break

# Función de transferencia lazo cerrado simplificada (cancela polos/ceros comunes)
LC_min  = ctrl.minreal(LC_opt, tol=1e-3)
OL      = pid_z(Kp_opt, Ki_opt, Kd_opt) * Gz      # lazo abierto C(z)·G(z)
poles_min = ctrl.poles(LC_min)

print()
print("=" * 55)
print("  RESULTADO DEL AUTO-TUNING")
print("=" * 55)
print(f"  Kp = {Kp_opt:.5f}")
print(f"  Ki = {Ki_opt:.5f}")
print(f"  Kd = {Kd_opt:.5f}")
print(f"  N  = {N}  (filtro derivativo)")
print()
print(f"  Estado del sistema : {'ESTABLE ✔' if stable else 'INESTABLE ✖'}")
print(f"  Sobreimpulso       : {ov:.2f} %")
print(f"  Error SS           : {ss_err:.3f} %")
print(f"  Tiempo de subida   : {tr:.4f} s")
print(f"  Tiempo asentamiento: {ts_val:.4f} s")
print(f"  ITAE               : {itae_v:.6f}")
print()
print("─" * 55)
print("  FUNCIÓN DE TRANSFERENCIA — LAZO CERRADO")
print("─" * 55)
print()
print("  >> Sin simplificar (grado real de la librería):")
print(f"     Número de polos: {len(poles)}")
print(f"  {LC_opt}")
print()
print("  >> Simplificada  (minreal, cancelando polos/ceros):")
print(f"     Número de polos: {len(poles_min)}")
print(f"  {LC_min}")
print()
print("─" * 55)
print("  POLOS DEL LAZO CERRADO (simplificado)")
print("─" * 55)
for i, p in enumerate(poles_min):
    dentro = "DENTRO  ✔" if abs(p) < 1.0 else "FUERA   ✖"
    if abs(p.imag) < 1e-8:
        print(f"  polo {i+1}: {p.real:+.5f}        |z|={abs(p):.5f}  {dentro}")
    else:
        print(f"  polo {i+1}: {p.real:+.5f} {p.imag:+.5f}j  |z|={abs(p):.5f}  {dentro}")
print()
print("  Nota: todos los polos deben estar dentro del")
print("        círculo unitario (|z| < 1) para estabilidad.")
print()
print("─" * 55)
print("  CÓDIGO PARA ESP32  (pegar en tu sketch)")
print("─" * 55)
print(f"""
  // ── Parámetros PID ─────────────────────────────
  const float Ts  = {Ts}f;          // Tiempo de muestreo (s)
  const float Kp  = {Kp_opt:.5f}f;
  const float Ki  = {Ki_opt:.5f}f;
  const float Kd  = {Kd_opt:.5f}f;
  const int   N   = {N};            // Coeficiente filtro derivativo

  // ── PID en el loop (llamar cada Ts segundos) ───
  float error      = setpoint - medicion;
  integral        += error * Ts;
  float derivada   = N * (error - error_prev) - (N*Ts - 1.0f) * deriv_prev;
  float salida     = Kp*error + Ki*integral + Kd*derivada;
  error_prev       = error;
  deriv_prev       = derivada;
  // ──────────────────────────────────────────────
""")
print("=" * 55)

# ─── Gráfica ──────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
fig.suptitle('Auto-Tuning PID — Motor DC', fontsize=13, fontweight='bold')

# — Respuesta al escalón —
ax1 = axes[0]
ax1.plot(t, y,    'b-',  lw=2,   label=f'Respuesta (Kp={Kp_opt:.3f}, Ki={Ki_opt:.3f}, Kd={Kd_opt:.4f})')
ax1.axhline(1.0,  color='r',  linestyle='--', lw=1.5, label='Setpoint')
ax1.axhspan(0.98, 1.02, alpha=0.12, color='green', label='Banda ±2 %')
ax1.set_title('Respuesta al Escalón (Lazo Cerrado)')
ax1.set_xlabel('Tiempo (s)')
ax1.set_ylabel('Velocidad normalizada')
ax1.legend(fontsize=8)
ax1.grid(True, alpha=0.3)
ax1.set_ylim(-0.05, max(1.5, np.max(y) + 0.1))

# Anotar métricas
ax1.annotate(f'Sobreimpulso: {ov:.1f}%\nT.asentamiento: {ts_val:.3f}s\nError SS: {ss_err:.2f}%',
             xy=(0.98, 0.05), xycoords='axes fraction',
             ha='right', va='bottom', fontsize=9,
             bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.85))

# — Diagrama de polos en el plano Z —
ax2 = axes[1]
theta = np.linspace(0, 2*np.pi, 400)
ax2.plot(np.cos(theta), np.sin(theta), 'k--', lw=0.8, label='Circunferencia unitaria')
ax2.axhline(0, color='gray', lw=0.5)
ax2.axvline(0, color='gray', lw=0.5)
ax2.scatter(poles_min.real, poles_min.imag, marker='x', s=120, color='red', lw=2,
            label=f'Polos LC ({len(poles_min)} polos)')
ax2.scatter([1], [0], marker='o', s=80, color='green', lw=2, label='z = 1')
# Anotar cada polo con su módulo
for p in poles_min:
    ax2.annotate(f'|z|={abs(p):.3f}', xy=(p.real, p.imag),
                 xytext=(8, 8), textcoords='offset points', fontsize=7, color='darkred')
ax2.set_title(f'Diagrama de Polos — Plano Z  ({len(poles_min)} polos)')
ax2.set_xlabel('Re(z)')
ax2.set_ylabel('Im(z)')
ax2.legend(fontsize=8)
ax2.grid(True, alpha=0.3)
ax2.set_aspect('equal')
lim = max(1.3, np.max(np.abs(poles_min)) + 0.2)
ax2.set_xlim(-lim, lim)
ax2.set_ylim(-lim, lim)

plt.tight_layout()
plt.show()
