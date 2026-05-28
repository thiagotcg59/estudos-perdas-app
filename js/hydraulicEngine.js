/* ═══════════════════════════════════════════════════════
   HydroBalance AI — Hydraulic Engine
   IWA Water Balance + FAVAD Methodology
════════════════════════════════════════════════════════ */
const hydraulicEngine = (() => {

  // ── IWA Water Balance ─────────────────────────────────
  function calcIWABalance(params) {
    const {
      systemInput,       // m³/day  — total distributed
      billedConsumption, // m³/day  — metered + authorized
      apparentLossRate,  // fraction (e.g. 0.05)
      realLossBase,      // L/s     — base real loss (from VMN)
      n1,                // FAVAD exponent
      avgPressure,       // mca     — average zone pressure
      refPressure        // mca     — reference pressure for N1
    } = params;

    const authorizedConsumption = billedConsumption;
    const apparentLosses = systemInput * apparentLossRate;
    const waterLosses = systemInput - authorizedConsumption;
    const realLosses = waterLosses - apparentLosses;
    const lossIndex = (waterLosses / systemInput) * 100;
    const ili = realLosses / calcUARL(params);  // Infrastructure Leakage Index

    return {
      systemInput,
      authorizedConsumption,
      waterLosses,
      apparentLosses,
      realLosses,
      lossIndex: Math.max(0, lossIndex),
      ili: Math.max(0, ili)
    };
  }

  // Unavoidable Annual Real Losses (UARL) — IWA formula
  function calcUARL({ connections, serviceLength, pressureAvg }) {
    // UARL (L/day) = (18 × Lm + 0.8 × Nc + 25 × Lp) × P
    const Lm = serviceLength || 120;   // km mains
    const Nc = connections || 2432;
    const Lp = Nc * 0.015;             // km service connections
    const P = pressureAvg || 30;       // mca
    return ((18 * Lm + 0.8 * Nc + 25 * Lp) * P) / 1000; // → m³/day
  }

  // ── FAVAD: Pressure–Leakage Relationship ─────────────
  function calcLeakageAtPressure(q0, p0, p, n1) {
    // Q = Q0 × (P/P0)^N1
    return q0 * Math.pow(p / p0, n1);
  }

  function pressureLeakageSensitivity(q0, p0, n1, pressureRange) {
    return pressureRange.map(p => ({
      pressure: p,
      leakage: calcLeakageAtPressure(q0, p0, p, n1)
    }));
  }

  // ── VMN — Minimum Night Flow Analysis ────────────────
  function detectVMN(flowSeries) {
    // Search in hours 01:00–04:00 (indexes 1-4)
    const nightWindow = flowSeries.slice(1, 5);
    const vmnValue = Math.min(...nightWindow);
    const vmnIndex = flowSeries.indexOf(vmnValue);
    const vmnHour = vmnIndex;

    // Night consumption estimate (0.6 L/s per 1000 connections typical)
    const nightConsumption = 0.0006 * 2432; // L/s
    const realLossEstimate = Math.max(0, vmnValue - nightConsumption);

    return {
      vmn: vmnValue,
      hour: vmnHour,
      hourLabel: `${String(vmnHour).padStart(2,'0')}:00h`,
      nightConsumption: nightConsumption.toFixed(2),
      realLossEstimate: realLossEstimate.toFixed(2)
    };
  }

  // ── Normalized Hourly Curve ────────────────────────────
  function generateNormalizedCurve(flowSeries) {
    const avg = flowSeries.reduce((a, b) => a + b, 0) / flowSeries.length;
    return {
      avg,
      multipliers: flowSeries.map(f => +(f / avg).toFixed(4)),
      max: Math.max(...flowSeries),
      min: Math.min(...flowSeries),
      peakFactor: +(Math.max(...flowSeries) / avg).toFixed(3)
    };
  }

  // ── Loss Decomposition from Hourly Series ─────────────
  function decomposeLosses(totalFlow, consumptionFlow) {
    return totalFlow.map((q, i) => {
      const totalLoss = Math.max(0, q - consumptionFlow[i]);
      const realLoss = totalLoss * 0.655;        // ~65.5% real
      const apparentLoss = totalLoss * 0.345;    // ~34.5% apparent
      return { total: q, consumption: consumptionFlow[i], totalLoss, realLoss, apparentLoss };
    });
  }

  // ── Statistical Indicators ────────────────────────────
  function calcStatistics(series) {
    const n = series.length;
    const mean = series.reduce((a, b) => a + b, 0) / n;
    const variance = series.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // coefficient of variation
    const max = Math.max(...series);
    const min = Math.min(...series);

    return {
      mean: +mean.toFixed(3),
      stdDev: +stdDev.toFixed(3),
      cv: +cv.toFixed(4),
      max: +max.toFixed(3),
      min: +min.toFixed(3),
      peakFactor: +(max / mean).toFixed(3),
      volume24h: +(mean * 3600 * 24 / 1000).toFixed(1)  // m³
    };
  }

  // ── Reservoir Balance (simple) ─────────────────────────
  function calcReservoirBalance(inflowSeries, demandSeries, usefulVolume, initialLevel) {
    let level = initialLevel * usefulVolume / 100; // m³
    return inflowSeries.map((inflow, i) => {
      const outflow = demandSeries[i];
      const deltaVol = (inflow - outflow) * 3600 / 1000; // m³ per hour
      level = Math.max(0, Math.min(usefulVolume, level + deltaVol));
      return {
        hour: i,
        level: +level.toFixed(1),
        levelPct: +((level / usefulVolume) * 100).toFixed(1),
        inflow: +inflow.toFixed(2),
        outflow: +outflow.toFixed(2)
      };
    });
  }

  // ── Daily Multipliers for EPANET ─────────────────────
  function generateEPANETPatterns(normalizedCurve) {
    const { multipliers } = normalizedCurve;
    return {
      id: 'CONSUMPTION_PATTERN',
      description: 'Padrão de consumo horário gerado por HydroBalance AI',
      multipliers,
      timeStep: 1,         // hours
      type: 'VOLUME'
    };
  }

  // ── Auto Insights ──────────────────────────────────────
  function generateInsights(data) {
    const insights = [];
    const stats = calcStatistics(data.flowTotal);
    const vmn = detectVMN(data.flowTotal);
    const normalized = generateNormalizedCurve(data.flowTotal);

    // Peak factor check
    if (normalized.peakFactor > 2.5) {
      insights.push({
        type: 'warn',
        icon: 'alert-triangle',
        text: `Fator de pico elevado (${normalized.peakFactor}x). Possível subdimensionamento de rede.`
      });
    } else if (normalized.peakFactor < 1.8) {
      insights.push({
        type: 'info',
        icon: 'info',
        text: `Fator de pico baixo (${normalized.peakFactor}x). Perfil característico de área industrial/comercial.`
      });
    }

    // VMN analysis
    const vmnRatio = parseFloat(vmn.realLossEstimate) / parseFloat(vmn.vmn);
    if (vmnRatio > 0.6) {
      insights.push({
        type: 'danger',
        icon: 'alert-octagon',
        text: `Possível excesso de perdas reais detectado entre ${vmn.hourLabel}. VMN: ${vmn.vmn.toFixed(1)} L/s com ${(vmnRatio*100).toFixed(0)}% de perdas estimadas.`
      });
    }

    // Loss index
    const lossIdx = data.waterBalance ? (data.waterBalance.realLosses / data.waterBalance.systemInput) * 100 : 36.5;
    if (lossIdx > 40) {
      insights.push({
        type: 'danger',
        icon: 'trending-up',
        text: `Índice de perdas crítico: ${lossIdx.toFixed(1)}%. Recomenda-se intervenção imediata de redução de pressão.`
      });
    } else if (lossIdx > 25) {
      insights.push({
        type: 'warn',
        icon: 'alert-triangle',
        text: `Perdas reais acima da meta regulatória (${lossIdx.toFixed(1)}%). Avaliar setorização ou PRV.`
      });
    }

    // Pressure check
    const avgPressure = data.pressurePoint1 ?
      data.pressurePoint1.reduce((a,b)=>a+b,0)/data.pressurePoint1.length : 28;
    if (avgPressure > 40) {
      insights.push({
        type: 'warn',
        icon: 'gauge',
        text: `Alta sensibilidade à pressão detectada (média ${avgPressure.toFixed(1)} mca). Redução de 10% na pressão pode diminuir vazamentos em ~${(10*0.5).toFixed(0)}%.`
      });
    }

    // Profile compatibility
    const nightIdx = data.flowTotal.slice(1,4).reduce((a,b)=>a+b,0) / 3;
    const dayIdx = data.flowTotal.slice(8,18).reduce((a,b)=>a+b,0) / 10;
    const nightRatio = nightIdx / dayIdx;
    if (nightRatio > 0.55) {
      insights.push({
        type: 'warn',
        icon: 'moon',
        text: `Perfil noturno elevado (${(nightRatio*100).toFixed(0)}% do diurno). Possível irrigação noturna ou vazamento real acima do esperado.`
      });
    } else {
      insights.push({
        type: 'ok',
        icon: 'check-circle',
        text: `Perfil diário compatível com setor residencial padrão. Coef. variação: ${stats.cv.toFixed(3)}.`
      });
    }

    // Calibration quality
    if (data.flowCalibrated && data.flowTotal) {
      const errors = data.flowTotal.map((v, i) => Math.abs(v - data.flowCalibrated[i]) / v * 100);
      const avgError = errors.reduce((a,b)=>a+b,0) / errors.length;
      if (avgError < 3) {
        insights.push({
          type: 'ok',
          icon: 'target',
          text: `Calibração excelente: erro médio de ${avgError.toFixed(1)}%. Modelo pronto para simulação.`
        });
      } else if (avgError < 8) {
        insights.push({
          type: 'info',
          icon: 'activity',
          text: `Calibração aceitável: erro médio de ${avgError.toFixed(1)}%. Refinar parâmetros N1 e coeficiente de rugosidade.`
        });
      }
    }

    return insights;
  }

  // ── Main Analysis Function ─────────────────────────────
  function runFullAnalysis(inputData, params) {
    const totalStats = calcStatistics(inputData.flowTotal);
    const vmn = detectVMN(inputData.flowTotal);
    const normalized = generateNormalizedCurve(inputData.flowTotal);
    const decomposed = decomposeLosses(inputData.flowTotal, inputData.flowConsumption);

    const totalRealLoss = decomposed.reduce((a, b) => a + b.realLoss, 0) / 24;
    const totalAppLoss = decomposed.reduce((a, b) => a + b.apparentLoss, 0) / 24;
    const totalConsumption = inputData.flowConsumption.reduce((a,b)=>a+b,0) / 24;

    const balanceParams = {
      systemInput: totalStats.volume24h,
      billedConsumption: totalConsumption * 3600 * 24 / 1000,
      apparentLossRate: 0.192,
      realLossBase: totalRealLoss,
      n1: params.n1 || 0.5,
      avgPressure: 30,
      refPressure: 30,
      connections: params.connections || 2432,
      serviceLength: 12.5
    };

    const balance = calcIWABalance(balanceParams);
    const patterns = generateEPANETPatterns(normalized);
    const insights = generateInsights({ ...inputData, waterBalance: balance });
    const reservoirBalance = calcReservoirBalance(
      inputData.reservoirInflow,
      inputData.flowTotal,
      params.reservoirVolume || 500,
      72.5
    );

    return {
      statistics: totalStats,
      vmn,
      normalized,
      balance,
      patterns,
      insights,
      reservoirBalance,
      lossDecomposition: {
        avgRealLoss: +totalRealLoss.toFixed(2),
        avgApparentLoss: +totalAppLoss.toFixed(2),
        avgConsumption: +totalConsumption.toFixed(2),
        avgTotal: +totalStats.mean.toFixed(2)
      },
      kpis: {
        consumption: +totalConsumption.toFixed(2),
        realLoss: +totalRealLoss.toFixed(2),
        apparentLoss: +totalAppLoss.toFixed(2),
        lossIndex: +balance.lossIndex.toFixed(1),
        avgFlow: +totalStats.mean.toFixed(1),
        vmn: +vmn.vmn.toFixed(1),
        peakFactor: +totalStats.peakFactor.toFixed(2),
        volume24h: totalStats.volume24h
      }
    };
  }

  return {
    runFullAnalysis,
    detectVMN,
    generateNormalizedCurve,
    calcIWABalance,
    calcLeakageAtPressure,
    pressureLeakageSensitivity,
    calcStatistics,
    generateInsights,
    generateEPANETPatterns,
    calcReservoirBalance,
    decomposeLosses
  };
})();
