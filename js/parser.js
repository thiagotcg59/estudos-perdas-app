/* ═══════════════════════════════════════════════════════
   HydroBalance AI — Parser Module
   CSV / JSON import & validation
════════════════════════════════════════════════════════ */
const parser = (() => {

  // ── Generic CSV Parser ────────────────────────────────
  function parseCSV(text, delimiter = null) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return null;

    // Auto-detect delimiter
    const firstLine = lines[0];
    if (!delimiter) {
      delimiter = firstLine.includes(';') ? ';' : ',';
    }

    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = splitCSVLine(line, delimiter);
      if (values.length < headers.length) continue;

      const row = {};
      headers.forEach((h, idx) => {
        const val = (values[idx] || '').trim().replace(/"/g, '');
        const num = parseFloat(val.replace(',', '.'));
        row[h] = isNaN(num) ? val : num;
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  function splitCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // ── Consumption CSV ───────────────────────────────────
  function parseConsumptionCSV(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseCSV(e.target.result);
        if (!parsed) { ui.toast('Arquivo CSV inválido ou vazio.', 'error'); return; }

        const { rows } = parsed;
        if (rows.length === 0) { ui.toast('Nenhum dado encontrado no CSV.', 'warn'); return; }

        // Clear existing rows
        const tbody = document.getElementById('consumptionBody');
        tbody.innerHTML = '';
        appState.consumptionData = [];

        rows.forEach((row, i) => {
          const mapped = {
            id: Date.now() + i,
            category: row['categoria'] || row['category'] || row['tipo'] || `Categoria ${i+1}`,
            connections: parseInt(row['ligacoes'] || row['connections'] || row['lig'] || 0),
            avgConsumption: parseFloat(row['consumo'] || row['consumption'] || row['cons_med'] || 0)
          };
          appState.consumptionData.push(mapped);
          ui.renderConsumptionRow(mapped);
        });

        ui.updateConsumptionStats();
        ui.toast(`${rows.length} categorias importadas com sucesso.`, 'success');
      } catch (err) {
        ui.toast('Erro ao processar CSV: ' + err.message, 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
    inputEl.value = '';
  }

  // ── Flow Series CSV ───────────────────────────────────
  function parseFlowCSV(text) {
    const parsed = parseCSV(text);
    if (!parsed) return null;

    const { headers, rows } = parsed;

    // Try to find flow column
    const flowCols = ['vazao', 'flow', 'q', 'vazão', 'caudal', 'ls', 'l/s', 'lps'];
    const timeCols = ['hora', 'time', 'timestamp', 'dt', 'datetime'];

    const flowCol = headers.find(h => flowCols.some(fc => h.includes(fc)));
    const timeCol = headers.find(h => timeCols.some(tc => h.includes(tc)));

    if (!flowCol) {
      return { error: 'Coluna de vazão não identificada. Esperado: vazao, flow, Q, m3h' };
    }

    const series = rows.map(r => ({
      time: r[timeCol] || null,
      flow: r[flowCol] || 0
    }));

    return { series, flowCol, timeCol };
  }

  // ── Pressure CSV ──────────────────────────────────────
  function parsePressureCSV(text) {
    const parsed = parseCSV(text);
    if (!parsed) return null;

    const { headers, rows } = parsed;
    const pressureCols = ['pressao', 'pressure', 'p', 'mca', 'psi', 'bar'];
    const pressureHeaders = headers.filter(h => pressureCols.some(pc => h.includes(pc)));

    return {
      headers: pressureHeaders,
      rows: rows.map(r => {
        const out = {};
        pressureHeaders.forEach(h => { out[h] = r[h] || 0; });
        return out;
      })
    };
  }

  // ── Detect Hourly Aggregation ─────────────────────────
  function aggregateToHourly(series) {
    const hourly = Array(24).fill(0);
    const counts = Array(24).fill(0);

    series.forEach(({ time, flow }) => {
      if (!time) return;
      let hour = null;

      // Try parsing various time formats
      if (typeof time === 'number' && time >= 0 && time <= 23) {
        hour = time;
      } else if (typeof time === 'string') {
        const m = time.match(/(\d{1,2})[:\-h]/);
        if (m) hour = parseInt(m[1]);
      }

      if (hour !== null && hour >= 0 && hour <= 23) {
        hourly[hour] += flow;
        counts[hour]++;
      }
    });

    // Average where we have data
    return hourly.map((sum, i) => counts[i] > 0 ? +(sum / counts[i]).toFixed(3) : 0);
  }

  // ── Validate Hydraulic Series ─────────────────────────
  function validateSeries(series, name = 'Série') {
    const errors = [];
    const warnings = [];

    if (!series || series.length === 0) {
      errors.push(`${name}: Sem dados.`);
      return { valid: false, errors, warnings };
    }

    const zeros = series.filter(v => v === 0).length;
    if (zeros > 6) warnings.push(`${name}: ${zeros} horários com valor zero.`);

    const negatives = series.filter(v => v < 0).length;
    if (negatives > 0) errors.push(`${name}: ${negatives} valores negativos encontrados.`);

    const max = Math.max(...series);
    const mean = series.reduce((a,b)=>a+b,0) / series.length;
    if (max > mean * 5) warnings.push(`${name}: Possível outlier detectado (${max.toFixed(1)} vs média ${mean.toFixed(1)}).`);

    return { valid: errors.length === 0, errors, warnings };
  }

  // ── Source File Handler ───────────────────────────────
  function handleSourceFile(sourceId, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const result = parseFlowCSV(e.target.result);
      if (!result || result.error) {
        ui.toast(result?.error || 'Erro ao processar arquivo de fonte.', 'error');
        return;
      }

      const hourly = aggregateToHourly(result.series);
      const validation = validateSeries(hourly, `Fonte #${sourceId}`);

      validation.errors.forEach(err => ui.toast(err, 'error'));
      validation.warnings.forEach(w => ui.toast(w, 'warning'));

      if (validation.valid || validation.errors.length === 0) {
        appState.sourceSeries[sourceId] = hourly;
        ui.toast(`Fonte #${sourceId}: ${result.series.length} leituras importadas.`, 'success');
        app.recalculateFromSources();
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  // ── JSON Project Import ───────────────────────────────
  function parseProjectJSON(text) {
    try {
      const data = JSON.parse(text);
      const required = ['projectName', 'consumptionData', 'sources', 'parameters'];
      const missing = required.filter(k => !(k in data));
      if (missing.length > 0) {
        return { error: `Campos obrigatórios ausentes: ${missing.join(', ')}` };
      }
      return { data };
    } catch (e) {
      return { error: 'JSON inválido: ' + e.message };
    }
  }

  return {
    parseCSV,
    parseConsumptionCSV,
    parseFlowCSV,
    parsePressureCSV,
    aggregateToHourly,
    validateSeries,
    handleSourceFile,
    parseProjectJSON
  };
})();
