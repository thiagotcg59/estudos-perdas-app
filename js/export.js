/* ═══════════════════════════════════════════════════════
   HydroBalance AI — Export Module
   CSV, JSON, EPANET INP, Patterns, PDF
════════════════════════════════════════════════════════ */
const exportModule = (() => {

  // ── Download Helper ───────────────────────────────────
  function download(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Formata número para CSV PT-BR: vírgula como decimal, ponto como milhar
  // Necessário pois Excel BR interpreta "1.2000" como 1200 (ponto = milhar)
  const n4 = v => (+v).toFixed(4).replace('.', ',');
  const n3 = v => (+v).toFixed(3).replace('.', ',');
  const n2 = v => (+v).toFixed(2).replace('.', ',');
  const n1 = v => (+v).toFixed(1).replace('.', ',');

  function getTimestamp() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  }

  // ══════════════════════════════════════════════════════
  // CSV EXPORT
  // ══════════════════════════════════════════════════════
  function exportCSV(type = 'all') {
    const ts = getTimestamp();
    const data = appState.lastAnalysis;
    const mockData = MOCK;

    if (type === 'summary') {
      if (!data) { ui.toast('Execute uma análise antes de exportar.', 'warning'); return; }
      const rows = [
        ['Componente', 'Volume_m3_dia', 'Percentual'],
        ['Perda Real', (data.kpis.realLoss * 24).toFixed(1), (data.balance.lossIndex * 0.65).toFixed(1)],
        ['Perda Aparente', (data.kpis.apparentLoss * 24).toFixed(1), (data.balance.lossIndex * 0.35).toFixed(1)],
        ['Total Perdas', ((data.kpis.realLoss + data.kpis.apparentLoss) * 24).toFixed(1), data.balance.lossIndex.toFixed(1)],
        ['Consumo Efetivo', (data.kpis.consumption * 24).toFixed(1), ((data.kpis.consumption / data.kpis.avgFlow) * 100).toFixed(1)],
        ['Entrada Sistema', (data.kpis.avgFlow * 24).toFixed(1), '100.0']
      ];
      download(rows.map(r => r.join(';')).join('\n'), `hydrobalance_resumo_${ts}.csv`, 'text/csv;charset=utf-8;');
      ui.toast('Resumo exportado em CSV.', 'success');
      return;
    }

    // Full 24h series export
    const header = ['Hora', 'Vazao_Total_m3h', 'Vazao_Simulada_m3h', 'Vazao_Calibrada_m3h',
                    'Consumo_Efetivo_m3h', 'Perda_Real_m3h', 'Perda_Aparente_m3h',
                    'Pressao_P01_mca', 'Pressao_P02_mca', 'Nivel_Reserv_pct'].join(';');

    const rows = mockData.hours.map((h, i) => [
      h,
      n3(mockData.flowTotal[i]       || 0),
      n3(mockData.flowSimulated[i]   || 0),
      n3(mockData.flowCalibrated[i]  || 0),
      n3(mockData.flowConsumption[i] || 0),
      n3(mockData.flowRealLoss[i]    || 0),
      n3(mockData.flowApparentLoss[i]|| 0),
      n2(mockData.pressurePoint1[i]  || 0),
      n2(mockData.pressurePoint2[i]  || 0),
      n1(mockData.reservoirLevel[i]  || 0)
    ].join(';'));

    const csvContent = [header, ...rows].join('\n');
    download('﻿' + csvContent, `hydrobalance_series_${ts}.csv`, 'text/csv;charset=utf-8;');
    ui.toast('Série completa exportada em CSV.', 'success');
  }

  // ══════════════════════════════════════════════════════
  // JSON EXPORT
  // ══════════════════════════════════════════════════════
  function exportJSON() {
    const ts = getTimestamp();
    const projectName = document.getElementById('projectName')?.value || 'Projeto';

    const getN = id => +( document.getElementById(id)?.value ?? 0);

    const payload = {
      // projectName no topo — campo obrigatório para loadProject()
      projectName,
      meta: {
        app: 'HydroBalance AI v2.1',
        exportDate: new Date().toISOString(),
        project: projectName,
        dmc: 'Norte-01'
      },
      // Todos os parâmetros da UI — restaurados ao carregar
      parameters: {
        haxPer1:       getN('p_haxPer1'),
        haxPer2:       getN('p_haxPer2'),
        E1:            getN('p_E1'),
        diBloco:       getN('p_diBloco'),
        pEstad1:       getN('p_pEstad1'),
        diZona:        getN('p_diZona'),
        autoPri:       getN('p_autoPri'),
        dias:          getN('p_dias'),
        reservoirPct:  getN('p_reservoir'),
        additionalFlow:getN('additionalFlow')
      },
      consumptionData:    appState.consumptionData,
      sources:            appState.sources,
      pressurePoints:     appState.pressurePoints,
      consumptionPattern: appState.consumptionPattern,   // padrão horário customizado
      measuredSeries:     appState.measuredSeries,        // série medida manual
      analysis: appState.lastAnalysis ? {
        kpis:          appState.lastAnalysis.kpis,
        balance:       appState.lastAnalysis.balance,
        vmn:           appState.lastAnalysis.vmn,
        normalizedCurve: appState.lastAnalysis.normalized
      } : null,
      series: {
        hours:          MOCK.hours,
        flowTotal:      appState.currentData?.flowTotal      || MOCK.flowTotal,
        flowSimulated:  appState.currentData?.flowSimulated  || MOCK.flowSimulated,
        flowCalibrated: appState.currentData?.flowCalibrated || MOCK.flowCalibrated,
        flowConsumption:appState.currentData?.flowConsumption|| MOCK.flowConsumption,
        flowRealLoss:   appState.currentData?.flowRealLoss   || MOCK.flowRealLoss,
        pressurePoint1: MOCK.pressurePoint1,
        pressurePoint2: MOCK.pressurePoint2,
        reservoirLevel: MOCK.reservoirLevel
      }
    };

    download(JSON.stringify(payload, null, 2), `hydrobalance_${ts}.json`, 'application/json');
    ui.toast('Projeto exportado em JSON.', 'success');
  }

  // ══════════════════════════════════════════════════════
  // EPANET INP FORMAT
  // ══════════════════════════════════════════════════════
  function exportINP() {
    const ts = getTimestamp();
    const projectName = document.getElementById('projectName')?.value || 'HydroBalance';

    // Usa o padrão CALIBRADO (gerado pelo modelo pós-calibração)
    // Se não disponível, cai no padrão de consumo declarado pelo usuário
    const data = appState.currentData;
    let multipliers, patternAvg, patternLabel;

    if (data?.calibratedPattern) {
      multipliers  = data.calibratedPattern;
      patternAvg   = data.flowCalibrated
        ? (data.flowCalibrated.reduce((a,b)=>a+b,0)/24).toFixed(3)
        : '—';
      patternLabel = 'Padrão Calibrado (gerado pelo modelo HydroBalance AI)';
    } else {
      const normalized = appState.lastAnalysis?.normalized
        || hydraulicEngine.generateNormalizedCurve(MOCK.flowTotal);
      multipliers  = normalized.multipliers;
      patternAvg   = normalized.avg.toFixed(3);
      patternLabel = 'Padrão normalizado (flowTotal)';
    }

    const simMultipliers = appState.consumptionPattern
      || MOCK.consumptionPatterns.residential;

    const inpContent = `[TITLE]
 HydroBalance AI — Exportação EPANET
 Projeto: ${projectName}
 Exportado: ${new Date().toLocaleString('pt-BR')}
 ${patternLabel}
 Média Calibrada (m³/h): ${patternAvg}

[JUNCTIONS]
;ID              	Elev        	Demand      	Pattern
;---------------------------------------------------------------------------------------

[RESERVOIRS]
;ID              	Head        	Pattern
;---------------------------------------------------------------------------------------

[TANKS]
;ID              	Elevation   	InitLevel   	MinLevel    	MaxLevel    	Diameter    	MinVol      	VolCurve
;---------------------------------------------------------------------------------------

[PIPES]
;ID              	Node1           	Node2           	Length      	Diameter    	Roughness   	MinorLoss   	Status
;---------------------------------------------------------------------------------------

[PUMPS]
;ID              	Node1           	Node2           	Parameters
;---------------------------------------------------------------------------------------

[VALVES]
;ID              	Node1           	Node2           	Diameter    	Type	Setting     	MinorLoss
;---------------------------------------------------------------------------------------

[PATTERNS]
;ID              	Multipliers
;--- Padrão Simulado (declarado pelo usuário — base do modelo pré-calibração) ---
;Fonte: Padrão de Consumo Horário / Fontes de Vazão
 SIMULADO        \t${simMultipliers.slice(0, 6).map(v => v.toFixed(4)).join('\t')}
 SIMULADO        \t${simMultipliers.slice(6, 12).map(v => v.toFixed(4)).join('\t')}
 SIMULADO        \t${simMultipliers.slice(12, 18).map(v => v.toFixed(4)).join('\t')}
 SIMULADO        \t${simMultipliers.slice(18, 24).map(v => v.toFixed(4)).join('\t')}

;--- Padrão Calibrado (gerado pelo modelo HydroBalance AI pós-calibração) ---
;Média: ${patternAvg} m³/h — USE ESTE para importar no EPANET/WaterGEMS
 CALIBRADO       \t${multipliers.slice(0, 6).map(v => v.toFixed(4)).join('\t')}
 CALIBRADO       \t${multipliers.slice(6, 12).map(v => v.toFixed(4)).join('\t')}
 CALIBRADO       \t${multipliers.slice(12, 18).map(v => v.toFixed(4)).join('\t')}
 CALIBRADO       \t${multipliers.slice(18, 24).map(v => v.toFixed(4)).join('\t')}

;--- Padrão de Perdas Reais ---
 PERDAS_REAIS    \t${(data?.flowRealLoss ? hydraulicEngine.generateNormalizedCurve(data.flowRealLoss) : hydraulicEngine.generateNormalizedCurve(MOCK.flowRealLoss)).multipliers.slice(0,6).map(v=>v.toFixed(4)).join('\t')}
 PERDAS_REAIS    \t${(data?.flowRealLoss ? hydraulicEngine.generateNormalizedCurve(data.flowRealLoss) : hydraulicEngine.generateNormalizedCurve(MOCK.flowRealLoss)).multipliers.slice(6,12).map(v=>v.toFixed(4)).join('\t')}
 PERDAS_REAIS    \t${(data?.flowRealLoss ? hydraulicEngine.generateNormalizedCurve(data.flowRealLoss) : hydraulicEngine.generateNormalizedCurve(MOCK.flowRealLoss)).multipliers.slice(12,18).map(v=>v.toFixed(4)).join('\t')}
 PERDAS_REAIS    \t${(data?.flowRealLoss ? hydraulicEngine.generateNormalizedCurve(data.flowRealLoss) : hydraulicEngine.generateNormalizedCurve(MOCK.flowRealLoss)).multipliers.slice(18,24).map(v=>v.toFixed(4)).join('\t')}

[CURVES]
;ID              	X-Value     	Y-Value
;---------------------------------------------------------------------------------------

[CONTROLS]

[RULES]

[ENERGY]
 Global Efficiency  	75
 Global Price  	0
 Demand Charge  	0

[EMITTERS]
;Junction        	Coefficient
;---------------------------------------------------------------------------------------

[QUALITY]
;Node            	InitQual
;---------------------------------------------------------------------------------------

[SOURCES]
;Node            	Type        	Quality     	Pattern
;---------------------------------------------------------------------------------------

[REACTIONS]
;Type     	Pipe/Tank       	Coefficient
;---------------------------------------------------------------------------------------
 Order Bulk  	1
 Order Tank  	1
 Order Wall  	1
 Global Bulk  	0
 Global Wall  	0
 Limiting Potential  	0
 Roughness Correlation  	0

[MIXING]
;Tank            	Model
;---------------------------------------------------------------------------------------

[TIMES]
 Duration  	24:00
 Hydraulic Timestep  	1:00
 Quality Timestep  	0:05
 Pattern Timestep  	1:00
 Pattern Start  	0:00
 Report Timestep  	1:00
 Report Start  	0:00
 Start ClockTime  	0:00 AM
 Statistic  	NONE

[REPORT]
 Status  	Yes
 Summary  	Yes
 Page  	55

[OPTIONS]
 Units  	LPS
 Headloss  	H-W
 Specific Gravity  	1
 Viscosity  	1
 Trials  	40
 Accuracy  	0.001
 CHECKFREQ  	2
 MAXCHECK  	10
 DAMPLIMIT  	0
 Unbalanced  	Continue 10
 Pattern  	CONSUMO_PADRAO
 Demand Multiplier  	${normalized.avg.toFixed(4)}
 Emitter Exponent  	0.5
 Quality  	None
 Diffusivity  	1
 Tolerance  	0.01

[END]
`;

    download(inpContent, `hydrobalance_epanet_${ts}.inp`, 'text/plain;charset=utf-8;');
    ui.toast('Arquivo EPANET (.inp) exportado.', 'success');
  }

  // ══════════════════════════════════════════════════════
  // PATTERNS TABLE (WaterGEMS / EPANET)
  // ══════════════════════════════════════════════════════
  function exportPatterns() {
    const ts = getTimestamp();
    const data = appState.currentData;

    // Padrão simulado (declarado pelo usuário)
    const simPattern = appState.consumptionPattern || MOCK.consumptionPatterns.residential;

    // Padrão calibrado (gerado pelo modelo — principal saída para EPANET)
    const calibPattern = data?.calibratedPattern
      || hydraulicEngine.generateNormalizedCurve(MOCK.flowTotal).multipliers;

    // Perdas reais normalizadas
    const lossNorm = hydraulicEngine.generateNormalizedCurve(
      data?.flowRealLoss || MOCK.flowRealLoss
    );

    const calibAvgFlow = data?.flowCalibrated
      ? (data.flowCalibrated.reduce((a,b)=>a+b,0)/24).toFixed(3) : '—';

    const lines = [
      '# HydroBalance AI — Tabela de Multiplicadores',
      `# Projeto: ${document.getElementById('projectName')?.value || 'Projeto'}`,
      `# Exportado: ${new Date().toLocaleString('pt-BR')}`,
      `# Média calibrada (m³/h): ${calibAvgFlow}`,
      '# ATENÇÃO: Use a coluna Mult_Calibrado para importar no EPANET/WaterGEMS',
      '',
      'Hora;Hora_Decimal;Mult_Simulado;Mult_Calibrado;Mult_Perdas;Vazao_Medida_m3h;Consumo_m3h;Perda_Real_m3h',
      ...MOCK.hours.map((h, i) => [
        h,
        n1(i),
        n4(simPattern[i] || 1),
        n4(calibPattern[i]),
        n4(lossNorm.multipliers[i]),
        n3(data?.flowTotal[i]       ?? MOCK.flowTotal[i]),
        n3(data?.flowConsumption[i] ?? MOCK.flowConsumption[i]),
        n3(data?.flowRealLoss[i]    ?? MOCK.flowRealLoss[i])
      ].join(';'))
    ];

    download('﻿' + lines.join('\n'), `hydrobalance_patterns_${ts}.csv`, 'text/csv;charset=utf-8;');
    ui.toast('Tabela de patterns exportada.', 'success');
  }

  // ══════════════════════════════════════════════════════
  // PDF REPORT (print-based)
  // ══════════════════════════════════════════════════════
  function exportPDF() {
    const projectName = document.getElementById('projectName')?.value || 'Projeto';
    const analysis = appState.lastAnalysis;
    const now = new Date().toLocaleString('pt-BR');

    const kpis = analysis ? analysis.kpis : {
      consumption: 6.02, realLoss: 3.99, apparentLoss: 10.59,
      lossIndex: 51.1, avgFlow: 18.4, vmn: 4.2, peakFactor: 1.48, volume24h: 1897
    };

    const vmn = analysis ? analysis.vmn : hydraulicEngine.detectVMN(MOCK.flowTotal);
    const norm = analysis ? analysis.normalized : hydraulicEngine.generateNormalizedCurve(MOCK.flowTotal);

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8">
<title>Relatório HydroBalance AI</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; margin: 40px; color: #1a2332; font-size: 13px; }
  h1 { color: #00838f; border-bottom: 3px solid #00bcd4; padding-bottom: 8px; font-size: 22px; }
  h2 { color: #005f6b; margin: 24px 0 10px; font-size: 16px; border-left: 4px solid #00bcd4; padding-left: 10px; }
  .meta { color: #607d8b; font-size: 12px; margin-bottom: 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .kpi { background: #e8f5e9; border: 1px solid #00bcd4; border-radius: 8px; padding: 14px; text-align: center; }
  .kpi-label { font-size: 10px; color: #607d8b; text-transform: uppercase; letter-spacing: .5px; }
  .kpi-value { font-size: 28px; font-weight: 700; color: #00838f; margin: 4px 0; font-family: monospace; }
  .kpi-unit { font-size: 10px; color: #90a4ae; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: #00838f; color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
  td { padding: 6px 10px; border-bottom: 1px solid #e0f7fa; font-size: 12px; }
  tr:nth-child(even) td { background: #f5fffe; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e0e0e0; color: #90a4ae; font-size: 10px; text-align: center; }
  .insight { padding: 8px 12px; margin: 6px 0; border-radius: 4px; font-size: 11px; }
  .insight.warn { background: #fff8e1; border-left: 4px solid #ffa000; }
  .insight.danger { background: #ffebee; border-left: 4px solid #f44336; }
  .insight.ok { background: #e8f5e9; border-left: 4px solid #4caf50; }
  .insight.info { background: #e3f2fd; border-left: 4px solid #1e88e5; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>HydroBalance AI — Relatório de Calibração Hidráulica</h1>
<div class="meta">
  <strong>Projeto:</strong> ${projectName} &nbsp;|&nbsp;
  <strong>DMC:</strong> Norte-01 &nbsp;|&nbsp;
  <strong>Gerado em:</strong> ${now}
</div>

<h2>Indicadores Principais</h2>
<div class="kpi-grid">
  <div class="kpi">
    <div class="kpi-label">Consumo Efetivo</div>
    <div class="kpi-value">${kpis.consumption.toFixed(2)}</div>
    <div class="kpi-unit">m³/h</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Perdas Reais</div>
    <div class="kpi-value">${kpis.realLoss.toFixed(2)}</div>
    <div class="kpi-unit">m³/h</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Perdas Aparentes</div>
    <div class="kpi-value">${kpis.apparentLoss.toFixed(2)}</div>
    <div class="kpi-unit">m³/h</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Índice de Perdas</div>
    <div class="kpi-value">${kpis.lossIndex.toFixed(1)}%</div>
    <div class="kpi-unit">%</div>
  </div>
</div>

<h2>Balanço Hídrico IWA</h2>
<table>
  <thead><tr><th>Componente</th><th>Volume (m³/dia)</th><th>m³/h médio</th><th>%</th></tr></thead>
  <tbody>
    <tr><td>Volume Distribuído (Entrada)</td><td>${kpis.volume24h.toFixed(0)}</td><td>${kpis.avgFlow.toFixed(2)}</td><td>100%</td></tr>
    <tr><td>Consumo Autorizado Faturado</td><td>${(kpis.consumption*86.4).toFixed(0)}</td><td>${kpis.consumption.toFixed(2)}</td><td>${(kpis.consumption/kpis.avgFlow*100).toFixed(1)}%</td></tr>
    <tr><td>Perdas Reais</td><td>${(kpis.realLoss*86.4).toFixed(0)}</td><td>${kpis.realLoss.toFixed(2)}</td><td>${(kpis.realLoss/kpis.avgFlow*100).toFixed(1)}%</td></tr>
    <tr><td>Perdas Aparentes</td><td>${(kpis.apparentLoss*86.4).toFixed(0)}</td><td>${kpis.apparentLoss.toFixed(2)}</td><td>${(kpis.apparentLoss/kpis.avgFlow*100).toFixed(1)}%</td></tr>
  </tbody>
</table>

<h2>Análise de Vazão Mínima Noturna (VMN)</h2>
<table>
  <thead><tr><th>Parâmetro</th><th>Valor</th></tr></thead>
  <tbody>
    <tr><td>VMN Detectada</td><td>${vmn.vmn.toFixed(2)} m³/h</td></tr>
    <tr><td>Horário Crítico</td><td>${vmn.hourLabel}</td></tr>
    <tr><td>Consumo Noturno Estimado</td><td>${vmn.nightConsumption} m³/h</td></tr>
    <tr><td>Perdas Reais Estimadas (VMN)</td><td>${vmn.realLossEstimate} m³/h</td></tr>
  </tbody>
</table>

<h2>Curva Normalizada (Multiplicadores EPANET)</h2>
<table>
  <thead>
    <tr>${MOCK.hours.slice(0,12).map(h=>`<th>${h}</th>`).join('')}</tr>
  </thead>
  <tbody>
    <tr>${norm.multipliers.slice(0,12).map(v=>`<td>${v.toFixed(3)}</td>`).join('')}</tr>
  </tbody>
</table>
<table>
  <thead>
    <tr>${MOCK.hours.slice(12,24).map(h=>`<th>${h}</th>`).join('')}</tr>
  </thead>
  <tbody>
    <tr>${norm.multipliers.slice(12,24).map(v=>`<td>${v.toFixed(3)}</td>`).join('')}</tr>
  </tbody>
</table>

<h2>Insights Automáticos</h2>
${(analysis?.insights || hydraulicEngine.generateInsights(MOCK)).map(ins =>
  `<div class="insight ${ins.type}">▶ ${ins.text}</div>`
).join('')}

<div class="footer">
  Gerado automaticamente por HydroBalance AI v2.1 &nbsp;|&nbsp;
  Metodologia: IWA Water Balance + FAVAD (N1=${0.5}) &nbsp;|&nbsp;
  ${now}
</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) { ui.toast('Popup bloqueado. Permita popups para gerar o PDF.', 'warning'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
    ui.toast('Relatório PDF aberto para impressão.', 'success');
  }

  return {
    exportCSV,
    exportJSON,
    exportINP,
    exportPatterns,
    exportPDF
  };
})();
