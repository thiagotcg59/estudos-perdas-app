/* ═══════════════════════════════════════════════════════
   HydroBalance AI — Charts Module (Chart.js 4)
════════════════════════════════════════════════════════ */
const charts = (() => {

  const instances = {};

  // ── Shared Chart Defaults ─────────────────────────────
  const DEFAULTS = {
    font: { family: "'Courier New', monospace", size: 11 },
    color: '#6a9bac',
    gridColor: 'rgba(0, 184, 212, 0.08)',
    tickColor: '#2a5060',
    tooltipBg: 'rgba(7, 20, 32, 0.95)',
    tooltipBorder: '#00b8d4'
  };

  function baseOptions(title = '') {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeInOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#6a9bac',
            font: { size: 10, family: "'Courier New', monospace" },
            usePointStyle: true,
            pointStyleWidth: 10,
            padding: 12
          }
        },
        tooltip: {
          backgroundColor: DEFAULTS.tooltipBg,
          borderColor: DEFAULTS.tooltipBorder,
          borderWidth: 1,
          titleColor: '#00e5ff',
          bodyColor: '#c8e8f0',
          padding: 10,
          cornerRadius: 6,
          titleFont: { family: "'Courier New', monospace", size: 11, weight: 'bold' },
          bodyFont: { family: "'Courier New', monospace", size: 11 },
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} L/s`
          }
        },
        zoom: {
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
          pan: { enabled: true, mode: 'x' }
        }
      },
      scales: {
        x: {
          grid: { color: DEFAULTS.gridColor, drawTicks: false },
          ticks: { color: DEFAULTS.color, font: DEFAULTS.font, maxRotation: 45 },
          border: { color: DEFAULTS.tickColor }
        },
        y: {
          grid: { color: DEFAULTS.gridColor, drawTicks: false },
          ticks: { color: DEFAULTS.color, font: DEFAULTS.font },
          border: { color: DEFAULTS.tickColor }
        }
      }
    };
  }

  // ── Color Palette ─────────────────────────────────────
  const COLORS = {
    blue:     { line: '#1e88e5', fill: 'rgba(30, 136, 229, 0.10)' },
    red:      { line: '#ef5350', fill: 'rgba(239, 83, 80, 0.10)' },
    purple:   { line: '#ab47bc', fill: 'rgba(171, 71, 188, 0.10)' },
    orange:   { line: '#ffa726', fill: 'rgba(255, 167, 38, 0.10)' },
    green:    { line: '#26a69a', fill: 'rgba(38, 166, 154, 0.10)' },
    cyan:     { line: '#00bcd4', fill: 'rgba(0, 188, 212, 0.10)' },
    yellow:   { line: '#ffee58', fill: 'rgba(255, 238, 88, 0.10)' }
  };

  function makeDataset(label, data, colorKey, opts = {}) {
    const c = COLORS[colorKey];
    return {
      label,
      data,
      borderColor: c.line,
      backgroundColor: opts.fill ? c.fill : 'transparent',
      borderWidth: opts.borderWidth || 2,
      pointRadius: opts.pointRadius !== undefined ? opts.pointRadius : 3,
      pointHoverRadius: 5,
      pointBackgroundColor: c.line,
      tension: 0.4,
      fill: !!opts.fill,
      ...opts
    };
  }

  // ══════════════════════════════════════════════════════
  // MAIN CHART — Water Balance (24h)
  // ══════════════════════════════════════════════════════
  function initMainChart(data) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;
    if (instances.main) instances.main.destroy();

    const opts = baseOptions('Balanço Hídrico');
    opts.plugins.tooltip.callbacks.label = ctx =>
      ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} L/s`;
    opts.scales.y.title = {
      display: true,
      text: 'Vazão (L/s)',
      color: DEFAULTS.color,
      font: { size: 10 }
    };
    opts.scales.y.min = 0;

    // Add VMN annotation line
    const vmnResult = hydraulicEngine.detectVMN(data.flowTotal);

    instances.main = new Chart(ctx, {
      type: 'line',
      data: {
        labels: MOCK.hours,
        datasets: [
          makeDataset('Medido (Total)', data.flowTotal, 'red', { borderWidth: 2.5, pointRadius: 2 }),
          makeDataset('Simulado', data.flowSimulated, 'blue', { borderDash: [4,3], pointRadius: 0 }),
          makeDataset('Calibrado', data.flowCalibrated, 'green', { borderWidth: 2 }),
          makeDataset('Consumo Efetivo', data.flowConsumption, 'purple', { fill: true }),
          makeDataset('Perdas Reais', data.flowRealLoss, 'orange', { fill: true, pointRadius: 2 })
        ]
      },
      options: opts
    });
  }

  // ══════════════════════════════════════════════════════
  // PRESSURE CHART
  // ══════════════════════════════════════════════════════
  function initPressureChart(data) {
    const ctx = document.getElementById('pressureChart');
    if (!ctx) return;
    if (instances.pressure) instances.pressure.destroy();

    const opts = baseOptions('Pressão');
    opts.plugins.tooltip.callbacks.label = ctx =>
      ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} mca`;
    opts.scales.y.title = {
      display: true,
      text: 'Pressão (mca)',
      color: DEFAULTS.color,
      font: { size: 10 }
    };
    opts.scales.y.min = 0;

    // Operational range band
    const operationalMin = Array(24).fill(15);
    const operationalMax = Array(24).fill(45);

    instances.pressure = new Chart(ctx, {
      type: 'line',
      data: {
        labels: MOCK.hours,
        datasets: [
          makeDataset('P01 - Setor Norte', data.pressurePoint1, 'cyan', { borderWidth: 2 }),
          makeDataset('P02 - Zona Alta', data.pressurePoint2, 'blue', { borderDash: [6,2] }),
          makeDataset('Simulado', data.pressureSimulated, 'orange', { pointRadius: 0, borderDash: [2,2] }),
          {
            label: 'Faixa Operacional',
            data: operationalMin,
            borderColor: 'rgba(38,166,154,0.3)',
            backgroundColor: 'rgba(38,166,154,0.05)',
            borderWidth: 1,
            borderDash: [8,4],
            pointRadius: 0,
            fill: '+1',
            tension: 0
          },
          {
            label: '',
            data: operationalMax,
            borderColor: 'rgba(38,166,154,0.3)',
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderDash: [8,4],
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: opts
    });
  }

  // ══════════════════════════════════════════════════════
  // RESERVOIR CHART
  // ══════════════════════════════════════════════════════
  function initReservoirChart(reservoirData) {
    const ctx = document.getElementById('reservoirChart');
    if (!ctx) return;
    if (instances.reservoir) instances.reservoir.destroy();

    const opts = baseOptions('Reservatório');
    delete opts.plugins.zoom;
    opts.plugins.tooltip.callbacks.label = ctx => {
      if (ctx.dataset.label === 'Nível (%)') return ` Nível: ${ctx.parsed.y.toFixed(1)}%`;
      return ` Vazão: ${ctx.parsed.y.toFixed(2)} L/s`;
    };

    const levels = reservoirData.map(r => r.levelPct);
    const inflows = reservoirData.map(r => r.inflow);

    instances.reservoir = new Chart(ctx, {
      type: 'line',
      data: {
        labels: MOCK.hours,
        datasets: [
          {
            label: 'Nível (%)',
            data: levels,
            borderColor: '#26a69a',
            backgroundColor: 'rgba(38,166,154,0.12)',
            borderWidth: 2,
            pointRadius: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Entrada (L/s)',
            data: inflows,
            borderColor: '#1e88e5',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [4,3],
            pointRadius: 0,
            tension: 0,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        ...opts,
        scales: {
          x: opts.scales.x,
          y: {
            ...opts.scales.y,
            position: 'left',
            title: { display: true, text: 'Nível (%)', color: DEFAULTS.color, font: { size: 10 } },
            min: 0, max: 100
          },
          y2: {
            ...opts.scales.y,
            position: 'right',
            title: { display: true, text: 'L/s', color: DEFAULTS.color, font: { size: 10 } },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════
  // VMN CHART
  // ══════════════════════════════════════════════════════
  function initVMNChart(data) {
    const ctx = document.getElementById('vmnChart');
    if (!ctx) return;
    if (instances.vmn) instances.vmn.destroy();

    const vmn = hydraulicEngine.detectVMN(data.flowTotal);
    const vmnIndex = vmn.hour;

    // Color each bar differently for VMN highlight
    const bgColors = MOCK.hours.map((_, i) => {
      if (i === vmnIndex) return 'rgba(255, 82, 82, 0.8)';
      if (i >= 1 && i <= 4) return 'rgba(255, 167, 38, 0.5)';
      return 'rgba(0, 188, 212, 0.3)';
    });
    const borderColors = MOCK.hours.map((_, i) => {
      if (i === vmnIndex) return '#ff5252';
      if (i >= 1 && i <= 4) return '#ffa726';
      return '#00bcd4';
    });

    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: DEFAULTS.tooltipBg,
          borderColor: DEFAULTS.tooltipBorder,
          borderWidth: 1,
          titleColor: '#00e5ff',
          bodyColor: '#c8e8f0',
          callbacks: {
            label: ctx => ` Vazão: ${ctx.parsed.y.toFixed(2)} L/s`
          }
        }
      },
      scales: {
        x: {
          grid: { color: DEFAULTS.gridColor },
          ticks: { color: DEFAULTS.color, font: { size: 9 }, maxRotation: 90 },
          border: { color: DEFAULTS.tickColor }
        },
        y: {
          grid: { color: DEFAULTS.gridColor },
          ticks: { color: DEFAULTS.color, font: { size: 9 } },
          border: { color: DEFAULTS.tickColor },
          min: 0
        }
      }
    };

    instances.vmn = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: MOCK.hours.map(h => h.slice(0,5)),
        datasets: [{
          data: data.flowTotal,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 2
        }]
      },
      options: opts
    });
  }

  // ── Public Methods ────────────────────────────────────
  function initAll(data, reservoirData) {
    initMainChart(data);
    initPressureChart(data);
    initVMNChart(data);
    if (reservoirData) initReservoirChart(reservoirData);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function updateMainChart(data) {
    if (!instances.main) { initMainChart(data); return; }
    instances.main.data.datasets[0].data = data.flowTotal;
    instances.main.data.datasets[1].data = data.flowSimulated;
    instances.main.data.datasets[2].data = data.flowCalibrated;
    instances.main.data.datasets[3].data = data.flowConsumption;
    instances.main.data.datasets[4].data = data.flowRealLoss;
    instances.main.update('active');
  }

  function resetZoom(chartKey) {
    if (instances[chartKey] && instances[chartKey].resetZoom) {
      instances[chartKey].resetZoom();
    }
  }

  function toggleZoom(chartKey) {
    const inst = instances[chartKey];
    if (!inst) return;
    const zoomOpts = inst.options.plugins.zoom;
    if (!zoomOpts) return;
    zoomOpts.zoom.wheel.enabled = !zoomOpts.zoom.wheel.enabled;
    inst.update('none');
  }

  function downloadChart(chartKey) {
    const inst = instances[chartKey];
    if (!inst) return;
    const url = inst.toBase64Image();
    const a = document.createElement('a');
    a.href = url;
    a.download = `hydrobalance_${chartKey}_chart.png`;
    a.click();
  }

  function updateReservoirChart(reservoirData) {
    initReservoirChart(reservoirData);
  }

  return {
    initAll,
    initMainChart,
    initPressureChart,
    initVMNChart,
    initReservoirChart,
    updateMainChart,
    updateReservoirChart,
    resetZoom,
    toggleZoom,
    downloadChart,
    instances
  };
})();
