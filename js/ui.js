/* ═══════════════════════════════════════════════════════
   HydroBalance AI — UI Module
   DOM manipulation, panels, forms, toasts
════════════════════════════════════════════════════════ */
const ui = (() => {

  let sourceIdCounter = 1;
  let pressureIdCounter = 1;
  let consumptionIdCounter = 1;

  // ══════════════════════════════════════════════════════
  // PANEL TOGGLE
  // ══════════════════════════════════════════════════════
  function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.classList.toggle('collapsed');
  }

  // ══════════════════════════════════════════════════════
  // SOURCES
  // ══════════════════════════════════════════════════════
  function addSource(sourceData = null) {
    const id = sourceIdCounter++;
    const data = sourceData || {
      id, name: `Fonte #${id}`, type: 'Telemetria',
      multiplier: 1.0, interval: 15, validOnly: false, interpolate: true,
      flowMin: 0, flowMax: 0
    };

    appState.sources.push(data);
    renderSource(data);
    updateBadge('sourceCount', appState.sources.length);
  }

  function renderSource(data) {
    const list = document.getElementById('sourcesList');
    const div = document.createElement('div');
    div.className = 'source-item';
    div.id = `source-${data.id}`;
    div.innerHTML = `
      <div class="item-header">
        <span class="item-name">${data.name}</span>
        <button class="item-remove" onclick="ui.removeSource(${data.id})" title="Remover">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="item-rows">
        <div class="item-row">
          <label>Tipo</label>
          <select class="f-select" onchange="ui.updateSource(${data.id},'type',this.value)">
            ${['Telemetria','Macro Medidor','Estimativa','Importação CSV']
              .map(t => `<option${t===data.type?' selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="item-row">
          <label title="Fator de correção do macromedidor. Ex: 1.2 = +20% no fluxo medido → escala a curva Medido (Total) no gráfico">
            Multiplicador ⓘ
          </label>
          <input type="number" class="f-input" value="${data.multiplier}" step="0.01" min="0.01" max="5"
            oninput="ui.updateSource(${data.id},'multiplier',+this.value)">
        </div>
        <div class="item-row">
          <label title="Limite inferior operacional do sensor. Usado para alertas de sub-leitura.">
            Vazão Min (m³/h) ⓘ
          </label>
          <input type="number" class="f-input" value="${data.flowMin}" step="0.1"
            oninput="ui.updateSource(${data.id},'flowMin',+this.value)">
        </div>
        <div class="item-row">
          <label title="Limite superior operacional do sensor. Usado para alertas de sobre-leitura.">
            Vazão Max (m³/h) ⓘ
          </label>
          <input type="number" class="f-input" value="${data.flowMax}" step="0.1"
            oninput="ui.updateSource(${data.id},'flowMax',+this.value)">
        </div>
        <div class="item-row" style="grid-template-columns:auto 1fr auto 1fr">
          <label>Intervalo</label>
          <input type="number" class="f-input" value="${data.interval}" step="5"
            onchange="ui.updateSource(${data.id},'interval',+this.value)" style="width:44px">
          <label style="margin-left:6px">min</label>
          <button class="btn-sm" style="margin-left:4px" onclick="document.getElementById('srcFile${data.id}').click()">
            <i data-lucide="upload"></i> Arq.
          </button>
        </div>
        <input type="file" id="srcFile${data.id}" accept=".csv,.xlsx" style="display:none"
          onchange="parser.handleSourceFile(${data.id}, this.files[0])">
        <div style="display:flex;gap:8px;font-size:10px;color:var(--text-dim)">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" ${data.validOnly?'checked':''}
              onchange="ui.updateSource(${data.id},'validOnly',this.checked)">
            Só horários válidos
          </label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" ${data.interpolate?'checked':''}
              onchange="ui.updateSource(${data.id},'interpolate',this.checked)">
            Interpolar falhas
          </label>
        </div>
      </div>
    `;
    list.appendChild(div);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function removeSource(id) {
    const idx = appState.sources.findIndex(s => s.id === id);
    if (idx > -1) appState.sources.splice(idx, 1);
    const el = document.getElementById(`source-${id}`);
    if (el) el.remove();
    updateBadge('sourceCount', appState.sources.length);
  }

  function updateSource(id, field, value) {
    const src = appState.sources.find(s => s.id === id);
    if (src) src[field] = value;
  }

  // ══════════════════════════════════════════════════════
  // PRESSURE POINTS
  // ══════════════════════════════════════════════════════
  function addPressurePoint(pointData = null) {
    const id = pressureIdCounter++;
    const data = pointData || {
      id, name: `Ponto P${String(id).padStart(2,'0')}`,
      sensor: `PT-${100+id}`, cota: 820, pMin: 10, pMax: 50
    };
    appState.pressurePoints.push(data);
    renderPressurePoint(data);
    updateBadge('pressureCount', appState.pressurePoints.length);
  }

  function renderPressurePoint(data) {
    const list = document.getElementById('pressuresList');
    const div = document.createElement('div');
    div.className = 'pressure-item';
    div.id = `pressure-${data.id}`;
    div.innerHTML = `
      <div class="item-header">
        <span class="item-name">${data.name}</span>
        <button class="item-remove" onclick="ui.removePressurePoint(${data.id})">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="item-rows">
        <div class="item-row">
          <label>Sensor</label>
          <input type="text" class="f-input" value="${data.sensor}"
            oninput="ui.updatePressure(${data.id},'sensor',this.value)">
        </div>
        <div class="item-row">
          <label>Cota (m)</label>
          <input type="number" class="f-input" value="${data.cota}" step="0.5"
            oninput="ui.updatePressure(${data.id},'cota',+this.value)">
        </div>
        <div class="item-row">
          <label>P Mín (mca)</label>
          <input type="number" class="f-input" value="${data.pMin}" step="1"
            oninput="ui.updatePressure(${data.id},'pMin',+this.value)">
        </div>
        <div class="item-row">
          <label>P Máx (mca)</label>
          <input type="number" class="f-input" value="${data.pMax}" step="1"
            oninput="ui.updatePressure(${data.id},'pMax',+this.value)">
        </div>
        <div style="text-align:right">
          <button class="btn-sm" onclick="document.getElementById('pressFile${data.id}').click()">
            <i data-lucide="upload"></i> Importar CSV
          </button>
          <input type="file" id="pressFile${data.id}" accept=".csv" style="display:none">
        </div>
      </div>
    `;
    list.appendChild(div);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function removePressurePoint(id) {
    const idx = appState.pressurePoints.findIndex(p => p.id === id);
    if (idx > -1) appState.pressurePoints.splice(idx, 1);
    const el = document.getElementById(`pressure-${id}`);
    if (el) el.remove();
    updateBadge('pressureCount', appState.pressurePoints.length);
  }

  function updatePressure(id, field, value) {
    const pt = appState.pressurePoints.find(p => p.id === id);
    if (pt) pt[field] = value;
  }

  // ══════════════════════════════════════════════════════
  // CONSUMPTION TABLE
  // ══════════════════════════════════════════════════════
  function addConsumptionRow(rowData = null) {
    const id = consumptionIdCounter++;
    const data = rowData || {
      id, category: 'NOVA CATEGORIA', connections: 0, avgConsumption: 0
    };
    appState.consumptionData.push(data);
    renderConsumptionRow(data);
    updateBadge('consumptionCount', appState.consumptionData.length);
    updateConsumptionStats();
  }

  function renderConsumptionRow(data) {
    const tbody = document.getElementById('consumptionBody');
    const tr = document.createElement('tr');
    tr.id = `crow-${data.id}`;
    tr.innerHTML = `
      <td><input type="text" value="${data.category}"
        oninput="ui.updateConsumption(${data.id},'category',this.value)"></td>
      <td><input type="number" value="${data.connections}" style="width:56px"
        oninput="ui.updateConsumption(${data.id},'connections',+this.value);ui.updateConsumptionStats()"></td>
      <td><input type="number" value="${data.avgConsumption.toFixed(6)}" step="0.001"
        oninput="ui.updateConsumption(${data.id},'avgConsumption',+this.value);ui.updateConsumptionStats()"></td>
      <td>
        <button class="item-remove" onclick="ui.removeConsumptionRow(${data.id})" style="padding:2px">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function removeConsumptionRow(id) {
    const idx = appState.consumptionData.findIndex(r => r.id === id);
    if (idx > -1) appState.consumptionData.splice(idx, 1);
    const el = document.getElementById(`crow-${id}`);
    if (el) el.remove();
    updateBadge('consumptionCount', appState.consumptionData.length);
    updateConsumptionStats();
  }

  function updateConsumption(id, field, value) {
    const row = appState.consumptionData.find(r => r.id === id);
    if (row) row[field] = value;
  }

  function updateConsumptionStats() {
    const totalConnections = appState.consumptionData.reduce((s, r) => s + (r.connections || 0), 0);
    const microTotal = appState.consumptionData.reduce((s, r) =>
      s + ((r.connections || 0) * (r.avgConsumption || 0) / 24), 0); // m³/dia → m³/h

    const el1 = document.getElementById('totalConnectionsDisplay');
    const el2 = document.getElementById('microTotalDisplay');
    const el3 = document.getElementById('totalConnections');
    const el4 = document.getElementById('microTotal');
    const el5 = document.getElementById('statusConnections');

    if (el1) el1.innerHTML = `Lig. (Auto): <strong>${totalConnections.toLocaleString('pt-BR')}</strong>`;
    if (el2) el2.innerHTML = `Micro Total: <strong>${microTotal.toFixed(4)}</strong> m³/h`;
    if (el3) el3.textContent = totalConnections.toLocaleString('pt-BR');
    if (el4) el4.textContent = microTotal.toFixed(4);
    if (el5) el5.textContent = `${totalConnections.toLocaleString('pt-BR')} Ligações`;

    updateBadge('consumptionCount', appState.consumptionData.length);
  }

  // ══════════════════════════════════════════════════════
  // PARAMETER PRESETS
  // ══════════════════════════════════════════════════════
  function applyPreset(presetName) {
    const preset = MOCK.presets[presetName];
    if (!preset) return;

    document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`preset-${presetName}`);
    if (btn) btn.classList.add('active');

    const map = {
      haxPer1: 'p_haxPer1', haxPer2: 'p_haxPer2',
      E1: 'p_E1', diBloco: 'p_diBloco',
      pEstad1: 'p_pEstad1', diZona: 'p_diZona',
      autoPri: 'p_autoPri', dias: 'p_dias'
    };

    Object.entries(map).forEach(([key, elId]) => {
      const el = document.getElementById(elId);
      if (el && preset[key] !== undefined) {
        el.value = preset[key];
        el.dispatchEvent(new Event('input', { bubbles: true })); // trigger live update
      }
    });

    toast(`Preset "${presetName}" aplicado.`, 'info');
  }

  // ══════════════════════════════════════════════════════
  // KPI DISPLAY UPDATE
  // ══════════════════════════════════════════════════════
  function updateKPIs(kpis) {
    const fmt = (v, d=2) => parseFloat(v).toFixed(d).replace('.', ',');

    setEl('kpiConsumption', fmt(kpis.consumption));
    setEl('kpiRealLoss', fmt(kpis.realLoss));
    setEl('kpiApparentLoss', fmt(kpis.apparentLoss));
    setEl('kpiLossIndex', fmt(kpis.lossIndex, 1));

    // Volume summary
    const vReal = (kpis.realLoss * 24).toFixed(0);
    const vApp = (kpis.apparentLoss * 24).toFixed(0);
    const vTot = (parseFloat(vReal) + parseFloat(vApp)).toFixed(0);
    const vIn = kpis.volume24h || 1897;

    setEl('volReal', `${Number(vReal).toLocaleString('pt-BR')} m³`);
    setEl('volApparent', `${Number(vApp).toLocaleString('pt-BR')} m³`);
    setEl('volTotal', `${Number(vTot).toLocaleString('pt-BR')} m³`);
    setEl('pctReal', `${(vReal/vIn*100).toFixed(1)}%`);
    setEl('pctApparent', `${(vApp/vIn*100).toFixed(1)}%`);
    setEl('pctTotal', `${(vTot/vIn*100).toFixed(1)}%`);
  }

  function updateVMNDisplay(vmn) {
    setEl('vmnDetected', `${parseFloat(vmn.vmn).toFixed(1)} m³/h`);
    setEl('vmnTime', vmn.hourLabel);
    setEl('vmnNight', `${vmn.nightConsumption} m³/h`);
    setEl('vmnRealLoss', `${vmn.realLossEstimate} m³/h`);
  }

  function updateLastCalc() {
    const now = new Date();
    const t = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const el = document.getElementById('statusLastCalc');
    if (el) {
      el.innerHTML = `<i data-lucide="clock"></i><span>Último cálculo: ${t}</span>`;
      el.className = 'status-item ok';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }

  // ══════════════════════════════════════════════════════
  // RESERVOIR TABLE
  // ══════════════════════════════════════════════════════
  function updateReservoirTable(reservoirBalance) {
    const tbody = document.getElementById('reservoirBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    reservoirBalance.slice(0, 12).forEach(row => {
      const tr = document.createElement('tr');
      const lvlColor = row.levelPct < 20 ? 'var(--danger)' :
                       row.levelPct < 40 ? 'var(--warn)' : 'var(--ok)';
      tr.innerHTML = `
        <td>${String(row.hour).padStart(2,'0')}:00</td>
        <td style="color:${lvlColor}">${row.levelPct.toFixed(1)}%</td>
        <td>${row.inflow.toFixed(2)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ══════════════════════════════════════════════════════
  // INSIGHTS
  // ══════════════════════════════════════════════════════
  function renderInsights(insights) {
    const container = document.getElementById('insightsList');
    if (!container) return;
    container.innerHTML = '';

    insights.forEach(insight => {
      const div = document.createElement('div');
      div.className = `insight-item ${insight.type}`;
      div.innerHTML = `
        <div class="insight-icon"><i data-lucide="${insight.icon}"></i></div>
        <div>${insight.text}</div>
      `;
      container.appendChild(div);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // ══════════════════════════════════════════════════════
  // TOAST NOTIFICATIONS
  // ══════════════════════════════════════════════════════
  function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { info: 'info', success: 'check-circle', warning: 'alert-triangle', error: 'alert-octagon' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${message}</span>`;
    container.appendChild(t);

    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(100%)';
      t.style.transition = 'all .3s';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  // ══════════════════════════════════════════════════════
  // LOADING OVERLAY
  // ══════════════════════════════════════════════════════
  function showLoading(text = 'Processando...', duration = 1800) {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.getElementById('loadingText');
    const fill = document.getElementById('progressFill');

    if (!overlay) return;
    if (textEl) textEl.textContent = text;
    if (fill) fill.style.width = '0%';
    overlay.style.display = 'flex';

    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(95, progress + Math.random() * 15);
      if (fill) fill.style.width = progress + '%';
    }, duration / 10);

    return setTimeout(() => {
      clearInterval(interval);
      if (fill) fill.style.width = '100%';
      setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }, duration);
  }

  function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = '100%';
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
    }, 300);
  }

  // ══════════════════════════════════════════════════════
  // MODAL
  // ══════════════════════════════════════════════════════
  function openModal(title, bodyHTML) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    if (!overlay) return;
    if (titleEl) titleEl.textContent = title;
    if (body) body.innerHTML = bodyHTML;
    overlay.style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeModal(event) {
    if (event && event.target !== document.getElementById('modalOverlay')) return;
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  // ══════════════════════════════════════════════════════
  // TAB BUTTONS
  // ══════════════════════════════════════════════════════
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.tab-grp')?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        appState.activeTab = btn.dataset.tab;
      });
    });
  }

  // ══════════════════════════════════════════════════════
  // DRAG & DROP
  // ══════════════════════════════════════════════════════
  function initDragDrop() {
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => {
      e.preventDefault();
      const files = [...e.dataTransfer.files];
      if (files.length === 0) return;

      files.forEach(file => {
        if (!file.name.endsWith('.csv')) {
          toast(`Arquivo "${file.name}" não é CSV.`, 'warning');
          return;
        }
        const reader = new FileReader();
        reader.onload = ev => {
          const result = parser.parseFlowCSV(ev.target.result);
          if (result && !result.error) {
            toast(`Arquivo "${file.name}" importado. Atribua a uma fonte.`, 'info');
          } else {
            toast(result?.error || 'Erro na importação.', 'error');
          }
        };
        reader.readAsText(file);
      });
    });
  }

  // ══════════════════════════════════════════════════════
  // PATTERN EDITOR
  // ══════════════════════════════════════════════════════
  let _patternChart  = null;
  let _measuredChart = null;

  function openPatternEditor() {
    const current = appState.consumptionPattern || MOCK.consumptionPatterns.residential;
    const hours = MOCK.hours;

    const gridHTML = hours.map((h, i) => `
      <div class="pe-cell">
        <label class="pe-label">${h}</label>
        <input type="text" inputmode="decimal" id="pe_h${i}" class="pe-input f-input"
          value="${current[i].toFixed(3).replace('.', ',')}"
          placeholder="0,000"
          oninput="ui.updatePatternPreview()">
      </div>`).join('');

    const body = `
      <div class="pe-wrap">
        <div class="pe-top">
          <div class="pe-presets-row">
            <span class="preset-lbl">Preset:</span>
            <button class="btn-preset" onclick="ui.applyPatternPreset('residential')">Residencial BR</button>
            <button class="btn-preset" onclick="ui.applyPatternPreset('commercial')">Comercial</button>
            <button class="btn-preset" onclick="ui.applyPatternPreset('industrial')">Industrial</button>
            <button class="btn-preset" onclick="ui.applyPatternPreset('mixed')">Misto</button>
          </div>
          <div class="pe-chart-wrap">
            <canvas id="patternPreviewCanvas" height="110"></canvas>
          </div>
          <div class="pe-stats-row" id="peStats">
            <span>Pico: <strong id="pePeak">—</strong></span>
            <span>Mínimo: <strong id="peMin">—</strong></span>
            <span>Média: <strong id="peAvg">—</strong></span>
            <span>Fator de pico: <strong id="pePeakFactor">—</strong></span>
          </div>
        </div>
        <div class="pe-grid">${gridHTML}</div>
        <div class="pe-actions-row">
          <button class="btn-sm" onclick="document.getElementById('patternFileMod').click()">
            <i data-lucide="upload"></i> Importar CSV
          </button>
          <input type="file" id="patternFileMod" accept=".csv" style="display:none"
            onchange="parser.parsePatternCSV(this);ui.closeModal()">
          <div style="flex:1"></div>
          <button class="btn-sm" onclick="ui.closeModal()">Cancelar</button>
          <button class="btn-calculate" style="width:auto;padding:6px 20px;margin:0"
            onclick="ui.applyPattern()">
            <i data-lucide="check"></i> Aplicar Padrão
          </button>
        </div>
      </div>`;

    openModal('Padrão de Consumo Horário (24h)', body);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Render preview chart after modal is in DOM
    setTimeout(() => {
      _initPatternChart(current);
      updatePatternStats(current);
    }, 80);
  }

  function _initPatternChart(values) {
    const ctx = document.getElementById('patternPreviewCanvas');
    if (!ctx) return;
    if (_patternChart) { _patternChart.destroy(); _patternChart = null; }

    const avg = values.reduce((a,b)=>a+b,0) / values.length;
    const avgLine = Array(24).fill(+avg.toFixed(3));

    _patternChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MOCK.hours.map(h => h.slice(0,5)),
        datasets: [
          {
            label: 'Multiplicador',
            data: values,
            backgroundColor: values.map(v =>
              v >= 1.3 ? 'rgba(239,83,80,0.7)' :
              v >= 1.0 ? 'rgba(0,188,212,0.6)' :
                         'rgba(38,166,154,0.5)'),
            borderColor: 'transparent',
            borderRadius: 3
          },
          {
            label: 'Média (1.0)',
            data: avgLine,
            type: 'line',
            borderColor: '#ffa726',
            borderDash: [4,3],
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(7,20,32,.95)',
            borderColor: '#00b8d4',
            borderWidth: 1,
            callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(3)}×` }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(0,184,212,0.06)' }, ticks: { color: '#6a9bac', font: { size: 9 } } },
          y: { grid: { color: 'rgba(0,184,212,0.06)' }, ticks: { color: '#6a9bac', font: { size: 9 } }, min: 0 }
        }
      }
    });
  }

  function updatePatternPreview() {
    const values = _readPatternInputs();
    if (!values) return;
    if (_patternChart) {
      const avg = values.reduce((a,b)=>a+b,0) / values.length;
      _patternChart.data.datasets[0].data = values;
      _patternChart.data.datasets[0].backgroundColor = values.map(v =>
        v >= 1.3 ? 'rgba(239,83,80,0.7)' :
        v >= 1.0 ? 'rgba(0,188,212,0.6)' :
                   'rgba(38,166,154,0.5)');
      _patternChart.data.datasets[1].data = Array(24).fill(+avg.toFixed(3));
      _patternChart.update('none');
    }
    updatePatternStats(values);
  }

  function updatePatternStats(values) {
    if (!values || values.length < 24) return;
    const avg  = values.reduce((a,b)=>a+b,0) / values.length;
    const peak = Math.max(...values);
    const min  = Math.min(...values);
    setEl('pePeak',       peak.toFixed(3) + '×');
    setEl('peMin',        min.toFixed(3) + '×');
    setEl('peAvg',        avg.toFixed(3) + '×');
    setEl('pePeakFactor', (peak / avg).toFixed(2));
  }

  function applyPatternPreset(name) {
    const preset = MOCK.consumptionPatterns[name];
    if (!preset) return;
    preset.forEach((v, i) => {
      const el = document.getElementById(`pe_h${i}`);
      if (el) el.value = v.toFixed(3).replace('.', ',');
    });
    updatePatternPreview();
    toast(`Preset "${name}" carregado. Clique em Aplicar para confirmar.`, 'info', 2500);
  }

  function applyPattern() {
    const values = _readPatternInputs();
    if (!values) { toast('Valores inválidos no padrão.', 'error'); return; }

    appState.consumptionPattern = values;

    // Update badge
    const badge = document.getElementById('patternLabel');
    if (badge) badge.textContent = 'Personalizado';

    closeModal();
    app.liveUpdate();
    toast('Padrão de consumo aplicado ao gráfico.', 'success');
  }

  function _parseLocale(str) {
    // Aceita tanto "3.0" (EN) quanto "3,0" (BR)
    str = String(str).trim();
    const hasComma  = str.includes(',');
    const hasPeriod = str.includes('.');
    if (hasComma && hasPeriod) {
      // Detecta qual é o separador decimal (o último)
      str = str.lastIndexOf(',') > str.lastIndexOf('.')
        ? str.replace(/\./g, '').replace(',', '.')   // BR: 1.234,56
        : str.replace(/,/g, '');                      // EN: 1,234.56
    } else if (hasComma) {
      str = str.replace(',', '.');  // BR decimal sem milhar: 3,0 → 3.0
    }
    return parseFloat(str);
  }

  function _readPatternInputs() {
    const values = [];
    for (let i = 0; i < 24; i++) {
      const el = document.getElementById(`pe_h${i}`);
      if (!el) return null;
      const v = _parseLocale(el.value);
      if (isNaN(v) || v < 0) return null;
      values.push(v);
    }
    return values;
  }

  // ══════════════════════════════════════════════════════
  // MEASURED SERIES EDITOR (vazões medidas 24h)
  // ══════════════════════════════════════════════════════
  function openMeasuredEditor() {
    const current = appState.measuredSeries || MOCK.flowTotal;
    const hours   = MOCK.hours;

    const gridHTML = hours.map((h, i) => `
      <div class="pe-cell">
        <label class="pe-label">${h}</label>
        <input type="text" inputmode="decimal" id="ms_h${i}" class="pe-input f-input"
          value="${current[i].toFixed(2).replace('.', ',')}"
          placeholder="0,00"
          oninput="ui.updateMeasuredPreview()">
      </div>`).join('');

    const body = `
      <div class="pe-wrap">
        <div class="pe-top">
          <div style="font-size:11px;color:var(--text-dim);line-height:1.5">
            Insira a <strong style="color:var(--accent)">vazão medida (m³/h)</strong> para cada hora do dia.
            Esses valores alimentam diretamente a curva <span style="color:#ef5350">● Medido (Total)</span> no gráfico.
            O multiplicador da fonte ainda é aplicado por cima.
          </div>
          <div class="pe-chart-wrap">
            <canvas id="measuredPreviewCanvas" height="110"></canvas>
          </div>
          <div class="pe-stats-row" id="msStats">
            <span>Pico: <strong id="msPeak">—</strong></span>
            <span>Mínimo: <strong id="msMin">—</strong></span>
            <span>Média: <strong id="msAvg">—</strong></span>
            <span>Volume/dia: <strong id="msVol">—</strong></span>
          </div>
        </div>

        <div class="pe-grid">${gridHTML}</div>

        <div class="pe-actions-row">
          <button class="btn-sm" onclick="ui.resetMeasuredSeries()" title="Voltar ao MOCK padrão">
            <i data-lucide="rotate-ccw"></i> Resetar
          </button>
          <div style="flex:1"></div>
          <button class="btn-sm" onclick="ui.closeModal()">Cancelar</button>
          <button class="btn-calculate" style="width:auto;padding:6px 20px;margin:0"
            onclick="ui.applyMeasuredSeries()">
            <i data-lucide="check"></i> Aplicar Série
          </button>
        </div>
      </div>`;

    openModal('Série de Vazão Medida — 24h (m³/h)', body);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
      _initMeasuredChart(current);
      _updateMeasuredStats(current);
    }, 80);
  }

  function _initMeasuredChart(values) {
    const ctx = document.getElementById('measuredPreviewCanvas');
    if (!ctx) return;
    if (_measuredChart) { _measuredChart.destroy(); _measuredChart = null; }

    _measuredChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: MOCK.hours.map(h => h.slice(0,5)),
        datasets: [{
          label: 'Medido (m³/h)',
          data: values,
          borderColor: '#ef5350',
          backgroundColor: 'rgba(239,83,80,0.12)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#ef5350',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(7,20,32,.95)',
            borderColor: '#00b8d4',
            borderWidth: 1,
            callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(2)} m³/h` }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(0,184,212,0.06)' }, ticks: { color: '#6a9bac', font: { size: 9 } } },
          y: { grid: { color: 'rgba(0,184,212,0.06)' }, ticks: { color: '#6a9bac', font: { size: 9 } }, min: 0 }
        }
      }
    });
  }

  function updateMeasuredPreview() {
    const values = _readMeasuredInputs();
    if (!values) return;
    if (_measuredChart) {
      _measuredChart.data.datasets[0].data = values;
      _measuredChart.update('none');
    }
    _updateMeasuredStats(values);
  }

  function _updateMeasuredStats(values) {
    if (!values || values.length < 24) return;
    const avg  = values.reduce((a,b)=>a+b,0) / values.length;
    const peak = Math.max(...values);
    const min  = Math.min(...values);
    const vol  = avg * 24;
    setEl('msPeak', peak.toFixed(2) + ' m³/h');
    setEl('msMin',  min.toFixed(2)  + ' m³/h');
    setEl('msAvg',  avg.toFixed(2)  + ' m³/h');
    setEl('msVol',  vol.toFixed(0)  + ' m³/dia');
  }

  function applyMeasuredSeries() {
    const values = _readMeasuredInputs();
    if (!values) { toast('Valores inválidos na série.', 'error'); return; }

    appState.measuredSeries = values;
    const badge = document.getElementById('measuredLabel');
    if (badge) badge.textContent = 'Série manual';

    closeModal();
    app.liveUpdate();
    toast('Série de vazão medida aplicada ao gráfico.', 'success');
  }

  function resetMeasuredSeries() {
    appState.measuredSeries = null;
    const badge = document.getElementById('measuredLabel');
    if (badge) badge.textContent = 'MOCK padrão';
    closeModal();
    app.liveUpdate();
    toast('Série resetada para o padrão MOCK.', 'info');
  }

  function _readMeasuredInputs() {
    const values = [];
    for (let i = 0; i < 24; i++) {
      const el = document.getElementById(`ms_h${i}`);
      if (!el) return null;
      const v = _parseLocale(el.value);
      if (isNaN(v) || v < 0) return null;
      values.push(v);
    }
    return values;
  }

  function importPatternCSV(inputEl) {
    parser.parsePatternCSV(inputEl);
    closeModal();
  }

  // ── Helpers ────────────────────────────────────────────
  function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function updateBadge(id, count) {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  }

  // ══════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════
  function init() {
    // Set date in header
    const dateEl = document.getElementById('headerDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    }

    // Load mock sources
    MOCK.flowSources.forEach(s => addSource(s));

    // Load mock pressure points
    MOCK.pressurePoints.forEach(p => addPressurePoint(p));

    // Load mock consumption categories
    MOCK.consumptionCategories.forEach(c => addConsumptionRow(c));

    initTabs();
    initDragDrop();

    // Reservoir select handler
    document.getElementById('reservoirSelect')?.addEventListener('change', function() {
      if (this.value && appState.lastAnalysis) {
        charts.updateReservoirChart(appState.lastAnalysis.reservoirBalance);
      }
    });
  }

  return {
    init,
    togglePanel,
    addSource, removeSource, updateSource,
    addPressurePoint, removePressurePoint, updatePressure,
    addConsumptionRow, removeConsumptionRow, updateConsumption,
    updateConsumptionStats,
    applyPreset,
    updateKPIs,
    updateVMNDisplay,
    updateLastCalc,
    updateReservoirTable,
    renderInsights,
    toast,
    showLoading,
    hideLoading,
    openModal,
    closeModal,
    setEl,
    updateBadge,
    openPatternEditor,
    applyPatternPreset,
    applyPattern,
    updatePatternPreview,
    importPatternCSV,
    openMeasuredEditor,
    updateMeasuredPreview,
    applyMeasuredSeries,
    resetMeasuredSeries
  };
})();
