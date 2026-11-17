(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CylinderAISchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const groupData = [
    { title: 'Geometria del cilindro', icon: '01', fields: [
      ['bore','Alesaggio','mm','select',[25,32,40,50,63,80,100,125,160,200,250,320]],
      ['rod','Diametro stelo','mm','number'],
      ['stroke','Corsa','mm','number']
    ]},
    { title: 'Condizioni di esercizio', icon: '02', fields: [
      ['pressure','Pressione relativa','bar','number'],
      ['frequency','Frequenza','cicli/min','number'],
      ['temperature','Temperatura aria','C','number'],
      ['dailyHours','Ore di lavoro giornaliere','h/giorno','number'],
      ['annualDays','Giorni di lavoro annui','giorni','number'],
      ['mass','Massa esterna mobile','kg','number']
    ]},
    { title: 'Verifica carico di punta', icon: '03', fields: [
      ['elasticModulus','Modulo elastico stelo','N/mm2','number'],
      ['lengthFactor','Coeff. lunghezza libera k','-','select',[0.5,0.7,1,2]],
      ['safetyFactor','Coefficiente di sicurezza','-','number'],
      ['loadMode','Carico da verificare','-','select',[['theoretical','Spinta teorica'],['effective80','Spinta effettiva 80%'],['effective60','Spinta effettiva 60%'],['manual','Carico manuale']]],
      ['manualLoad','Carico assiale manuale','N','number','manualLoad']
    ]},
    { title: 'Verifica ammortizzo', icon: '04', fields: [
      ['velocityMode','Velocita di impatto','-','select',[['calculated','Calcolata da corsa e frequenza'],['manual','Valore manuale']]],
      ['manualVelocity','Velocita manuale','m/s','number','manualVelocity']
    ]}
  ];
  const fields = groupData.flatMap(g => g.fields.map(f => ({ key: f[0], label: f[1], unit: f[2], type: f[3], items: Array.isArray(f[4]) ? f[4] : null, conditional: typeof f[4] === 'string' ? f[4] : null, group: g.title })));
  const map = Object.fromEntries(fields.map(f => [f.key, f]));
  function requiredKeys(values) {
    const keys = fields.filter(f => !f.conditional).map(f => f.key);
    if (values.loadMode === 'manual') keys.push('manualLoad');
    if (values.velocityMode === 'manual') keys.push('manualVelocity');
    return keys;
  }
  function isFilled(values, key) {
    const value = values[key];
    return value !== undefined && value !== null && value !== '' && (typeof value !== 'number' || Number.isFinite(value));
  }
  function missingKeys(values) { return requiredKeys(values).filter(k => !isFilled(values, k)); }
  function validateKnown(values) {
    const problems = {};
    for (const [k, v] of Object.entries(values)) {
      const f = map[k];
      if (!f) continue;
      if (f.type === 'number' || (f.type === 'select' && f.items && typeof f.items[0] === 'number')) {
        const n = Number(v);
        if (!Number.isFinite(n)) { problems[k] = 'Valore non numerico'; continue; }
        if (k === 'temperature' ? !(n > -273 && n < 150) : !(n > 0)) problems[k] = 'Valore fuori intervallo';
        if (k === 'bore' && !f.items.includes(n)) problems[k] = 'Scegli un alesaggio disponibile';
        if (k === 'lengthFactor' && !f.items.includes(n)) problems[k] = 'Scegli un coefficiente valido';
        if (k === 'dailyHours' && n > 24) problems[k] = 'Massimo 24 ore';
        if (k === 'annualDays' && n > 366) problems[k] = 'Massimo 366 giorni';
      } else if (f.items && !f.items.some(option => (Array.isArray(option) ? option[0] : option) === v)) {
        problems[k] = 'Opzione non valida';
      }
    }
    if (isFilled(values,'bore') && isFilled(values,'rod') && Number(values.rod) >= Number(values.bore)) {
      problems.rod = 'Lo stelo deve essere minore dell\'alesaggio';
    }
    return problems;
  }
  function summary(values) {
    const required = requiredKeys(values);
    const missing = missingKeys(values);
    const errors = validateKnown(values);
    return { required, missing, errors, completed: required.length - missing.length,
      ready: missing.length === 0 && Object.keys(errors).length === 0 };
  }
  return { groups: groupData, fields, map, requiredKeys, isFilled, missingKeys, validateKnown, summary };
});
