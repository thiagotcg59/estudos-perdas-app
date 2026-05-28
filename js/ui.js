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
          <label>Multiplicador</label>
          <input type="number" class="f-input" value="${data.multiplier}" step="0.01"
            onchange="ui.updateSource(${data.id},'multiplier',+this.value)">
        </div>
        <div class="item-row">
          <label>Vazão Min (m³/h)</label>
          <input type="number" class="f-input" value="${data.flowMin}" step="0.01"
            onchange="ui.updateSource(${data.id},'flowMin',+this.value)">
        </div>
        <div class="item-row">
          <label>Vazão Max (m³/h)</label>
          <input type="number" class="f-input" value="${data.flowMax}" step="0.01"
            onchange="ui.updateSource(${data.id},'flowMax',+this.value)">
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
            onchange="ui.updatePressure(${data.id},'sensor',this.value)">
        </div>
        <div class="item-row">
          <label>Cota (m)</label>
          <input type="number" class="f-input" value="${data.cota}" step="0.5"
            onchange="ui.updatePressure(${data.id},'cota',+this.value)">
        </div>
        <div class="item-row">
          <label>P Mín (mca)</label>
          <input type="number" class="f-input" value="${data.pMin}" step="1"
            onchange="ui.updatePressure(${data.id},'pMin',+this.value)">
        </div>
        <div class="item-row">
          <label>P Máx (mca)</label>
          <input type="number" class="f-input" value="${data.pMax}" step="1"
            onchange="ui.updatePressure(${data.id},'pMax',+this.value)">
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
        onchange="ui.updateConsumption(${data.id},'category',this.value)"></td>
      <td><input type="number" value="${data.connections}" style="width:56px"
        onchange="ui.updateConsumption(${data.id},'connections',+this.value);ui.updateConsumptionStats()"></td>
      <td><input type="number" value="${data.avgConsumption.toFixed(6)}" step="0.001"
        onchange="ui.updateConsumption(${data.id},'avgConsumption',+this.value);ui.updateConsumptionStats()"></td>
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
      s + ((r.connections || 0) * (r.avgConsumption || 0) / 30 / 24), 0); // m³/mês → m³/h

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
    updateBadge
  };
})();
