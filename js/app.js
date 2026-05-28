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
  projectDirty: false
};

const app = (() => {

  // ── Debounce utility ──────────────────────────────────
  function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  }

  // ══════════════════════════════════════════════════════
  // BUILD SCALED DATA FROM UI INPUTS
  // Reacts to: consumption table, param sliders, multipliers
  // ══════════════════════════════════════════════════════
  function buildScaledData(params) {

    // 1. Consumption from table (m³/h)
    const tableConsumM3h = appState.consumptionData.reduce(
      (s, r) => s + ((r.connections || 0) * (r.avgConsumption || 0) / 30 / 24), 0
    );
    const mockAvgConsum = MOCK.flowConsumption.reduce((a, b) => a + b, 0) / 24;
    const consumScale = (tableConsumM3h > 0 && mockAvgConsum > 0)
      ? tableConsumM3h / mockAvgConsum : 1;

    // 2. Loss percentages from haxPer1 (real) and haxPer2 (apparent)
    const realLossPct  = Math.min(0.80, Math.max(0.01, params.haxPer1 / 100));
    const appLossPct   = Math.min(0.80, Math.max(0.01, params.haxPer2 / 100));
    const mockTotalAvg = MOCK.flowTotal.reduce((a, b) => a + b, 0) / 24;
    const mockRealAvg  = MOCK.flowRealLoss.reduce((a, b) => a + b, 0) / 24;
    const mockAppAvg   = MOCK.flowApparentLoss.reduce((a, b) => a + b, 0) / 24;
    const realScale    = mockRealAvg  > 0 ? (mockTotalAvg * realLossPct) / mockRealAvg  : 1;
    const appScale     = mockAppAvg   > 0 ? (mockTotalAvg * appLossPct)  / mockAppAvg   : 1;

    // 3. Source multiplier (first source or 1.0)
    const srcMult = appState.sources.length > 0
      ? (parseFloat(appState.sources[0].multiplier) || 1) : 1;

    // 4. Additional constant flow (m³/h)
    const addFlow = parseFloat(params.additionalFlow) || 0;

    // Build scaled series
    const flowConsumption  = MOCK.flowConsumption.map(v  => +(v * consumScale).toFixed(2));
    const flowRealLoss     = MOCK.flowRealLoss.map(v     => +(v * realScale).toFixed(2));
    const flowApparentLoss = MOCK.flowApparentLoss.map(v => +(v * appScale).toFixed(2));
    const flowTotal = flowConsumption.map((c, i) =>
      +(c + flowRealLoss[i] + flowApparentLoss[i] + addFlow).toFixed(2));
    const flowCalibrated = flowTotal.map(v => +(v * 0.993).toFixed(2));
    const flowSimulated  = MOCK.flowSimulated.map(v => +(v * srcMult).toFixed(2));

    return {
      ...MOCK,
      flowTotal,
      flowSimulated,
      flowConsumption,
      flowRealLoss,
      flowApparentLoss,
      flowCalibrated
    };
  }

  // ══════════════════════════════════════════════════════
  // LIVE UPDATE — silent, no loading screen (debounced)
  // ══════════════════════════════════════════════════════
  function liveUpdate() {
    try {
      const params = gatherParams();
      const scaledData = buildScaledData(params);
      const analysis = hydraulicEngine.runFullAnalysis(scaledData, params);
      appState.lastAnalysis = analysis;
      appState.currentData  = scaledData;

      charts.updateMainChart(scaledData);
      ui.updateKPIs(analysis.kpis);
      ui.updateVMNDisplay(analysis.vmn);
      ui.updateLastCalc();
    } catch (err) {
      console.warn('[LiveUpdate]', err.message);
    }
  }

  const debouncedLiveUpdate = debounce(liveUpdate, 500);

  // ══════════════════════════════════════════════════════
  // ATTACH LIVE UPDATE LISTENERS
  // ══════════════════════════════════════════════════════
  function initLiveUpdates() {
    // Parameter inputs
    const paramIds = [
      'p_haxPer1','p_haxPer2','p_E1','p_diBloco',
      'p_pEstad1','p_diZona','p_autoPri','p_dias',
      'p_reservoir','additionalFlow'
    ];
    paramIds.forEach(id => {
      document.getElementById(id)?.addEventListener('input', debouncedLiveUpdate);
    });

    // Consumption table — delegate to tbody
    document.getElementById('consumptionBody')?.addEventListener('input', () => {
      // Sync state from DOM before recalculating
      document.querySelectorAll('#consumptionBody tr').forEach(tr => {
        const idMatch = tr.id?.match(/crow-(\d+)/);
        if (!idMatch) return;
        const rowId = +idMatch[1];
        const row = appState.consumptionData.find(r => r.id === rowId);
        if (!row) return;
        const inputs = tr.querySelectorAll('input');
        if (inputs[0]) row.category      = inputs[0].value;
        if (inputs[1]) row.connections   = +inputs[1].value || 0;
        if (inputs[2]) row.avgConsumption= +inputs[2].value || 0;
      });
      ui.updateConsumptionStats();
      debouncedLiveUpdate();
    });

    // Sources list — multiplier changes
    document.getElementById('sourcesList')?.addEventListener('input', debouncedLiveUpdate);
  }

  // ══════════════════════════════════════════════════════
  // FULL ANALYSIS (button "Executar Análise")
  // ══════════════════════════════════════════════════════
  function runAnalysis() {
    ui.showLoading('Executando análise hidráulica...', 2200);
    const params = gatherParams();

    setTimeout(() => {
      try {
        const scaledData = buildScaledData(params);
        const analysis = hydraulicEngine.runFullAnalysis(scaledData, params);
        appState.lastAnalysis = analysis;
        appState.currentData  = scaledData;

        charts.updateMainChart(scaledData);
        charts.initVMNChart(scaledData);
        ui.updateKPIs(analysis.kpis);
        ui.updateVMNDisplay(analysis.vmn);
        ui.updateReservoirTable(analysis.reservoirBalance);
        charts.updateReservoirChart(analysis.reservoirBalance);
        ui.renderInsights(analysis.insights);
        ui.updateLastCalc();

        ui.hideLoading();
        ui.toast(`Análise concluída — Índice de perdas: ${analysis.kpis.lossIndex.toFixed(1)}%`, 'success');
      } catch (err) {
        ui.hideLoading();
        ui.toast('Erro na análise: ' + err.message, 'error');
        console.error('[HydroBalance] runAnalysis:', err);
      }
    }, 2300);
  }

  // ══════════════════════════════════════════════════════
  // CALCULATE BALANCE (panel button)
  // ══════════════════════════════════════════════════════
  function calculateBalance() {
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
        ui.updateLastCalc();

        ui.hideLoading();
        ui.toast('Balanço calculado.', 'success');
      } catch (err) {
        ui.hideLoading();
        ui.toast('Erro: ' + err.message, 'error');
      }
    }, 1000);
  }

  // ══════════════════════════════════════════════════════
  // REFRESH INSIGHTS
  // ══════════════════════════════════════════════════════
  function refreshInsights() {
    const data = appState.currentData || MOCK;
    const insights = hydraulicEngine.generateInsights(data);
    ui.renderInsights(insights);
    ui.toast('Insights atualizados.', 'info', 2000);
  }

  // ══════════════════════════════════════════════════════
  // RECALCULATE FROM SOURCES (CSV import)
  // ══════════════════════════════════════════════════════
  function recalculateFromSources() {
    if (Object.keys(appState.sourceSeries).length === 0) return;
    const combined = Array(24).fill(0);
    let count = 0;
    Object.values(appState.sourceSeries).forEach(series => {
      series.forEach((v, i) => { combined[i] += v; });
      count++;
    });
    const merged = combined.map(v => +(v / Math.max(1, count)).toFixed(3));
    MOCK.flowTotal.splice(0, 24, ...merged);
    ui.toast('Séries de fontes recalculadas.', 'info');
    debouncedLiveUpdate();
  }

  // ══════════════════════════════════════════════════════
  // GATHER PARAMS FROM UI
  // ══════════════════════════════════════════════════════
  function gatherParams() {
    const get = id => +(document.getElementById(id)?.value || 0);
    return {
      n1: 0.5,
      haxPer1: get('p_haxPer1'),
      haxPer2: get('p_haxPer2'),
      E1: get('p_E1'),
      diBloco: get('p_diBloco'),
      pEstad1: get('p_pEstad1'),
      diZona: get('p_diZona'),
      autoPri: get('p_autoPri'),
      dias: get('p_dias'),
      reservoirPct: get('p_reservoir'),
      additionalFlow: get('additionalFlow'),
      connections: appState.consumptionData.reduce((s, r) => s + (r.connections || 0), 0) || 2432,
      reservoirVolume: 500
    };
  }

  // ══════════════════════════════════════════════════════
  // PROJECT SAVE / LOAD
  // ══════════════════════════════════════════════════════
  function saveProject() {
    const projectName = document.getElementById('projectName')?.value || 'Projeto';
    const project = {
      version: '2.1', projectName,
      savedAt: new Date().toISOString(),
      consumptionData: appState.consumptionData,
      sources: appState.sources,
      pressurePoints: appState.pressurePoints,
      params: gatherParams()
    };
    localStorage.setItem(`hydrobalance_${projectName.replace(/\s+/g,'_')}`, JSON.stringify(project));
    exportModule.exportJSON();
    ui.toast(`Projeto "${projectName}" salvo.`, 'success');
    appState.projectDirty = false;
  }

  function loadProject() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const result = parser.parseProjectJSON(ev.target.result);
        if (result.error) { ui.toast(result.error, 'error'); return; }
        const data = result.data;
        const nameEl = document.getElementById('projectName');
        if (nameEl && data.projectName) nameEl.value = data.projectName;
        if (data.consumptionData) {
          document.getElementById('consumptionBody').innerHTML = '';
          appState.consumptionData = [];
          data.consumptionData.forEach(row => {
            appState.consumptionData.push(row);
            ui.renderConsumptionRow(row);
          });
          ui.updateConsumptionStats();
        }
        ui.toast(`Projeto "${data.projectName || 'importado'}" carregado.`, 'success');
        runAnalysis();
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ══════════════════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════════════════
  function init() {
    ui.init();

    const params = gatherParams();
    const initialData = buildScaledData(params);
    appState.currentData = initialData;

    const analysis = hydraulicEngine.runFullAnalysis(initialData, { n1: 0.5, connections: 2432, reservoirVolume: 500 });
    appState.lastAnalysis = analysis;

    charts.initAll(initialData, analysis.reservoirBalance);
    ui.updateKPIs(analysis.kpis);
    ui.updateVMNDisplay(analysis.vmn);
    ui.updateReservoirTable(analysis.reservoirBalance);
    ui.renderInsights(analysis.insights);

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Restore autosave name
    try {
      const saved = localStorage.getItem('hydrobalance_autosave');
      if (saved) {
        const proj = JSON.parse(saved);
        if (proj.projectName) {
          const el = document.getElementById('projectName');
          if (el) el.value = proj.projectName;
        }
      }
    } catch (_) {}

    // Live update listeners (after UI is populated)
    setTimeout(initLiveUpdates, 300);

    // Auto-save every 2 min
    setInterval(() => {
      if (appState.projectDirty) {
        try {
          localStorage.setItem('hydrobalance_autosave', JSON.stringify({
            version: '2.1',
            projectName: document.getElementById('projectName')?.value || 'Projeto',
            savedAt: new Date().toISOString(),
            consumptionData: appState.consumptionData,
            sources: appState.sources
          }));
        } catch (_) {}
        appState.projectDirty = false;
      }
    }, 120000);

    document.addEventListener('change', () => { appState.projectDirty = true; });

    ui.toast('HydroBalance AI iniciado. Altere qualquer campo para atualização automática.', 'info', 5000);
  }

  return {
    init,
    runAnalysis,
    calculateBalance,
    refreshInsights,
    recalculateFromSources,
    saveProject,
    loadProject,
    gatherParams,
    buildScaledData,
    liveUpdate
  };
})();

// ── Bootstrap ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  app.init();

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); app.runAnalysis(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's')     { e.preventDefault(); app.saveProject(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'e')     { e.preventDefault(); exportModule.exportCSV('all'); }
    if (e.key === 'Escape') ui.closeModal();
  });

  console.log('%c HydroBalance AI v2.1 ', 'background:#00838f;color:white;font-size:14px;padding:4px 10px;border-radius:4px');
  console.log('%c Ctrl+Enter: Executar | Ctrl+S: Salvar | Ctrl+E: Exportar', 'color:#00bcd4;font-size:11px');
});
