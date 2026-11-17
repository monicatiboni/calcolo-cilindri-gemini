(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CylinderModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULTS = Object.freeze({
    bore: 80,
    rod: 25,
    stroke: 600,
    pressure: 6,
    frequency: 12,
    temperature: 30,
    dailyHours: 16,
    annualDays: 230,
    mass: 100,
    elasticModulus: 210000,
    lengthFactor: 2,
    safetyFactor: 5,
    loadMode: "theoretical",
    manualLoad: 3000,
    velocityMode: "calculated",
    manualVelocity: 0.24
  });

  // Valori digitalizzati dal diagramma raster allegato.
  // Le diagonali hanno pendenza -0.5 nel piano log-log e rappresentano Ec costante.
  const CUSHIONING_CURVES = Object.freeze({
    25:  { energyJ: 1.0, maxMassKg: 50 },
    32:  { energyJ: 3.6, maxMassKg: 80 },
    40:  { energyJ: 6.4, maxMassKg: 120 },
    50:  { energyJ: 10.5, maxMassKg: 200 },
    63:  { energyJ: 26, maxMassKg: 300 },
    80:  { energyJ: 53, maxMassKg: 500 },
    100: { energyJ: 82, maxMassKg: 800 },
    125: { energyJ: 132, maxMassKg: 1200 },
    160: { energyJ: 205, maxMassKg: 2000 },
    200: { energyJ: 300, maxMassKg: 3000 },
    250: { energyJ: 400, maxMassKg: 5000 },
    320: { energyJ: 800, maxMassKg: 8000 }
  });

  const REQUIRED_POSITIVE = ["bore", "rod", "stroke", "pressure", "frequency", "dailyHours", "annualDays", "mass", "elasticModulus", "lengthFactor", "safetyFactor"];

  function asNumber(value) {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return Number(value);
    const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
    return cleaned === "" ? NaN : Number(cleaned);
  }

  function normalize(raw) {
    const result = { ...DEFAULTS, ...raw };
    Object.keys(DEFAULTS).forEach((key) => {
      if (typeof DEFAULTS[key] === "number") result[key] = asNumber(result[key]);
    });
    return result;
  }

  function validate(raw) {
    const d = normalize(raw);
    const errors = {};
    REQUIRED_POSITIVE.forEach((key) => {
      if (!Number.isFinite(d[key]) || d[key] <= 0) errors[key] = "Inserire un valore maggiore di zero";
    });
    if (!Number.isFinite(d.temperature) || d.temperature <= -273) errors.temperature = "La temperatura deve essere superiore a −273 °C";
    if (Number.isFinite(d.rod) && Number.isFinite(d.bore) && d.rod >= d.bore) errors.rod = "Lo stelo deve avere diametro inferiore all’alesaggio";
    if (!CUSHIONING_CURVES[d.bore]) errors.bore = "Alesaggio non presente nel diagramma";
    if (d.loadMode === "manual" && (!Number.isFinite(d.manualLoad) || d.manualLoad <= 0)) errors.manualLoad = "Inserire un carico manuale maggiore di zero";
    if (d.velocityMode === "manual" && (!Number.isFinite(d.manualVelocity) || d.manualVelocity <= 0)) errors.manualVelocity = "Inserire una velocità maggiore di zero";
    return { valid: Object.keys(errors).length === 0, errors, data: d };
  }

  function calculatePerformance(raw) {
    const d = normalize(raw);
    const areaPushMm2 = Math.PI * d.bore ** 2 / 4;
    const areaPullMm2 = Math.PI * (d.bore ** 2 - d.rod ** 2) / 4;
    const pressureNmm2 = d.pressure * 0.1;
    const forcePush = areaPushMm2 * pressureNmm2;
    const forcePull = areaPullMm2 * pressureNmm2;
    const flowOutLmin = areaPushMm2 * d.stroke * d.frequency / 1e6;
    const flowInLmin = areaPullMm2 * d.stroke * d.frequency / 1e6;
    const temperatureK = d.temperature + 273;
    const normalFactor = (d.pressure + 1) * 293 / temperatureK;
    const flowOutNormal = flowOutLmin * normalFactor;
    const flowInNormal = flowInLmin * normalFactor;
    const flowTotalNormal = flowOutNormal + flowInNormal;
    return {
      areaPushMm2,
      areaPullMm2,
      forcePush,
      forcePull,
      forcePush80: forcePush * 0.8,
      forcePull80: forcePull * 0.8,
      forcePush60: forcePush * 0.6,
      forcePull60: forcePull * 0.6,
      flowOutM3s: flowOutLmin / 60000,
      flowInM3s: flowInLmin / 60000,
      flowOutLmin,
      flowInLmin,
      flowOutNormal,
      flowInNormal,
      flowTotalNormal,
      annualConsumption: flowTotalNormal * 60 * d.dailyHours * d.annualDays,
      temperatureK
    };
  }

  function selectedLoad(d, performance) {
    if (d.loadMode === "effective80") return { value: performance.forcePush80, label: "Spinta effettiva senza regolatori (80%)" };
    if (d.loadMode === "effective60") return { value: performance.forcePush60, label: "Spinta effettiva con regolatori (60%)" };
    if (d.loadMode === "manual") return { value: d.manualLoad, label: "Carico assiale inserito manualmente" };
    return { value: performance.forcePush, label: "Spinta teorica (caso conservativo)" };
  }

  function calculateBuckling(raw, performanceArg) {
    const d = normalize(raw);
    const performance = performanceArg || calculatePerformance(d);
    const secondMoment = Math.PI * d.rod ** 4 / 64;
    const freeLength = d.lengthFactor * d.stroke;
    const criticalLoad = Math.PI ** 2 * d.elasticModulus * secondMoment / freeLength ** 2;
    const allowableLoad = criticalLoad / d.safetyFactor;
    const load = selectedLoad(d, performance);
    const utilization = load.value / allowableLoad;
    return {
      slenderness: d.stroke / d.rod,
      secondMoment,
      freeLength,
      criticalLoad,
      allowableLoad,
      appliedLoad: load.value,
      loadLabel: load.label,
      utilization,
      margin: allowableLoad - load.value,
      pass: Number.isFinite(utilization) && utilization <= 1
    };
  }

  function velocityLimit(massKg, curve) {
    return Math.sqrt(2 * curve.energyJ / massKg);
  }

  function calculateCushioning(raw) {
    const d = normalize(raw);
    const curve = CUSHIONING_CURVES[d.bore];
    const calculatedVelocity = 2 * d.stroke / 1000 * d.frequency / 60;
    const velocity = d.velocityMode === "manual" ? d.manualVelocity : calculatedVelocity;
    const kineticEnergy = 0.5 * d.mass * velocity ** 2;
    if (!curve) return { available: false, velocity, calculatedVelocity, kineticEnergy, pass: false };
    const limit = velocityLimit(d.mass, curve);
    const energyPass = kineticEnergy <= curve.energyJ * (1 + 1e-12);
    const massPass = d.mass <= curve.maxMassKg * (1 + 1e-12);
    const withinRasterAxes = d.mass >= 1 && d.mass <= 10000 && velocity >= 0.1 && velocity <= 5;
    return {
      available: true,
      curve,
      velocity,
      calculatedVelocity,
      kineticEnergy,
      velocityLimit: limit,
      energyMargin: curve.energyJ - kineticEnergy,
      velocityMargin: limit - velocity,
      energyPass,
      massPass,
      pass: energyPass && massPass,
      withinRasterAxes,
      equationCoefficient: Math.sqrt(2 * curve.energyJ)
    };
  }

  function calculate(raw) {
    const validation = validate(raw);
    const performance = calculatePerformance(validation.data);
    const buckling = calculateBuckling(validation.data, performance);
    const cushioning = calculateCushioning(validation.data);
    return { ...validation, performance, buckling, cushioning };
  }

  return { DEFAULTS, CUSHIONING_CURVES, asNumber, normalize, validate, calculatePerformance, calculateBuckling, calculateCushioning, calculate, velocityLimit };
});
