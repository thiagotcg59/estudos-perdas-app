/* ═══════════════════════════════════
   HydroBalance AI — Mock Data
   Realistic hydraulic data for demo
══════════════════════════════════ */
const MOCK = {

  // 24h hourly labels
  hours: ['00:00','01:00','02:00','03:00','04:00','05:00',
          '06:00','07:00','08:00','09:00','10:00','11:00',
          '12:00','13:00','14:00','15:00','16:00','17:00',
          '18:00','19:00','20:00','21:00','22:00','23:00'],

  // Total system flow (L/s) — macro meter
  flowTotal: [
    14.2, 12.8, 11.4, 10.9, 11.2, 13.5,
    18.6, 26.4, 31.2, 29.8, 27.5, 26.1,
    28.4, 27.0, 25.8, 26.2, 27.8, 30.4,
    33.5, 32.8, 28.6, 24.2, 20.1, 16.8
  ],

  // Simulated flow (before calibration)
  flowSimulated: [
    13.0, 11.8, 10.6, 10.2, 10.5, 12.8,
    17.4, 24.8, 29.5, 28.2, 26.0, 24.8,
    27.1, 25.8, 24.6, 25.0, 26.4, 29.0,
    31.8, 31.1, 27.2, 23.0, 19.2, 16.0
  ],

  // Effective consumption (L/s)
  flowConsumption: [
    7.2, 6.4, 5.7, 5.5, 5.6, 6.8,
    9.3, 13.2, 15.6, 14.9, 13.8, 13.1,
    14.2, 13.5, 12.9, 13.1, 13.9, 15.2,
    16.8, 16.4, 14.3, 12.1, 10.1, 8.4
  ],

  // Real losses (L/s)
  flowRealLoss: [
    4.2, 3.9, 3.5, 3.4, 3.5, 4.0,
    5.5, 7.8, 9.2, 8.8, 8.1, 7.7,
    8.4, 7.9, 7.6, 7.7, 8.2, 9.0,
    9.9, 9.7, 8.5, 7.1, 5.9, 5.0
  ],

  // Apparent losses (L/s)
  flowApparentLoss: [
    2.8, 2.5, 2.2, 2.0, 2.1, 2.7,
    3.8, 5.4, 6.4, 6.1, 5.6, 5.3,
    5.8, 5.6, 5.3, 5.4, 5.7, 6.2,
    6.8, 6.7, 5.8, 5.0, 4.1, 3.4
  ],

  // Calibrated flow (post-calibration)
  flowCalibrated: [
    14.1, 12.7, 11.3, 10.8, 11.1, 13.4,
    18.5, 26.2, 31.0, 29.6, 27.3, 25.9,
    28.2, 26.8, 25.6, 26.0, 27.6, 30.2,
    33.3, 32.6, 28.4, 24.0, 19.9, 16.6
  ],

  // Pressure data (mca) — multiple points
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

  // Reservoir inflow (L/s)
  reservoirInflow: [
    18.4, 18.4, 18.4, 18.4, 18.4, 18.4,
    18.4, 18.4, 18.4, 18.4, 18.4, 18.4,
    18.4, 18.4, 18.4, 18.4, 18.4, 18.4,
    18.4, 18.4, 18.4, 18.4, 18.4, 18.4
  ],

  // Consumption categories (default)
  consumptionCategories: [
    { id: 1, category: 'RESIDENCIAL', connections: 2068, avgConsumption: 8.004359, weight: 1.0 },
    { id: 2, category: 'RESIDENCIAL', connections: 364,  avgConsumption: 8.004421, weight: 1.0 }
  ],

  // Pressure monitoring points
  pressurePoints: [
    { id: 1, name: 'P01 - Setor Norte',  sensor: 'PT-101', cota: 820.5, pMin: 15, pMax: 50 },
    { id: 2, name: 'P02 - Zona Alta',    sensor: 'PT-102', cota: 835.2, pMin: 10, pMax: 45 },
    { id: 3, name: 'P03 - Extremidade',  sensor: 'PT-103', cota: 810.0, pMin: 10, pMax: 50 }
  ],

  // Flow sources
  flowSources: [
    {
      id: 1,
      name: 'Fonte #1',
      type: 'Telemetria',
      multiplier: 1.00,
      interval: 15,
      validOnly: false,
      interpolate: true,
      flowMin: 8.00,
      flowMax: 37.92
    },
    {
      id: 2,
      name: 'Fonte #2',
      type: 'Macro Medidor',
      multiplier: 1.00,
      interval: 15,
      validOnly: false,
      interpolate: false,
      flowMin: 8.25,
      flowMax: 37.12
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
