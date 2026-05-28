/* ═══════════════════════════════════════════════════════
   HydroBalance AI — Main App Controller
   Orchestrates UI, Engine, Charts, Persistence
════════════════════════════════════════════════════════ */

// ── Global State ──────────────────────────────────────
const appState = {
  sources: [],
  pressurePoints: [],
  consumptionData: [],
  sourceSeries: {},
  lastAnalysis: null,
  activeTab: 'd1',
  projectDirty: false
};

// ── App Controller ────────────────────────────────────
const app = (() => {

  // ══════════════════════════════════════════════════════
  // INITIALIZATION
  // ══════════════════════════════════════════════════════
  function init() {
    // Initialize UI components
    ui.init();

    // Initialize charts with mock data
    const analysis = hydraulicEngine.runFullAnalysis(MOCK, {
      n1: 0.5,
      connections: 2432,
      reservoirVolume: 500
    });
    appState.lastAnalysis = analysis;

    charts.initAll(MOCK, analysis.reservoirBalance);
    ui.updateKPIs(analysis.kpis);
    ui.updateVMNDisplay(analysis.vmn);
    ui.updateReservoirTable(analysis.reservoirBalance);
    ui.renderInsights(analysis.insights);

    // Init Lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Load saved project from localStorage if exists
    const saved = localStorage.getItem('hydrobalance_autosave');
    if (saved) {
      try {
        const proj = JSON.parse(saved);
        if (proj.projectName) {
          const nameEl = document.getElementById('projectName');
          if (nameEl) nameEl.value = proj.projectName;
        }
      } catch (_) {}
    }

    // Auto-save every 2 minutes
    setInterval(() => {
      if (appState.projectDirty) {
        autoSave();
        appState.projectDirty = false;
      }
    }, 120000);

    // Mark dirty on any input change
    document.addEventListener('change', () => { appState.projectDirty = true; });

    ui.toast('HydroBalance AI iniciado com dados de demonstração.', 'info', 4000);
    console.log('[HydroBalance AI] Initialized. Analysis result:', analysis);
  }

  // ══════════════════════════════════════════════════════
  // MAIN ANALYSIS
  // ══════════════════════════════════════════════════════
  function runAnalysis() {
    const loadingId = ui.showLoading('Executando análise hidráulica...', 2200);

    // Gather parameters from UI
    const params = gatherParams();

    setTimeout(() => {
      try {
        const analysis = hydraulicEngine.runFullAnalysis(MOCK, params);
        appState.lastAnalysis = analysis;

        // Update all UI components
        charts.updateMainChart(MOCK);
        ui.updateKPIs(analysis.kpis);
        ui.updateVMNDisplay(analysis.vmn);
        ui.updateReservoirTable(analysis.reservoirBalance);
        charts.updateReservoirChart(analysis.reservoirBalance);
        ui.renderInsights(analysis.insights);
        ui.updateLastCalc();

        ui.hideLoading();
        ui.toast(`Análise concluída. Índice de perdas: ${analysis.kpis.lossIndex.toFixed(1)}%`, 'success');
      } catch (err) {
        ui.hideLoading();
        ui.toast('Erro na análise: ' + err.message, 'error');
        console.error('[HydroBalance] Analysis error:', err);
      }
    }, 2300);
  }

  // ══════════════════════════════════════════════════════
  // BALANCE CALCULATION (from left panel button)
  // ══════════════════════════════════════════════════════
  function calculateBalance() {
    const params = gatherParams();
    ui.showLoading('Calculando balanço...', 1000);

    setTimeout(() => {
      try {
        const analysis = hydraulicEngine.runFullAnalysis(MOCK, params);
        appState.lastAnalysis = analysis;
        ui.updateKPIs(analysis.kpis);
        ui.updateVMNDisplay(analysis.vmn);
        ui.updateLastCalc();
        ui.hideLoading();
        ui.toast('Balanço calculado.', 'success');
      } catch (err) {
        ui.hideLoading();
        ui.toast('Erro no cálculo: ' + err.message, 'error');
      }
    }, 1100);
  }

  // ══════════════════════════════════════════════════════
  // REFRESH INSIGHTS
  // ══════════════════════════════════════════════════════
  function refreshInsights() {
    const data = MOCK;
    const insights = hydraulicEngine.generateInsights(data);
    ui.renderInsights(insights);
    ui.toast('Insights atualizados.', 'info', 2000);
  }

  // ══════════════════════════════════════════════════════
  // RECALCULATE FROM SOURCES (when source CSV imported)
  // ══════════════════════════════════════════════════════
  function recalculateFromSources() {
    if (Object.keys(appState.sourceSeries).length === 0) return;

    // Merge all source series
    const combined = Array(24).fill(0);
    let count = 0;
    Object.values(appState.sourceSeries).forEach(series => {
      series.forEach((v, i) => { combined[i] += v; });
      count++;
    });

    const additionalFlow = +(document.getElementById('additionalFlow')?.value || 0);
    const additionalLS = additionalFlow / 3.6; // m³/h → L/s

    const merged = combined.map(v => +(v / Math.max(1, count) + additionalLS).toFixed(3));

    // Update MOCK data (in-memory) with new series
    MOCK.flowTotal.splice(0, 24, ...merged);

    ui.toast('Séries de fontes recalculadas.', 'info');
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
      version: '2.1',
      projectName,
      savedAt: new Date().toISOString(),
      consumptionData: appState.consumptionData,
      sources: appState.sources,
      pressurePoints: appState.pressurePoints,
      params: gatherParams()
    };

    // Save to localStorage
    const key = `hydrobalance_${projectName.replace(/\s+/g, '_')}`;
    localStorage.setItem(key, JSON.stringify(project));
    localStorage.setItem('hydrobalance_lastProject', key);

    // Also trigger JSON download
    exportModule.exportJSON();
    ui.toast(`Projeto "${projectName}" salvo.`, 'success');
    appState.projectDirty = false;
  }

  function loadProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const result = parser.parseProjectJSON(ev.target.result);
        if (result.error) { ui.toast(result.error, 'error'); return; }

        const data = result.data;

        // Restore project name
        const nameEl = document.getElementById('projectName');
        if (nameEl && data.projectName) nameEl.value = data.projectName;

        // Restore consumption data
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

  function autoSave() {
    try {
      const project = {
        version: '2.1',
        projectName: document.getElementById('projectName')?.value || 'Projeto',
        savedAt: new Date().toISOString(),
        consumptionData: appState.consumptionData,
        sources: appState.sources,
        pressurePoints: appState.pressurePoints
      };
      localStorage.setItem('hydrobalance_autosave', JSON.stringify(project));
    } catch (_) {}
  }

  // ══════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS
  // ══════════════════════════════════════════════════════
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            runAnalysis();
            break;
          case 's':
            e.preventDefault();
            saveProject();
            break;
          case 'e':
            e.preventDefault();
            exportModule.exportCSV('all');
            break;
        }
      }
      if (e.key === 'Escape') {
        ui.closeModal();
      }
    });
  }

  return {
    init,
    runAnalysis,
    calculateBalance,
    refreshInsights,
    recalculateFromSources,
    saveProject,
    loadProject,
    gatherParams
  };
})();

// ── Bootstrap ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  app.init();
  app.initKeyboardShortcuts?.();
  console.log('%c HydroBalance AI v2.1 ', 'background:#00838f;color:white;font-size:14px;padding:4px 10px;border-radius:4px');
  console.log('%c Ctrl+Enter: Executar | Ctrl+S: Salvar | Ctrl+E: Exportar CSV', 'color:#00bcd4;font-size:11px');
});

// Make initKeyboardShortcuts accessible
app.initKeyboardShortcuts = function() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); app.runAnalysis(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); app.saveProject(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); exportModule.exportCSV('all'); }
    if (e.key === 'Escape') ui.closeModal();
  });
};
