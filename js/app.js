/* ═══════════════════════════════════════════════════════
   HydroBalance AI — Main App Controller
════════════════════════════════════════════════════════ */

const appState = {
  sources: [],
  pressurePoints: [],
  consumptionData: [],
  sourceSeries: {},
  lastAnalysis: null,
  currentData: null,
  activeTab: 'd1',
  projectDirty: false,
  consumptionPattern: null   // null = usa MOCK.consumptionPatterns.residential
};

const app = (() => {

  // ══════════════════════════════════════════════════════
  // COLUMN RESIZE — drag handles between panels
  // ══════════════════════════════════════════════════════
  function initColumnResize() {
    const layout   = document.querySelector('.app-layout');
    const leftHdl  = document.getElementById('resizeLeft');
    const rightHdl = document.getElementById('resizeRight');
    if (!layout || !leftHdl || !rightHdl) return;

    let dragging = null, startX = 0, startLeft = 0, startRight = 0;

    function colWidths() {
      const cols = getComputedStyle(layout).gridTemplateColumns.split(' ');
      return { left: parseFloat(cols[0]), right: parseFloat(cols[4]) };
    }

    function applyWidths(left, right) {
      left  = Math.max(160, Math.min(520, left));
      right = Math.max(160, Math.min(520, right));
      layout.style.gridTemplateColumns = `${left}px 5px 1fr 5px ${right}px`;
    }

    function onDown(e, handle) {
      dragging = handle;
      startX = e.clientX;
      const w = colWidths();
      startLeft  = w.left;
      startRight = w.right;
      handle.classList.add('dragging');
      document.body.style.cursor     = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (dragging === leftHdl)  applyWidths(startLeft + dx, startRight);
      if (dragging === rightHdl) applyWidths(startLeft,      startRight - dx);
    }

    function onUp() {
      if (!dragging) return;
      dragging.classList.remove('dragging');
      dragging = null;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      // Persist
      localStorage.setItem('hb_colwidths', layout.style.gridTemplateColumns);
      // Resize charts to fill new space
      setTimeout(() => {
        Object.values(charts.instances).forEach(inst => inst?.resize?.());
      }, 50);
    }

    leftHdl.addEventListener('mousedown',  e => onDown(e, leftHdl));
    rightHdl.addEventListener('mousedown', e => onDown(e, rightHdl));
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);

    // Restore saved widths
    const saved = localStorage.getItem('hb_colwidths');
    if (saved) layout.style.gridTemplateColumns = saved;
  }

  // ── Debounce ──────────────────────────────────────────
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // ── Flash KPI cards to signal update ─────────────────
  function flashKPIs() {
    document.querySelectorAll('.kpi-card').forEach(el => {
      el.style.transition = 'opacity 0.12s';
      el.style.opacity = '0.4';
      setTimeout(() => { el.style.opacity = '1'; }, 140);
    });
  }

  // ══════════════════════════════════════════════════════
  // BUILD SCALED DATA
  //
  // Fluxo de cálculo (o que cada campo afeta):
  //
  //  Multiplicador da fonte  →  escala flowTotal (curva "Medido")
  //  Vazão Constante Adicional → somada ao flowTotal
  //  Tabela de consumo (Lig × Cons/dia) → flowConsumption
  //  haxPer1 (% perdas reais)  → fraciona as perdas totais
  //  haxPer2 (% perdas aparen.) → fraciona as perdas totais
  //
  //  Perdas Totais = flowTotal − flowConsumption
  //  Perdas Reais  = Perdas Totais × haxPer1/(haxPer1+haxPer2)
  //  Perdas Apar.  = Perdas Totais × haxPer2/(haxPer1+haxPer2)
  // ══════════════════════════════════════════════════════
  function buildScaledData(params) {

    const mathAvg = arr => arr.reduce((a,b)=>a+b,0) / arr.length;
    const scaleArr = (arr, target) => {
      const a = mathAvg(arr);
      return a > 0 ? arr.map(v => +(v / a * target).toFixed(3)) : arr.map(() => +target.toFixed(3));
    };

    // ── 1. Fonte de Vazão: Multiplicador ─────────────
    // Cada fonte contribui; média dos multiplicadores ativos
    const activeSources = appState.sources.filter(s => s);
    const combinedMult = activeSources.length > 0
      ? activeSources.reduce((s, src) => s + (parseFloat(src.multiplier) || 1), 0) / activeSources.length
      : 1;

    // Adicional constante (m³/h)
    const addFlow = parseFloat(params.additionalFlow) || 0;

    // flowTotal = curva medida (MOCK × multiplicador + adicional)
    const mockTotalAvg = mathAvg(MOCK.flowTotal);
    const measuredAvg  = mockTotalAvg * combinedMult + addFlow;
    const flowTotal    = scaleArr(MOCK.flowTotal, measuredAvg);

    // ── 2. Cadastro de Consumo ────────────────────────
    const tableConsumM3h = appState.consumptionData.reduce(
      (s, r) => s + ((r.connections || 0) * (r.avgConsumption || 0) / 24), 0
    );
    const consumptionM3h = tableConsumM3h > 0 ? tableConsumM3h : mathAvg(MOCK.flowConsumption);
    // Use custom pattern if set, otherwise use default residential MOCK shape
    const patternBase = appState.consumptionPattern || MOCK.consumptionPatterns.residential;
    const flowConsumption = scaleArr(patternBase, consumptionM3h);

    // ── 3. Perdas = Medido − Consumo ─────────────────
    const totalAvg   = mathAvg(flowTotal);
    const lossAvg    = Math.max(0, totalAvg - consumptionM3h);

    // haxPer1 e haxPer2 definem a proporção real × aparente
    const p1 = Math.max(0.01, params.haxPer1 || 35);
    const p2 = Math.max(0.01, params.haxPer2 || 10);
    const realFraction = p1 / (p1 + p2);
    const appFraction  = p2 / (p1 + p2);

    const realLossAvg = lossAvg * realFraction;
    const appLossAvg  = lossAvg * appFraction;

    const flowRealLoss     = scaleArr(MOCK.flowRealLoss,     realLossAvg);
    const flowApparentLoss = scaleArr(MOCK.flowApparentLoss, appLossAvg);

    // ── 4. Curvas derivadas ───────────────────────────
    // Calibrado = soma dos componentes (target do modelo)
    const flowCalibrated = flowConsumption.map((c, i) =>
      +(c + flowRealLoss[i] + flowApparentLoss[i]).toFixed(3));

    // Simulado = flowTotal × 0.97 (antes da calibração)
    const flowSimulated = flowTotal.map(v => +(v * 0.97).toFixed(3));

    return {
      ...MOCK,
      flowTotal,       // ← muda com Multiplicador da fonte
      flowSimulated,   // ← muda com Multiplicador da fonte
      flowConsumption, // ← muda com tabela de consumo
      flowRealLoss,    // ← muda com Multiplicador + haxPer1/haxPer2
      flowApparentLoss,// ← muda com Multiplicador + haxPer1/haxPer2
      flowCalibrated   // ← muda com tabela de consumo + haxPer1/haxPer2
    };
  }

  // ══════════════════════════════════════════════════════
  // SYNC CONSUMPTION TABLE → appState (before each calc)
  // ══════════════════════════════════════════════════════
  function syncConsumptionFromDOM() {
    document.querySelectorAll('#consumptionBody tr[id^="crow-"]').forEach(tr => {
      const id = +tr.id.replace('crow-', '');
      const row = appState.consumptionData.find(r => r.id === id);
      if (!row) return;
      const inputs = tr.querySelectorAll('input[type="number"], input[type="text"]');
      if (inputs[0]) row.category       = inputs[0].value;
      if (inputs[1]) row.connections    = +inputs[1].value || 0;
      if (inputs[2]) row.avgConsumption = +inputs[2].value || 0;
    });
  }

  // ══════════════════════════════════════════════════════
  // LIVE UPDATE — 500ms debounce, no loading screen
  // ══════════════════════════════════════════════════════
  function liveUpdate() {
    try {
      syncConsumptionFromDOM();
      const params = gatherParams();
      const scaledData = buildScaledData(params);
      const analysis   = hydraulicEngine.runFullAnalysis(scaledData, params);

      appState.lastAnalysis = analysis;
      appState.currentData  = scaledData;

      charts.updateMainChart(scaledData);
      ui.updateKPIs(analysis.kpis);
      ui.updateVMNDisplay(analysis.vmn);
      ui.updateConsumptionStats();
      ui.updateLastCalc();
      flashKPIs();
    } catch (err) {
      console.warn('[LiveUpdate]', err.message, err);
    }
  }

  const debouncedUpdate = debounce(liveUpdate, 500);

  // ══════════════════════════════════════════════════════
  // INIT LIVE LISTENERS
  // ══════════════════════════════════════════════════════
  function initLiveUpdates() {
    // Param inputs
    [
      'p_haxPer1','p_haxPer2','p_E1','p_diBloco',
      'p_pEstad1','p_diZona','p_autoPri','p_dias',
      'p_reservoir','additionalFlow'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', debouncedUpdate);
    });

    // Consumption table (delegate to tbody)
    const tbody = document.getElementById('consumptionBody');
    if (tbody) {
      tbody.addEventListener('input',  debouncedUpdate);
      tbody.addEventListener('change', debouncedUpdate);
    }

    // Sources list (multiplier, flow min/max)
    const srcList = document.getElementById('sourcesList');
    if (srcList) {
      srcList.addEventListener('input',  debouncedUpdate);
      srcList.addEventListener('change', debouncedUpdate);
    }

    // Preset buttons already call ui.applyPreset() → that calls debouncedUpdate via param inputs
    console.log('[HydroBalance] Live update listeners ready.');
  }

  // ══════════════════════════════════════════════════════
  // FULL ANALYSIS (Executar Análise button)
  // ══════════════════════════════════════════════════════
  function runAnalysis() {
    ui.showLoading('Executando análise hidráulica...', 2200);
    const params = gatherParams();

    setTimeout(() => {
      try {
        syncConsumptionFromDOM();
        const scaledData = buildScaledData(params);
        const analysis   = hydraulicEngine.runFullAnalysis(scaledData, params);
        appState.lastAnalysis = analysis;
        appState.currentData  = scaledData;

        charts.updateMainChart(scaledData);
        charts.initVMNChart(scaledData);
        ui.updateKPIs(analysis.kpis);
        ui.updateVMNDisplay(analysis.vmn);
        ui.updateReservoirTable(analysis.reservoirBalance);
        charts.updateReservoirChart(analysis.reservoirBalance);
        ui.renderInsights(analysis.insights);
        ui.updateConsumptionStats();
        ui.updateLastCalc();
        flashKPIs();
        ui.hideLoading();
        ui.toast(`Análise concluída — Perdas: ${analysis.kpis.lossIndex.toFixed(1)}%`, 'success');
      } catch (err) {
        ui.hideLoading();
        ui.toast('Erro: ' + err.message, 'error');
        console.error('[runAnalysis]', err);
      }
    }, 2300);
  }

  // ══════════════════════════════════════════════════════
  // CALCULATE BALANCE (panel button)
  // ══════════════════════════════════════════════════════
  function calculateBalance() {
    syncConsumptionFromDOM();
    const params = gatherParams();
    ui.showLoading('Calculando balanço...', 900);

    setTimeout(() => {
      try {
        const scaledData = buildScaledData(params);
        const analysis   = hydraulicEngine.runFullAnalysis(scaledData, params);
        appState.lastAnalysis = analysis;
        appState.currentData  = scaledData;

        charts.updateMainChart(scaledData);
        charts.initVMNChart(scaledData);
        ui.updateKPIs(analysis.kpis);
        ui.updateVMNDisplay(analysis.vmn);
        ui.updateReservoirTable(analysis.reservoirBalance);
        ui.updateConsumptionStats();
        ui.updateLastCalc();
        flashKPIs();
        ui.hideLoading();
        ui.toast('Balanço calculado.', 'success');
      } catch (err) {
        ui.hideLoading();
        ui.toast('Erro: ' + err.message, 'error');
        console.error('[calculateBalance]', err);
      }
    }, 1000);
  }

  // ══════════════════════════════════════════════════════
  // REFRESH INSIGHTS
  // ══════════════════════════════════════════════════════
  function refreshInsights() {
    const data = appState.currentData || MOCK;
    ui.renderInsights(hydraulicEngine.generateInsights(data));
    ui.toast('Insights atualizados.', 'info', 2000);
  }

  // ══════════════════════════════════════════════════════
  // RECALCULATE FROM IMPORTED SOURCES
  // ══════════════════════════════════════════════════════
  function recalculateFromSources() {
    if (Object.keys(appState.sourceSeries).length === 0) return;
    const combined = Array(24).fill(0);
    let count = 0;
    Object.values(appState.sourceSeries).forEach(s => {
      s.forEach((v, i) => { combined[i] += v; });
      count++;
    });
    MOCK.flowTotal.splice(0, 24, ...combined.map(v => +(v / Math.max(1, count)).toFixed(3)));
    ui.toast('Fontes recalculadas.', 'info');
    liveUpdate();
  }

  // ══════════════════════════════════════════════════════
  // GATHER UI PARAMS
  // ══════════════════════════════════════════════════════
  function gatherParams() {
    const n = id => +(document.getElementById(id)?.value || 0);
    return {
      n1: 0.5,
      haxPer1:       n('p_haxPer1'),
      haxPer2:       n('p_haxPer2'),
      E1:            n('p_E1'),
      diBloco:       n('p_diBloco'),
      pEstad1:       n('p_pEstad1'),
      diZona:        n('p_diZona'),
      autoPri:       n('p_autoPri'),
      dias:          n('p_dias'),
      reservoirPct:  n('p_reservoir'),
      additionalFlow:n('additionalFlow'),
      connections:   appState.consumptionData.reduce((s,r)=>s+(r.connections||0),0) || 2432,
      reservoirVolume: 500
    };
  }

  // ══════════════════════════════════════════════════════
  // PROJECT SAVE / LOAD
  // ══════════════════════════════════════════════════════
  function saveProject() {
    const name = document.getElementById('projectName')?.value || 'Projeto';
    const proj = {
      version: '2.1', projectName: name,
      savedAt: new Date().toISOString(),
      consumptionData: appState.consumptionData,
      sources: appState.sources,
      pressurePoints: appState.pressurePoints,
      params: gatherParams()
    };
    localStorage.setItem(`hb_${name.replace(/\s+/g,'_')}`, JSON.stringify(proj));
    exportModule.exportJSON();
    ui.toast(`Projeto "${name}" salvo.`, 'success');
    appState.projectDirty = false;
  }

  function loadProject() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = ev => {
        const res = parser.parseProjectJSON(ev.target.result);
        if (res.error) { ui.toast(res.error, 'error'); return; }
        const d = res.data;
        const el = document.getElementById('projectName');
        if (el && d.projectName) el.value = d.projectName;
        if (d.consumptionData) {
          document.getElementById('consumptionBody').innerHTML = '';
          appState.consumptionData = [];
          d.consumptionData.forEach(row => { appState.consumptionData.push(row); ui.renderConsumptionRow(row); });
          ui.updateConsumptionStats();
        }
        ui.toast(`"${d.projectName || 'projeto'}" carregado.`, 'success');
        runAnalysis();
      };
      r.readAsText(f);
    };
    inp.click();
  }

  // ══════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════
  function init() {
    ui.init(); // populates appState.consumptionData from MOCK

    const params = gatherParams();
    const initData = buildScaledData(params);
    appState.currentData = initData;

    const analysis = hydraulicEngine.runFullAnalysis(initData, { n1: 0.5, connections: 2432, reservoirVolume: 500 });
    appState.lastAnalysis = analysis;

    charts.initAll(initData, analysis.reservoirBalance);
    ui.updateKPIs(analysis.kpis);
    ui.updateVMNDisplay(analysis.vmn);
    ui.updateReservoirTable(analysis.reservoirBalance);
    ui.renderInsights(analysis.insights);

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Auto-save restore
    try {
      const sv = JSON.parse(localStorage.getItem('hb_autosave') || '{}');
      if (sv.projectName) {
        const el = document.getElementById('projectName');
        if (el) el.value = sv.projectName;
      }
    } catch (_) {}

    // Live listeners (small delay to let panel DOM settle)
    setTimeout(initLiveUpdates, 400);
    initColumnResize();

    // Auto-save every 2 min
    setInterval(() => {
      if (!appState.projectDirty) return;
      try {
        localStorage.setItem('hb_autosave', JSON.stringify({
          projectName: document.getElementById('projectName')?.value || 'Projeto',
          consumptionData: appState.consumptionData,
          sources: appState.sources
        }));
      } catch (_) {}
      appState.projectDirty = false;
    }, 120000);

    document.addEventListener('change', () => { appState.projectDirty = true; });

    ui.toast('HydroBalance AI pronto. Altere qualquer campo — os dados atualizam automaticamente.', 'info', 5000);
  }

  return {
    init, runAnalysis, calculateBalance,
    refreshInsights, recalculateFromSources,
    saveProject, loadProject,
    gatherParams, buildScaledData, liveUpdate
  };
})();

// ── Bootstrap ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  app.init();

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); app.runAnalysis(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='s')     { e.preventDefault(); app.saveProject(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='e')     { e.preventDefault(); exportModule.exportCSV('all'); }
    if (e.key==='Escape') ui.closeModal();
  });

  console.log('%c HydroBalance AI v2.1 ', 'background:#00838f;color:white;font-size:14px;padding:4px 10px;border-radius:4px');
  console.log('%c Ctrl+Enter=Analisar | Ctrl+S=Salvar | Ctrl+E=Exportar', 'color:#00bcd4;font-size:11px');
});
