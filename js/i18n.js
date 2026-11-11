/* UI strings and human-readable phrases for every protocol enum/bit, ES + EN.
 *
 * Bit phrase arrays are indexed by bit number and must stay aligned with
 * PROTECT_BITS / WARNING_BITS in protocol.js (there is a test for that).
 */

export const LANGS = ["es", "en"];

export function detectLang() {
  try {
    const saved = localStorage.getItem("antbms.lang");
    if (LANGS.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("es") ? "es" : "en";
}

export function saveLang(lang) {
  try { localStorage.setItem("antbms.lang", lang); } catch { /* ignore */ }
}

export const STRINGS = {
  es: {
    appName: "ANT BMS Monitor",
    welcomeTitle: "Tu batería, en el navegador",
    welcomeLead:
      "Conecta por Bluetooth con tu BMS ANT y mira el estado de la batería en tiempo real: nivel de carga, celdas, temperaturas y alarmas explicadas en lenguaje claro. Sin instalar nada.",
    welcomeSupport:
      "Funciona en Chrome y Edge, en Android y Windows. En iPhone/iPad no funciona: Safari no tiene Web Bluetooth.",
    welcomeReadOnly:
      "Solo lectura: esta app únicamente pide datos. Nunca cambia ajustes ni envía órdenes a la batería.",
    btnConnect: "Conectar batería",
    btnDisconnect: "Desconectar",
    btnDemo: "Ver demo",
    btnDemoStop: "Salir de demo",
    btUnsupported:
      "Este navegador no tiene Web Bluetooth. Usa Chrome o Edge en Android o Windows.",
    btInsecure:
      "Bluetooth solo funciona con HTTPS (o en localhost). Abre la app desde una dirección segura.",
    connecting: "Conectando…",
    connectFailed: "No se pudo conectar. Acércate a la batería y vuelve a intentarlo.",
    connectionLost: "Se perdió la conexión con la batería.",
    demoBadge: "DEMO",
    demoNote: "Datos simulados: un pack LiFePO₄ de 16 celdas cargando y descargando.",
    socLabel: "nivel de carga",
    sohLabel: "Salud",
    chemistryLabel: "Química",
    capacityLabel: "Capacidad",
    kpiVoltage: "Voltaje",
    kpiCurrent: "Corriente",
    kpiPower: "Potencia",
    flowIn: "entrando",
    flowOut: "saliendo",
    flowNone: "sin flujo",
    remainCharge: "Para carga completa",
    remainDischarge: "Autonomía restante",
    remainNoFlow: "Tiempo restante",
    estimatedTag: "estimado",
    stateFull: "Batería llena",
    cellsTitle: "Celdas",
    minTag: "mín",
    maxTag: "máx",
    avgLabel: "media",
    diffLabel: "diferencia",
    balTooltip: "equilibrándose",
    tempsTitle: "Temperaturas",
    tMos: "MOS",
    tBalance: "Equilibrado",
    tempPrefix: "T",
    statusTitle: "Estado y alarmas",
    allOk: "Todo en orden. Sin alarmas.",
    chargeSwitch: "Interruptor de carga",
    dischargeSwitch: "Interruptor de descarga",
    on: "activado",
    off: "apagado",
    chargeBlocked: "Carga bloqueada",
    dischargeBlocked: "Descarga bloqueada",
    chipCharger: "Cargador conectado",
    protectionTag: "Protección",
    warningTag: "Aviso",
    footerReadOnly:
      "Cliente de solo lectura: lo único que se envía a la batería es la petición estándar de datos, cada 0,5 s.",
    footerDisclaimer:
      "Proyecto independiente, no afiliado al fabricante de ANT BMS. Úsalo bajo tu responsabilidad.",
    footerUnverified: "Pendiente de verificar con una batería real.",
    footerSpecLink: "Especificación del protocolo",
    gaugeAria: "Nivel de carga",
  },
  en: {
    appName: "ANT BMS Monitor",
    welcomeTitle: "Your battery, in the browser",
    welcomeLead:
      "Connect to your ANT BMS over Bluetooth and watch the battery live: state of charge, cells, temperatures and alarms explained in plain language. Nothing to install.",
    welcomeSupport:
      "Works in Chrome and Edge on Android and Windows. Not on iPhone/iPad: Safari has no Web Bluetooth.",
    welcomeReadOnly:
      "Read-only: this app only asks for data. It never changes settings or sends commands to the battery.",
    btnConnect: "Connect battery",
    btnDisconnect: "Disconnect",
    btnDemo: "Try the demo",
    btnDemoStop: "Exit demo",
    btUnsupported:
      "This browser has no Web Bluetooth. Use Chrome or Edge on Android or Windows.",
    btInsecure:
      "Bluetooth only works over HTTPS (or on localhost). Open the app from a secure address.",
    connecting: "Connecting…",
    connectFailed: "Could not connect. Move closer to the battery and try again.",
    connectionLost: "Lost the connection to the battery.",
    demoBadge: "DEMO",
    demoNote: "Simulated data: a 16-cell LiFePO₄ pack cycling through charge and discharge.",
    socLabel: "state of charge",
    sohLabel: "Health",
    chemistryLabel: "Chemistry",
    capacityLabel: "Capacity",
    kpiVoltage: "Voltage",
    kpiCurrent: "Current",
    kpiPower: "Power",
    flowIn: "flowing in",
    flowOut: "flowing out",
    flowNone: "no flow",
    remainCharge: "Until fully charged",
    remainDischarge: "Runtime left",
    remainNoFlow: "Time remaining",
    estimatedTag: "estimated",
    stateFull: "Battery full",
    cellsTitle: "Cells",
    minTag: "min",
    maxTag: "max",
    avgLabel: "average",
    diffLabel: "spread",
    balTooltip: "balancing",
    tempsTitle: "Temperatures",
    tMos: "MOS",
    tBalance: "Balancer",
    tempPrefix: "T",
    statusTitle: "Status & alarms",
    allOk: "All good. No alarms.",
    chargeSwitch: "Charge switch",
    dischargeSwitch: "Discharge switch",
    on: "on",
    off: "off",
    chargeBlocked: "Charging blocked",
    dischargeBlocked: "Discharging blocked",
    chipCharger: "Charger connected",
    protectionTag: "Protection",
    warningTag: "Warning",
    footerReadOnly:
      "Read-only client: the only thing ever sent to the battery is the standard data request, every 0.5 s.",
    footerDisclaimer:
      "Independent project, not affiliated with the ANT BMS vendor. Use at your own risk.",
    footerUnverified: "Not yet verified against a real battery.",
    footerSpecLink: "Protocol specification",
    gaugeAria: "State of charge",
  },
};

/* System state (offset 7): 0 none, 1 idle, 2 charge, 3 standby, 4 discharge, 5 fault */
export const SYSTEM_STATE_TEXT = {
  es: ["—", "Inactiva", "Cargando", "En espera", "Descargando", "Fallo"],
  en: ["—", "Idle", "Charging", "Standby", "Discharging", "Fault"],
};

export const BATTERY_TYPE_TEXT = {
  es: {
    64241: "Litio ternario", 64242: "LiFePO₄", 64243: "LTO (titanato)",
    64244: "Personalizada", 64245: "—", 64246: "Ion de sodio",
  },
  en: {
    64241: "Ternary lithium", 64242: "LiFePO₄", 64243: "LTO (titanate)",
    64244: "Custom", 64245: "—", 64246: "Sodium-ion",
  },
};

/* Reasons the discharge MOS reports (index = disMosState). */
export const DIS_MOS_TEXT = {
  es: [
    "Apagado", "Activado", "Celda por debajo del mínimo", "Protección por corriente",
    "Sobrecorriente (nivel 2)", "Voltaje total demasiado bajo",
    "Batería demasiado caliente", "Etapa de potencia demasiado caliente",
    "Corriente anómala", "Cable de equilibrado suelto", "Placa sobrecalentada",
    "Cargador conectado", "Protección por cortocircuito", "Fallo del MOS de descarga",
    "No se pudo activar", "Apagado manualmente", "Voltaje bajo (nivel 2)",
    "Protección por baja temperatura", "Diferencia entre celdas excesiva",
    "Error de autodiagnóstico",
  ],
  en: [
    "Off", "On", "Cell undervoltage", "Current protection",
    "Overcurrent (level 2)", "Pack voltage too low",
    "Battery too hot", "Power stage too hot",
    "Abnormal current", "Balance wire loose", "Board overheated",
    "Charger connected", "Short-circuit protection", "Discharge MOS fault",
    "Failed to turn on", "Turned off manually", "Undervoltage (level 2)",
    "Low-temperature protection", "Cell difference too high",
    "Self-test error",
  ],
};

/* Reasons the charge MOS reports (index = chMosState). */
export const CH_MOS_TEXT = {
  es: [
    "Apagado", "Activado", "Celda por encima del máximo", "Protección por corriente",
    "Batería llena", "Voltaje total demasiado alto",
    "Batería demasiado caliente", "Etapa de potencia demasiado caliente",
    "Corriente anómala", "Cable de equilibrado suelto", "Placa sobrecalentada",
    "No se pudo activar", "Fallo del MOS de descarga", "En espera",
    "Apagado manualmente", "Sobretensión (nivel 2)",
    "Protección por baja temperatura", "Diferencia entre celdas excesiva",
    "Error de autodiagnóstico",
  ],
  en: [
    "Off", "On", "Cell overvoltage", "Current protection",
    "Battery full", "Pack voltage too high",
    "Battery too hot", "Power stage too hot",
    "Abnormal current", "Balance wire loose", "Board overheated",
    "Failed to turn on", "Discharge MOS fault", "Waiting",
    "Turned off manually", "Overvoltage (level 2)",
    "Low-temperature protection", "Cell difference too high",
    "Self-test error",
  ],
};

export const BALANCE_TEXT = {
  es: [
    "Apagado", "Equilibrado extremo", "Equilibrando (diferencia al cargar)",
    "Equilibrador demasiado caliente", "Equilibrado automático", "Equilibrado manual",
  ],
  en: [
    "Off", "Extreme balancing", "Balancing (cell difference while charging)",
    "Balancer too hot", "Automatic balancing", "Manual balancing",
  ],
};

/* Protection bits 0–44 (protectMask + protectMask1), in plain language. */
export const PROTECT_TEXT = {
  es: [
    "Configuración del tipo de celda",
    "Una celda superó su voltaje máximo",
    "Una celda muy por encima del máximo (nivel 2)",
    "Voltaje total demasiado alto",
    "Una celda bajó de su voltaje mínimo",
    "Una celda muy por debajo del mínimo (nivel 2)",
    "Voltaje total demasiado bajo",
    "Diferencia excesiva entre celdas",
    "Demasiado caliente al cargar",
    "Demasiado caliente al descargar",
    "Etapa de potencia (MOS) sobrecalentada",
    "Demasiado frío para cargar",
    "Demasiado frío para descargar",
    "Corriente de carga excesiva",
    "Corriente de descarga excesiva",
    "Corriente de descarga crítica (nivel 2)",
    "Cortocircuito detectado",
    "Interruptor de descarga 1 apagado manualmente",
    "Interruptor de descarga 2 apagado manualmente",
    "Interruptor de descarga 3 apagado manualmente",
    "Interruptor de descarga 4 apagado manualmente",
    "Interruptor de carga 1 apagado manualmente",
    "Interruptor de carga 2 apagado manualmente",
    "Interruptor de carga 3 apagado manualmente",
    "Interruptor de carga 4 apagado manualmente",
    "Cable de medición suelto o roto",
    "Error en la medición de corriente",
    "Fallo del interruptor de descarga (MOS)",
    "Fallo del interruptor de carga (MOS)",
    "Error de comunicación interna",
    "Falló la precarga",
    "Arrancando",
    "Comprobación interna 1",
    "Comprobación interna 2",
    "Cargador conectado",
    "Módulo remoto (DTU) perdido",
    "Prevención de ignición activa",
    "Comprobación interna 3",
    "Hace falta actualizar el firmware",
    "Falló la precarga del relé",
    "Relé pegado",
    "Problema en el fusible de descarga",
    "Problema en el fusible de carga",
    "Falta un módulo de la batería",
    "Dispositivo caducado",
  ],
  en: [
    "Cell type configuration",
    "A cell is over its maximum voltage",
    "A cell is far over its maximum (level 2)",
    "Battery voltage too high",
    "A cell is under its minimum voltage",
    "A cell is far under its minimum (level 2)",
    "Battery voltage too low",
    "Too much difference between cells",
    "Too hot while charging",
    "Too hot while discharging",
    "Power stage (MOS) overheated",
    "Too cold to charge",
    "Too cold to discharge",
    "Charge current too high",
    "Discharge current too high",
    "Discharge current critically high (level 2)",
    "Short circuit detected",
    "Discharge switch 1 turned off manually",
    "Discharge switch 2 turned off manually",
    "Discharge switch 3 turned off manually",
    "Discharge switch 4 turned off manually",
    "Charge switch 1 turned off manually",
    "Charge switch 2 turned off manually",
    "Charge switch 3 turned off manually",
    "Charge switch 4 turned off manually",
    "Sensing wire loose or broken",
    "Current reading error",
    "Discharge switch (MOS) fault",
    "Charge switch (MOS) fault",
    "Internal communication error",
    "Precharge failed",
    "Starting up",
    "Internal check 1",
    "Internal check 2",
    "Charger connected",
    "Remote module (DTU) lost",
    "Ignition prevention active",
    "Internal check 3",
    "Firmware upgrade required",
    "Relay precharge failed",
    "Relay stuck",
    "Discharge fuse problem",
    "Charge fuse problem",
    "A battery module is missing",
    "Device expired",
  ],
};

/* Warning bits 0–44 (warningMask + warningMask1), in plain language. */
export const WARNING_TEXT = {
  es: [
    "Voltaje de celda alto",
    "Voltaje total alto",
    "Voltaje de celda bajo",
    "Voltaje total bajo",
    "Mucha diferencia entre celdas",
    "Temperatura alta al cargar",
    "Temperatura alta al descargar",
    "Temperatura baja al cargar",
    "Temperatura baja al descargar",
    "Etapa de potencia (MOS) caliente",
    "Corriente de carga alta",
    "Corriente de descarga alta",
    "Batería baja",
    "Batería muy baja",
    "Lectura de voltaje de celda sospechosa",
    "Número de celdas incorrecto",
    "Falló la precarga",
    "Batería llena",
    "Cargando",
    "Descargando",
    "Cargador CAN conectado",
    "Cargador RS485 conectado",
    "Cargador conectado",
    "Interruptor de carga activado",
    "Interruptor de descarga activado",
    "Equilibrando celdas",
    "En reposo (sleep)",
    "Equilibrado limitado",
    "Equilibrando por diferencia entre celdas",
    "Equilibrado automático",
    "Equilibrador demasiado caliente",
    "Protección por voltaje activa",
    "Protección por temperatura activa",
    "Error del sistema",
    "Módulo remoto (DTU) perdido",
    "Prueba de equilibrado",
    "Calentador activado",
    "Salida forzada activada",
    "Bluetooth apagado",
    "Precargando relé",
    "Precargando",
    "Relé de carga activado",
    "Relé de descarga activado",
    "Error del reloj interno (cristal)",
    "Carga forzada",
  ],
  en: [
    "Cell voltage high",
    "Battery voltage high",
    "Cell voltage low",
    "Battery voltage low",
    "Large difference between cells",
    "High temperature while charging",
    "High temperature while discharging",
    "Low temperature while charging",
    "Low temperature while discharging",
    "Power stage (MOS) running hot",
    "Charge current high",
    "Discharge current high",
    "Battery low",
    "Battery very low",
    "Cell voltage reading looks wrong",
    "Wrong number of cells detected",
    "Precharge failed",
    "Battery full",
    "Charging",
    "Discharging",
    "CAN charger connected",
    "RS485 charger connected",
    "Charger connected",
    "Charge switch on",
    "Discharge switch on",
    "Balancing cells",
    "Sleep mode",
    "Balancing limited",
    "Balancing due to cell difference",
    "Automatic balancing",
    "Balancer too hot",
    "Voltage protection active",
    "Temperature protection active",
    "System error",
    "Remote module (DTU) lost",
    "Balancing test",
    "Heater on",
    "Forced output on",
    "Bluetooth off",
    "Relay precharging",
    "Precharging",
    "Charge relay on",
    "Discharge relay on",
    "Internal clock (crystal) error",
    "Forced charging",
  ],
};

/* Warning bits that describe a normal state, not a problem. Shown as status
 * chips, never in the alarm list. */
export const STATUS_WARNING_BITS = new Set([
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  35, 36, 37, 38, 39, 40, 41, 42, 44,
]);

/* Protection bits that reflect a deliberate/neutral condition (manual switch-off,
 * starting, charger plugged). Shown as notices (amber), not faults (red). */
export const INFO_PROTECT_BITS = new Set([17, 18, 19, 20, 21, 22, 23, 24, 31, 34]);

/* Minutes -> "Xd Xh Xm". Port of the app's Hourmin(), quirk included
 * (comparisons use > 60, not >= 60, for exact parity). */
export function formatMinutes(total) {
  let d = 0;
  let h = 0;
  let m = Math.trunc(total);
  if (m > 60) { h = Math.trunc(m / 60); m = m % 60; }
  if (h > 24) { d = Math.trunc(h / 24); h = h % 24; }
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

export function t(lang, key) {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}
