"use strict";

const assert = require("node:assert/strict");
const M = require("../js/model.js");

function near(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} non è entro ${tolerance} da ${expected}`);
}

const base = { ...M.DEFAULTS };
const result = M.calculate(base);

assert.equal(result.valid, true, "Il caso Excel deve essere valido");
near(result.performance.forcePush, 3015.928947446201, 1e-9, "Spinta teorica");
near(result.performance.forcePull, 2721.404636172158, 1e-9, "Trazione teorica");
near(result.performance.forcePush80, 2412.743157956961, 1e-9, "Spinta 80%");
near(result.performance.forcePull60, 1632.8427817032948, 1e-9, "Trazione 60%");
near(result.performance.flowOutM3s, 0.0006031857894892403, 1e-15, "Portata uscita m3/s");
near(result.performance.flowInLmin, 32.6568556340659, 1e-12, "Portata rientro l/min");
near(result.performance.flowOutNormal, 244.97704044404585, 1e-10, "Portata uscita normalizzata");
near(result.performance.flowTotalNormal, 466.0305417822279, 1e-10, "Portata totale normalizzata");
near(result.performance.annualConsumption, 102899543.62551591, 1e-5, "Consumo annuo");
near(result.buckling.slenderness, 24, 1e-12, "Snellezza");
near(result.buckling.freeLength, 1200, 1e-12, "Lunghezza libera");
near(result.buckling.criticalLoad, 27598.563736228778, 1e-8, "Forza critica");
near(result.buckling.allowableLoad, 5519.712747245756, 1e-8, "Forza ammissibile");
assert.equal(result.buckling.pass, true, "Il caso base deve superare il carico di punta");
near(result.cushioning.velocity, 0.24, 1e-12, "Velocità ammortizzo");
near(result.cushioning.kineticEnergy, 2.88, 1e-12, "Energia cinetica");
assert.equal(result.cushioning.pass, true, "Il caso base deve superare l’ammortizzo");

// La pressione deve essere realmente variabile: il workbook originale la fissava a 6 bar nelle forze.
near(M.calculatePerformance({ ...base, pressure: 5 }).forcePush, result.performance.forcePush * 5 / 6, 1e-10, "Pressione variabile");

assert.equal(M.validate({ ...base, rod: 80 }).valid, false, "Stelo uguale all’alesaggio non valido");
assert.equal(M.calculateBuckling({ ...base, manualLoad: 6000, loadMode: "manual" }).pass, false, "Carico manuale oltre Famm");
assert.equal(M.calculateCushioning({ ...base, mass: 600 }).pass, false, "Massa oltre il limite Ø80");
assert.equal(M.calculateCushioning({ ...base, velocityMode: "manual", manualVelocity: 2 }).pass, false, "Energia oltre il limite Ø80");

for (const [bore, curve] of Object.entries(M.CUSHIONING_CURVES)) {
  const atLimit = M.calculateCushioning({ ...base, bore: Number(bore), mass: curve.maxMassKg, velocityMode: "manual", manualVelocity: M.velocityLimit(curve.maxMassKg, curve) });
  assert.equal(atLimit.pass, true, `Il punto limite Ø${bore} deve essere ammissibile`);
}

console.log("OK: 35 controlli numerici e casi limite superati.");
