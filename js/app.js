(function () {
  "use strict";

  const M = window.CylinderModel;
  const STORAGE_KEY = "cylinder-calculator-v1";
  const numericFields = ["rod", "stroke", "pressure", "frequency", "temperature", "dailyHours", "annualDays", "mass", "elasticModulus", "lengthFactor", "safetyFactor", "manualLoad", "manualVelocity"];
  const allFields = ["bore", ...numericFields, "loadMode", "velocityMode"];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const fmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
  const fmt0 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
  const fmt4 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 6 });
  let state = loadState();
  let currentView = "inputs";

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return M.normalize(saved || M.DEFAULTS);
    } catch (_) {
      return { ...M.DEFAULTS };
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* localStorage può essere disabilitato */ }
  }

  function setFormValues() {
    allFields.forEach((name) => {
      const element = document.getElementById(name);
      if (element) element.value = state[name];
    });
    toggleConditionalFields();
  }

  function readForm() {
    const next = {};
    allFields.forEach((name) => {
      const element = document.getElementById(name);
      if (!element) return;
      next[name] = numericFields.includes(name) || name === "bore" ? M.asNumber(element.value) : element.value;
    });
    state = M.normalize(next);
    saveState();
    render();
  }

  function toggleConditionalFields() {
    $("#manual-load-field").classList.toggle("is-visible", $("#loadMode").value === "manual");
    $("#manual-velocity-field").classList.toggle("is-visible", $("#velocityMode").value === "manual");
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function numberText(value, formatter = fmt) {
    return Number.isFinite(value) ? formatter.format(value) : "—";
  }

  function render() {
    const result = M.calculate(state);
    renderValidation(result);
    renderPerformance(result);
    renderBuckling(result);
    renderCushioning(result);
    if (currentView === "cushioning") requestAnimationFrame(() => drawChart(result));
  }

  function renderValidation(result) {
    allFields.forEach((name) => {
      const el = document.getElementById(name);
      if (el) el.setAttribute("aria-invalid", result.errors[name] ? "true" : "false");
    });
    const summary = $("#validation-summary");
    const messages = Object.values(result.errors);
    summary.textContent = result.valid ? "Dati completi e validi." : `${messages.length} ${messages.length === 1 ? "dato da correggere" : "dati da correggere"}.`;
    summary.classList.toggle("has-errors", !result.valid);
  }

  function renderPerformance(result) {
    const p = result.performance;
    setText("performance-context", `Ø ${numberText(state.bore, fmt0)} / Ø ${numberText(state.rod, fmt0)} · corsa ${numberText(state.stroke, fmt0)} mm · ${numberText(state.pressure)} bar`);
    setText("force-push-theoretical", numberText(p.forcePush));
    setText("force-pull-theoretical", numberText(p.forcePull));
    setText("force-push-80", `${numberText(p.forcePush80)} N`);
    setText("force-pull-80", `${numberText(p.forcePull80)} N`);
    setText("force-push-60", `${numberText(p.forcePush60)} N`);
    setText("force-pull-60", `${numberText(p.forcePull60)} N`);
    setText("flow-out-lmin", numberText(p.flowOutLmin));
    setText("flow-in-lmin", numberText(p.flowInLmin));
    setText("flow-out-m3s", Number.isFinite(p.flowOutM3s) ? `${numberText(p.flowOutM3s, fmt4)} m³/s` : "");
    setText("flow-in-m3s", Number.isFinite(p.flowInM3s) ? `${numberText(p.flowInM3s, fmt4)} m³/s` : "");
    setText("flow-out-normal", numberText(p.flowOutNormal));
    setText("flow-in-normal", numberText(p.flowInNormal));
    setText("flow-total-normal", numberText(p.flowTotalNormal));
    setText("annual-consumption", numberText(p.annualConsumption, fmt0));
  }

  function setStatus(el, pass, unknown) {
    el.classList.remove("is-pass", "is-fail", "is-unknown");
    if (unknown) { el.textContent = "Da verificare"; el.classList.add("is-unknown"); }
    else if (pass) { el.textContent = "Ammissibile"; el.classList.add("is-pass"); }
    else { el.textContent = "Non ammissibile"; el.classList.add("is-fail"); }
  }

  function renderBuckling(result) {
    const b = result.buckling;
    setStatus($("#buckling-status"), b.pass, !result.valid);
    setText("buckling-utilization", Number.isFinite(b.utilization) ? `${fmt.format(b.utilization * 100)}%` : "—");
    setText("buckling-message", !Number.isFinite(b.margin) ? "Completare i dati per eseguire il confronto." : b.pass ? `Margine disponibile ${numberText(Math.max(0, b.margin))} N.` : `Il carico supera il valore ammissibile di ${numberText(Math.abs(b.margin))} N.`);
    const meter = $("#buckling-meter");
    meter.style.width = `${Math.min(100, Math.max(0, b.utilization * 100))}%`;
    meter.classList.toggle("is-fail", !b.pass);
    setText("buckling-load-label", b.loadLabel);
    setText("slenderness", numberText(b.slenderness));
    setText("free-length", numberText(b.freeLength));
    setText("critical-load", numberText(b.criticalLoad));
    setText("allowable-load", numberText(b.allowableLoad));
    setText("applied-load", numberText(b.appliedLoad));
    setText("buckling-margin", numberText(b.margin));
    const notice = $("#slenderness-notice");
    notice.className = "notice";
    if (b.slenderness > 20) {
      notice.textContent = `c/d = ${numberText(b.slenderness)} > 20: la verifica di stabilità dello stelo è pertinente secondo il criterio riportato nel foglio.`;
      notice.classList.add(b.pass ? "is-pass" : "is-fail");
    } else {
      notice.textContent = Number.isFinite(b.slenderness) ? `c/d = ${numberText(b.slenderness)} ≤ 20: il foglio non richiede la verifica di snellezza; il confronto di Eulero è mostrato comunque come controllo conservativo.` : "Completare i dati geometrici per valutare la snellezza dello stelo.";
    }
  }

  function renderCushioning(result) {
    const c = result.cushioning;
    const velocityPreview = document.getElementById("velocityPreview");
    if (velocityPreview) velocityPreview.value = numberText(c.velocity);
    setText("velocity-preview-label", state.velocityMode === "manual" ? "Velocità utilizzata" : "Velocità calcolata");
    setText("cush-mass", numberText(state.mass));
    setText("cush-velocity", numberText(c.velocity));
    setText("kinetic-energy", numberText(c.kineticEnergy));
    setText("velocity-limit", c.available ? numberText(c.velocityLimit) : "—");
    setStatus($("#cushioning-status"), c.pass, !c.available || !result.valid);
    if (!c.available) return;
    $("#chart-bore").value = String(state.bore);
    renderCurveDetails(state.bore, c);
    const note = $("#cushioning-message");
    note.className = `notice ${result.valid ? (c.pass ? "is-pass" : "is-fail") : ""}`;
    const velocitySource = state.velocityMode === "manual" ? "velocità manuale" : "velocità media calcolata da corsa e frequenza";
    if (!result.valid) note.textContent = "Completare o correggere i dati per eseguire la verifica dell’ammortizzo.";
    else if (c.pass) note.textContent = `Verifica superata con ${velocitySource}: energia e massa sono entro i limiti digitalizzati per Ø ${fmt0.format(state.bore)} mm.${c.withinRasterAxes ? "" : " Il punto è fuori dalla scala disegnata, ma rispetta le due relazioni numeriche."}`;
    else if (!c.massPass && !c.energyPass) note.textContent = `Verifica non superata: massa oltre ${fmt0.format(c.curve.maxMassKg)} kg ed energia oltre ${fmt.format(c.curve.energyJ)} J.`;
    else if (!c.massPass) note.textContent = `Verifica non superata: la massa supera il limite verticale di ${fmt0.format(c.curve.maxMassKg)} kg.`;
    else note.textContent = `Verifica non superata: la velocità è superiore al limite ${fmt.format(c.velocityLimit)} m/s, equivalente a ${fmt.format(c.curve.energyJ)} J.`;
  }

  function renderCurveDetails(bore, cushioning) {
    if (!cushioning.available) return;
    setText("curve-title", `Alesaggio Ø ${fmt0.format(bore)} mm`);
    setText("curve-equation", `v_lim = ${fmt.format(cushioning.equationCoefficient)} · m^−0,5`);
    setText("curve-energy", `${fmt.format(cushioning.curve.energyJ)} J`);
    setText("curve-max-mass", `${fmt0.format(cushioning.curve.maxMassKg)} kg`);
    setText("energy-margin", `${numberText(cushioning.energyMargin)} J`);
    setText("velocity-margin", `${numberText(cushioning.velocityMargin)} m/s`);
  }

  function showView(name) {
    currentView = name;
    $$('[data-view-panel]').forEach((panel) => panel.classList.toggle("is-active", panel.dataset.viewPanel === name));
    $$(".nav-item").forEach((button) => {
      const active = button.dataset.view === name;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "cushioning") requestAnimationFrame(() => drawChart(M.calculate(state)));
  }

  function buildCurveSelector() {
    const select = $("#chart-bore");
    Object.keys(M.CUSHIONING_CURVES).forEach((bore) => {
      const option = document.createElement("option"); option.value = bore; option.textContent = `Ø ${bore} mm`; select.appendChild(option);
    });
    select.value = String(state.bore);
  }

  function drawChart(result) {
    const canvas = $("#cushioning-chart");
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width, H = rect.height;
    const pad = { left: W < 500 ? 52 : 68, right: 24, top: 25, bottom: 52 };
    const pw = W - pad.left - pad.right, ph = H - pad.top - pad.bottom;
    const xMin = 1, xMax = 10000, yMin = 0.1, yMax = 5;
    const lx = (value) => pad.left + (Math.log10(value) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin)) * pw;
    const ly = (value) => pad.top + (Math.log10(yMax) - Math.log10(value)) / (Math.log10(yMax) - Math.log10(yMin)) * ph;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    const xTicks = [1,2,3,5,10,20,30,50,100,200,300,500,1000,2000,3000,5000,10000];
    const yTicks = [.1,.2,.3,.5,1,2,3,5];
    ctx.font = `${W < 500 ? 9 : 10}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "top";
    xTicks.forEach((v) => { const x = lx(v); const major = [1,10,100,1000,10000].includes(v); ctx.beginPath(); ctx.strokeStyle = major ? "#b5bec7" : "#e3e7eb"; ctx.lineWidth = major ? 1.2 : 1; ctx.moveTo(x,pad.top); ctx.lineTo(x,pad.top+ph); ctx.stroke(); ctx.fillStyle = "#66727e"; if (major || W > 620) ctx.fillText(v >= 1000 ? `${v/1000}k` : String(v),x,pad.top+ph+8); });
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yTicks.forEach((v) => { const y=ly(v); const major = [0.1,1,5].includes(v); ctx.beginPath(); ctx.strokeStyle=major?"#b5bec7":"#e3e7eb"; ctx.lineWidth=major?1.2:1; ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+pw,y); ctx.stroke(); ctx.fillStyle="#66727e"; ctx.fillText(String(v).replace(".",","),pad.left-9,y); });
    ctx.strokeStyle="#798591"; ctx.lineWidth=1.5; ctx.strokeRect(pad.left,pad.top,pw,ph);
    ctx.fillStyle="#3f4b56"; ctx.font="600 11px system-ui, sans-serif"; ctx.textAlign="center"; ctx.fillText("Massa esterna (kg)",pad.left+pw/2,H-19); ctx.save(); ctx.translate(15,pad.top+ph/2); ctx.rotate(-Math.PI/2); ctx.fillText("Velocità (m/s)",0,0); ctx.restore();
    const highlighted = Number($("#chart-bore").value || state.bore);
    Object.entries(M.CUSHIONING_CURVES).forEach(([boreText, curve]) => {
      const bore = Number(boreText); const selected = bore === highlighted; const startMass = Math.max(xMin, 2*curve.energyJ/(yMax*yMax)); const endMass = Math.min(curve.maxMassKg,xMax); const startV = Math.min(yMax,M.velocityLimit(startMass,curve)); const endV = Math.max(yMin,M.velocityLimit(endMass,curve));
      ctx.beginPath(); ctx.strokeStyle = selected ? "#6b4aa0" : "#7c8792"; ctx.lineWidth = selected ? 3.2 : 1.25; ctx.globalAlpha = selected ? 1 : .58; ctx.moveTo(lx(startMass),ly(startV)); ctx.lineTo(lx(endMass),ly(endV)); ctx.lineTo(lx(endMass),ly(yMin)); ctx.stroke();
      if (selected) { ctx.globalAlpha=1; ctx.fillStyle="#6b4aa0"; ctx.font="800 11px system-ui, sans-serif"; ctx.textAlign="left"; ctx.textBaseline="bottom"; ctx.fillText(`Ø${bore}`,Math.min(lx(endMass)+5,pad.left+pw-30),Math.max(ly(endV)-4,pad.top+13)); }
    });
    ctx.globalAlpha=1;
    if (result.cushioning.available && state.mass > 0 && result.cushioning.velocity > 0) {
      const px=lx(Math.min(Math.max(state.mass,xMin),xMax)), py=ly(Math.min(Math.max(result.cushioning.velocity,yMin),yMax));
      ctx.beginPath(); ctx.fillStyle=result.cushioning.pass?"#167553":"#b63831"; ctx.arc(px,py,6,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#fff"; ctx.lineWidth=2; ctx.stroke();
      ctx.font="800 11px system-ui, sans-serif"; ctx.textAlign=px>pad.left+pw*.7?"right":"left"; ctx.textBaseline="bottom"; ctx.fillStyle=result.cushioning.pass?"#10563e":"#8b2e28"; ctx.fillText("Punto di lavoro",px+(px>pad.left+pw*.7?-10:10),py-8);
    }
  }

  function exportData() {
    const payload = { application: "Calcolo cilindro pneumatico", version: 1, savedAt: new Date().toISOString(), data: state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="dati-cilindro.json"; a.click(); URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result); state = M.normalize(parsed.data || parsed); setFormValues(); saveState(); render();
      } catch (_) { alert("Il file selezionato non contiene dati validi per questa applicazione."); }
    };
    reader.readAsText(file);
  }

  function initialize() {
    buildCurveSelector(); setFormValues();
    $("#input-form").addEventListener("input", readForm); $("#input-form").addEventListener("change", () => { toggleConditionalFields(); readForm(); });
    $$(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    $$('[data-go]').forEach((button) => button.addEventListener("click", () => showView(button.dataset.go)));
    $("#reset-button").addEventListener("click", () => { if (confirm("Ripristinare tutti i valori dell’esempio Excel?")) { state={...M.DEFAULTS}; setFormValues(); saveState(); render(); } });
    $("#export-button").addEventListener("click", exportData); $("#import-button").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", (event) => { if (event.target.files[0]) importData(event.target.files[0]); event.target.value=""; });
    $("#print-button").addEventListener("click", () => window.print());
    $("#about-button").addEventListener("click", () => $("#about-dialog").showModal());
    $$('[data-lesson]').forEach((button) => button.addEventListener("click", () => {
      const dialog = document.getElementById(`lesson-${button.dataset.lesson}`);
      if (dialog) dialog.showModal();
    }));
    $("#chart-bore").addEventListener("change", () => {
      const bore = Number($("#chart-bore").value);
      renderCurveDetails(bore, M.calculateCushioning({ ...state, bore }));
      drawChart(M.calculate(state));
    });
    window.addEventListener("resize", () => { if (currentView === "cushioning") drawChart(M.calculate(state)); });
    window.addEventListener("beforeprint", () => drawChart(M.calculate(state)));
    render();
  }

  // Dedicated integration boundary: the AI assistant NEVER changes formulas.
  window.CylinderAppBridge = Object.freeze({
    getData: () => ({ ...state }),
    fillFromAssistant: (inputs) => {
      const candidate = { ...state, ...inputs };
      const validation = M.validate(candidate);
      if (!validation.valid) return { ok: false, errors: validation.errors };
      state = M.normalize(candidate);
      setFormValues(); saveState(); showView("inputs"); render();
      return { ok: true };
    }
  });
  initialize();
})();
