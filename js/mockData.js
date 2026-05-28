/* ═══════════════════════════════════
   HydroBalance AI — Mock Data
   Unidade de vazão: m³/h
══════════════════════════════════ */
const MOCK = {

  // 24h hourly labels
  hours: ['00:00','01:00','02:00','03:00','04:00','05:00',
          '06:00','07:00','08:00','09:00','10:00','11:00',
          '12:00','13:00','14:00','15:00','16:00','17:00',
          '18:00','19:00','20:00','21:00','22:00','23:00'],

  // Total system flow (m³/h) — macro meter
  flowTotal: [
    51.12, 46.08, 41.04, 39.24, 40.32, 48.60,
    66.96, 95.04, 112.32, 107.28, 99.00, 93.96,
    102.24, 97.20, 92.88, 94.32, 100.08, 109.44,
    120.60, 118.08, 102.96, 87.12, 72.36, 60.48
  ],

  // Simulated flow (before calibration) (m³/h)
  flowSimulated: [
    46.80, 42.48, 38.16, 36.72, 37.80, 46.08,
    62.64, 89.28, 106.20, 101.52, 93.60, 89.28,
    97.56, 92.88, 88.56, 90.00, 95.04, 104.40,
    114.48, 111.96, 97.92, 82.80, 69.12, 57.60
  ],

  // Effective consumption (m³/h)
  flowConsumption: [
    25.92, 23.04, 20.52, 19.80, 20.16, 24.48,
    33.48, 47.52, 56.16, 53.64, 49.68, 47.16,
    51.12, 48.60, 46.44, 47.16, 50.04, 54.72,
    60.48, 59.04, 51.48, 43.56, 36.36, 30.24
  ],

  // Real losses (m³/h)
  flowRealLoss: [
    15.12, 14.04, 12.60, 12.24, 12.60, 14.40,
    19.80, 28.08, 33.12, 31.68, 29.16, 27.72,
    30.24, 28.44, 27.36, 27.72, 29.52, 32.40,
    35.64, 34.92, 30.60, 25.56, 21.24, 18.00
  ],

  // Apparent losses (m³/h)
  flowApparentLoss: [
    10.08, 9.00, 7.92, 7.20, 7.56, 9.72,
    13.68, 19.44, 23.04, 21.96, 20.16, 19.08,
    20.88, 20.16, 19.08, 19.44, 20.52, 22.32,
    24.48, 24.12, 20.88, 18.00, 14.76, 12.24
  ],

  // Calibrated flow (post-calibration) (m³/h)
  flowCalibrated: [
    50.76, 45.72, 40.68, 38.88, 39.96, 48.24,
    66.60, 94.32, 111.60, 106.56, 98.28, 93.24,
    101.52, 96.48, 92.16, 93.60, 99.36, 108.72,
    119.88, 117.36, 102.24, 86.40, 71.64, 59.76
  ],

  // Pressure data (mca) — multiple points (unchanged — unit is mca)
  pressurePoint1: [
    32.5, 33.8, 34.6, 35.1, 34.8, 33.2,
    29.8, 24.6, 21.2, 22.8, 24.5, 25.1,
    23.6, 24.8, 25.6, 25.2, 24.2, 22.4,
    20.8, 21.4, 23.6, 26.8, 29.8, 31.6
  ],

  pressurePoint2: [
    28.2, 29.4, 30.1, 30.6, 30.3, 28.9,
    25.8, 21.4, 18.4, 19.8, 21.2, 21.8,
    20.4, 21.5, 22.2, 21.9, 21.0, 19.4,
    18.0, 18.6, 20.5, 23.4, 26.0, 27.5
  ],

  pressureSimulated: [
    31.8, 33.1, 33.9, 34.4, 34.1, 32.5,
    29.2, 24.0, 20.7, 22.2, 23.9, 24.5,
    23.0, 24.2, 25.0, 24.6, 23.6, 21.9,
    20.3, 20.9, 23.0, 26.2, 29.2, 30.9
  ],

  // Reservoir level (% of useful volume)
  reservoirLevel: [
    72.5, 78.2, 84.1, 88.6, 91.2, 88.4,
    79.2, 64.8, 52.4, 48.6, 50.2, 54.8,
    52.1, 55.4, 58.8, 60.2, 57.8, 52.4,
    46.8, 44.2, 48.6, 56.4, 63.8, 68.2
  ],

  // Reservoir inflow (m³/h)
  reservoirInflow: [
    66.24, 66.24, 66.24, 66.24, 66.24, 66.24,
    66.24, 66.24, 66.24, 66.24, 66.24, 66.24,
    66.24, 66.24, 66.24, 66.24, 66.24, 66.24,
    66.24, 66.24, 66.24, 66.24, 66.24, 66.24
  ],

  // Consumption categories — avgConsumption in m³/dia per connection
  // (typical Brazilian residential: ~8 m³/mês ÷ 30 = 0.267 m³/dia)
  consumptionCategories: [
    { id: 1, category: 'RESIDENCIAL', connections: 2068, avgConsumption: 0.267, weight: 1.0 },
    { id: 2, category: 'COMERCIAL',   connections: 364,  avgConsumption: 0.600, weight: 1.0 }
  ],

  // Pressure monitoring points
  pressurePoints: [
    { id: 1, name: 'P01 - Setor Norte',  sensor: 'PT-101', cota: 820.5, pMin: 15, pMax: 50 },
    { id: 2, name: 'P02 - Zona Alta',    sensor: 'PT-102', cota: 835.2, pMin: 10, pMax: 45 },
    { id: 3, name: 'P03 - Extremidade',  sensor: 'PT-103', cota: 810.0, pMin: 10, pMax: 50 }
  ],

  // Flow sources (m³/h)
  flowSources: [
    {
      id: 1,
      name: 'Fonte #1',
      type: 'Telemetria',
      multiplier: 1.00,
      interval: 15,
      validOnly: false,
      interpolate: true,
      flowMin: 28.80,
      flowMax: 136.51
    },
    {
      id: 2,
      name: 'Fonte #2',
      type: 'Macro Medidor',
      multiplier: 1.00,
      interval: 15,
      validOnly: false,
      interpolate: false,
      flowMin: 29.70,
      flowMax: 133.63
    }
  ],

  // Hydraulic parameters — presets
  presets: {
    residential: {
      haxPer1: 4, haxPer2: 10, E1: 1.0, diBloco: 0.5,
      pEstad1: 50, diZona: 1.14, autoPri: 1.50, dias: 30
    },
    industrial: {
      haxPer1: 6, haxPer2: 15, E1: 1.2, diBloco: 0.8,
      pEstad1: 60, diZona: 1.20, autoPri: 1.80, dias: 30
    },
    mixed: {
      haxPer1: 5, haxPer2: 12, E1: 1.1, diBloco: 0.6,
      pEstad1: 55, diZona: 1.17, autoPri: 1.65, dias: 30
    },
    dmc: {
      haxPer1: 3, haxPer2: 8, E1: 0.9, diBloco: 0.4,
      pEstad1: 45, diZona: 1.10, autoPri: 1.40, dias: 30
    }
  },

  // IWA Water Balance (m³/day)
  waterBalance: {
    systemInput: 1897,
    authorizedConsumption: 840,
    realLosses: 693,
    apparentLosses: 364,
    unavoidableLosses: 87,
    recoveredLosses: 0
  }
};
