(function() {
  'use strict';
  const S = window.CylinderAISchema;
  const $ = sel => document.querySelector(sel);
  let values = {};
  let busy = false;
  let configured = false;
  let accessCodeRequired = false;
  const dialog = $('#ai-dialog');
  const messages = $('#ai-messages');
  const sections = $('#ai-sections');
  const applyButton = $('#ai-apply-button');
  const input = $('#ai-input');
  const keyInput = $('#ai-api-key');
  function isReady() {return configured && keyInput.value.trim().length >= 15;}
  function updateSendState() {
    const length=keyInput.value.trim().length;
    const status=$('#ai-key-status');
    status.textContent=length >= 15
      ? 'Chiave inserita nel campo (non ancora verificata da Google).'
      : length > 0
        ? 'Chiave rilevata ma troppo breve: incolla la chiave API completa.'
        : 'Nessuna chiave API inserita.';
    status.className='ai-key-status ' + (length>=15?'ai-key-present':length>0?'ai-key-short':'');
    $('#ai-send-button').disabled = !isReady() || busy;
  }

  function addBubble(text, role) {
    const row = document.createElement('div');
    row.className = 'ai-message ai-message-' + role;
    const bubble = document.createElement('div');
    bubble.textContent = text;
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function fieldValue(f) {
    return S.isFilled(values, f.key) ? String(values[f.key]) : '';
  }

  function makeInput(f) {
    const el = document.createElement(f.type === 'select' ? 'select' : 'input');
    el.className = 'ai-field-control';
    el.setAttribute('aria-label', f.label);
    el.dataset.key = f.key;
    if (f.type === 'select') {
      const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Da specificare'; el.appendChild(empty);
      for (const option of f.items || []) {
        const item = document.createElement('option');
        item.value = String(Array.isArray(option) ? option[0] : option);
        item.textContent = String(Array.isArray(option) ? option[1] : option);
        el.appendChild(item);
      }
    } else {
      el.type = 'number'; el.step = 'any'; el.placeholder = 'Da specificare';
    }
    el.value = fieldValue(f);
    el.addEventListener('change', () => {
      if (el.value.trim() === '') delete values[f.key];
      else values[f.key] = (f.type === 'number' || (f.items && typeof f.items[0] === 'number')) ? Number(el.value) : el.value;
      renderFields();
    });
    return el;
  }

  function renderFields() {
    const summary = S.summary(values);
    sections.replaceChildren();
    for (const group of S.groups) {
      const block = document.createElement('div'); block.className = 'ai-data-group';
      const heading = document.createElement('div'); heading.className = 'ai-group-label';
      heading.textContent = group.icon + '   ' + group.title; block.appendChild(heading);
      for (const row of group.fields) {
        const f = S.map[row[0]];
        if (f.conditional && !(f.conditional === 'manualLoad' && values.loadMode === 'manual') && !(f.conditional === 'manualVelocity' && values.velocityMode === 'manual')) continue;
        const line = document.createElement('label');
        const hasValue = S.isFilled(values, f.key);
        line.className = 'ai-data-row ' + (summary.errors[f.key] ? 'ai-invalid' : hasValue ? 'ai-filled' : 'ai-missing');
        const name = document.createElement('span'); name.className = 'ai-data-name'; name.textContent = f.label;
        const control = makeInput(f);
        const unit = document.createElement('span'); unit.className = 'ai-unit'; unit.textContent = f.unit === '-' ? '' : f.unit;
        const dot = document.createElement('span'); dot.className = 'ai-dot';
        dot.textContent = summary.errors[f.key] ? '!' : hasValue ? '\u2713' : '?';
        dot.title = summary.errors[f.key] || (hasValue ? 'Dato acquisito' : 'Dato da chiedere');
        line.append(name, control, unit, dot); block.appendChild(line);
        if (summary.errors[f.key]) {
          const error = document.createElement('p');error.className='ai-field-error';error.textContent=summary.errors[f.key];block.appendChild(error);
        }
      }
      sections.appendChild(block);
    }
    $('#ai-progress-text').textContent = summary.completed + ' / ' + summary.required.length + ' dati richiesti';
    $('#ai-progress-percent').textContent = Math.round(100 * summary.completed / summary.required.length) + '%';
    $('#ai-progress-fill').style.width = (100 * summary.completed / summary.required.length) + '%';
    applyButton.disabled = !summary.ready;
    if (summary.ready) {
      $('#ai-status-note').textContent = 'Tutti i campi necessari sono presenti. Controlla i valori e conferma il trasferimento.';
      $('#ai-status-note').className = 'ai-status-note ai-status-ready';
    } else {
      const errorsCount = Object.keys(summary.errors).length;
      $('#ai-status-note').textContent = summary.missing.length + ' dati mancanti' + (errorsCount ? ', ' + errorsCount + ' da correggere' : '') + '. I valori preimpostati dell\'app non sono considerati risposte.';
      $('#ai-status-note').className = 'ai-status-note';
    }
  }

  function nextQuestion() {
    const missing = S.missingKeys(values);
    if (!missing.length) return 'Grazie. Tutti i parametri sono stati acquisiti. Controlla il riepilogo e scegli Compila e calcola.';
    const labels = missing.slice(0, 3).map(k => {
      const f = S.map[k]; return f.label + (f.unit !== '-' ? ' (' + f.unit + ')' : '');
    });
    return 'Per completare i calcoli mi servono ancora questi dati: ' + labels.join('; ') + '. Puoi indicarli in modo discorsivo?';
  }

  function errorText(code) {
    const catalog = {
      PERSONAL_KEY_MISSING: 'Il server non ha ricevuto alcuna chiave API. Controlla il campo Chiave Gemini.',
      PERSONAL_KEY_FORMAT: 'La chiave e presente, ma il formato non sembra corretto. Incolla soltanto la chiave copiata da Google AI Studio, senza virgolette, spazi o righe aggiuntive.',
      ACCESS_DENIED: 'Codice di accesso al laboratorio non corretto.',
      RATE_LIMIT_PROVIDER: 'Google ha raggiunto il limite delle richieste. Riprovare piu tardi.',
      MODEL_NOT_FOUND: 'Il modello Gemini configurato non e disponibile per questa chiave. Contatta il docente per scegliere un modello compatibile.',
      PROVIDER_TIMEOUT: 'Google non ha risposto entro il limite di attesa. Riprova piu tardi.',
      SESSION_QUOTA: 'Limite orario per questa sessione raggiunto.',
      GLOBAL_QUOTA: 'Limite di utilizzo dell\'applicazione raggiunto.',
      PROVIDER_HTTP_ERROR: 'Problema temporaneo delle API Gemini.',
      INVALID_MODEL_RESPONSE: 'La risposta di Gemini non e un JSON interpretabile. Riprova.',
      BAD_REQUEST_PROVIDER: 'La richiesta non e supportata dal modello Gemini configurato.',
      UNAUTHORIZED_PROVIDER: 'La chiave personale non e valida o non ha accesso al modello selezionato. Verifica il progetto in Google AI Studio.',
      ORIGIN_INVALID: 'Richiesta rifiutata: pagina di origine non consentita.'
    };
    return catalog[code] || 'Si e verificato un problema di comunicazione. Controlla la connessione al server.';
  }

  async function checkAvailability() {
    const label = $('#ai-connection');
    try {
      const response = await fetch('/api/assistant/status', { credentials:'same-origin', cache:'no-store' });
      if (!response.ok) throw Error('unavailable');
      const status = await response.json();
      configured = Boolean(status.available);
      accessCodeRequired = Boolean(status.accessCodeRequired);
      $('#ai-access-wrap').hidden = !accessCodeRequired;
      label.textContent = configured ? 'Server API attivo · chiave personale' : 'Server API non disponibile';
      label.className = 'ai-connection ' + (configured ? 'ai-connected' : 'ai-disconnected');
      if (!configured) addBubble('Il servizio API non e raggiungibile.', 'assistant');
      updateSendState();
    } catch (err) {
      configured = false;
      $('#ai-send-button').disabled = true;
      label.textContent = 'Server richiesto'; label.className = 'ai-connection ai-disconnected';
      addBubble('Per utilizzare Gemini apri l\'applicazione tramite il server Node.js/Render. I calcoli tradizionali rimangono disponibili offline.', 'assistant');
    }
  }

  async function sendMessage() {
    const message = input.value.trim();
    if (!message || busy || !configured) return;
    if (!isReady()) {addBubble(errorText('PERSONAL_KEY_MISSING'), 'assistant'); updateSendState(); return;}
    busy = true;
    $('#ai-send-button').disabled = true;
    input.value = '';
    addBubble(message, 'user');
    const pending = document.createElement('div'); pending.className = 'ai-pending';
    pending.textContent = 'Gemini sta estraendo i dati...'; messages.appendChild(pending);
    messages.scrollTop = messages.scrollHeight;
    try {
      const response = await fetch('/api/assistant/extract', {
        method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/json','X-Lab-Access':accessCodeRequired ? $('#ai-access-code').value : ''},
        body:JSON.stringify({message, known:values, apiKey:keyInput.value.trim()}),
        signal:AbortSignal.timeout(38000)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw Error(payload.error || 'UNKNOWN');
      for (const [k,v] of Object.entries(payload.updates || {})) {
        if (S.map[k]) values[k] = v;
      }
      renderFields();
      const issueText = (payload.issues || []).join('. ');
      const noteText = payload.notes ? ' Nota: ' + payload.notes : '';
      const detected = Object.keys(payload.updates || {}).length;
      let reply = detected ? 'Ho identificato ' + detected + ' dato/i nel tuo testo. ' : 'Non ho individuato nuovi parametri espliciti. ';
      if (issueText) reply += 'Valori da rivedere: ' + issueText + '. ';
      reply += nextQuestion() + noteText;
      addBubble(reply, 'assistant');
    } catch (err) {
      input.value = message;
      addBubble(errorText(err.name === 'TimeoutError' ? 'PROVIDER_TIMEOUT' : err.message), 'assistant');
    } finally {
      pending.remove(); busy = false; updateSendState();
    }
  }

  function apply() {
    const summary = S.summary(values);
    if (!summary.ready) { renderFields(); return; }
    const result = window.CylinderAppBridge.fillFromAssistant(values);
    if (!result.ok) {
      addBubble('I campi sono presenti, ma la verifica numerica ha rilevato errori: ' + Object.keys(result.errors).join(', ') + '. Correggili nel pannello a destra.', 'assistant');
      return;
    }
    dialog.close();
    $('#validation-summary').textContent = 'Dati acquisiti tramite assistente Gemini e verificati. I calcoli sono eseguiti localmente.';
    $('#validation-summary').scrollIntoView({block:'nearest', behavior:'smooth'});
  }

  function reset() {
    values = {};
    messages.replaceChildren();
    addBubble('Descrivi il progetto pneumatico come preferisci. Verifico tutti i dati richiesti per forze, portate, carico di punta e ammortizzo. Se manca qualcosa te lo chiedero. Non inventero valori numerici.', 'assistant');
    renderFields();
    input.value = '';
  }

  keyInput.addEventListener('input', () => {
    // Previous prompts about a missing key may remain visible after the user
    // inserts a key; remove just these obsolete notices, not the chat history.
    if(keyInput.value.trim().length >= 15) {
      messages.querySelectorAll('.ai-message-assistant').forEach(row => {
        const bubble=row.firstElementChild;
        if(bubble && (bubble.textContent === 'Inserisci la tua chiave API personale di Google AI Studio per iniziare.' ||
                      bubble.textContent === errorText('PERSONAL_KEY_MISSING'))) row.remove();
      });
    }
    updateSendState();
  });
  $('#ai-show-key').addEventListener('click', () => {
    const visible=keyInput.type === 'text'; keyInput.type=visible?'password':'text'; $('#ai-show-key').textContent=visible?'Mostra':'Nascondi';
  });
  $('#ai-clear-key').addEventListener('click', () => {
    keyInput.value=''; keyInput.type='password'; $('#ai-show-key').textContent='Mostra'; updateSendState(); keyInput.focus();
  });
  $('#ai-open-button').addEventListener('click', () => {
    dialog.showModal();
    if (!messages.children.length) reset();
    checkAvailability();
    (isReady()?input:keyInput).focus();
  });
  $('#ai-close-button').addEventListener('click', () => dialog.close());
  $('#ai-send-button').addEventListener('click', sendMessage);
  $('#ai-apply-button').addEventListener('click', apply);
  $('#ai-reset-button').addEventListener('click', reset);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); sendMessage(); }
  });
  renderFields();
  updateSendState();
})();
