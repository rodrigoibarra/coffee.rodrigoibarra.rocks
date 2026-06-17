import type { IdealCurve } from '@/types/profile'

export function buildProfileTraces(curve: IdealCurve) {
  const trace = (name: string, y: number[], color: string, yaxis: 'y' | 'y2' = 'y') => ({
    x: curve.time,
    y,
    name,
    type: 'scatter' as const,
    mode: 'lines' as const,
    line: { color },
    yaxis,
  })

  return [
    trace('Pressure (bar)', curve.pressure, '#29544d'),
    trace('Flow (ml/s)', curve.flow, '#72a19b'),
    trace('Gravimetric flow (g/s)', curve.gravimetric_flow, '#762f28', 'y2'),
    trace('Weight (g)', curve.weight, '#fa6a69', 'y2'),
  ]
}
