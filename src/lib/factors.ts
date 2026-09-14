import type { ModeId } from './types'

export const FACTOR_SET = {
  source: 'mobitool.ch',
  version: 'PLACEHOLDER-2022-app-values',
  accessed: '2026-09-14',
  url: 'https://www.mobitool.ch/',
} as const

export interface EmissionFactor {
  mode: ModeId
  label: string
  mjPerPkm: { normal: number; rushHour: number }
  kgCo2PerPkm: { normal: number; rushHour: number }
}

// TODO(factors): replace with refreshed values from docs/mobitool-factors.md
export const FACTORS: readonly EmissionFactor[] = [
  {
    mode: 1,
    label: 'Car',
    mjPerPkm: { normal: 3.2, rushHour: 3.2 },
    kgCo2PerPkm: { normal: 0.19, rushHour: 0.19 },
  },
  {
    mode: 2,
    label: 'Train',
    mjPerPkm: { normal: 0.51, rushHour: 0.22 },
    kgCo2PerPkm: { normal: 0.007, rushHour: 0.003 },
  },
  {
    mode: 3,
    label: 'Bus',
    mjPerPkm: { normal: 1.79, rushHour: 0.82 },
    kgCo2PerPkm: { normal: 0.037, rushHour: 0.016 },
  },
  {
    mode: 4,
    label: 'Tram',
    mjPerPkm: { normal: 1.18, rushHour: 0.5 },
    kgCo2PerPkm: { normal: 0.016, rushHour: 0.007 },
  },
  {
    mode: 5,
    label: 'E-Bike',
    mjPerPkm: { normal: 0.45, rushHour: 0.45 },
    kgCo2PerPkm: { normal: 0.024, rushHour: 0.024 },
  },
  {
    mode: 6,
    label: 'CO₂-neutral',
    mjPerPkm: { normal: 0, rushHour: 0 },
    kgCo2PerPkm: { normal: 0, rushHour: 0 },
  },
]

export function getFactor(
  mode: ModeId,
  factors: readonly EmissionFactor[] = FACTORS,
): EmissionFactor {
  const factor = factors.find((f) => f.mode === mode)
  if (!factor) {
    throw new Error(`No emission factor for mode ${mode}`)
  }
  return factor
}
