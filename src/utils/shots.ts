import type { Shot, ShotSample } from '@/types/shots'

export function getShotStats(shot: Shot) {
  return {
    temperature: shot.profile_temperature,
    totalTimeMs: Math.max(...shot.samples.map(s => s.profile_elapsed_ms)),
    finalWeight: shot.samples[shot.samples.length - 1]?.weight ?? null,
  }
}

function decimate<T>(items: T[], every = 3): T[] {
  return items.filter((_, i) => i % every === 0)
}

export interface StageMarker {
  name: string
  seconds: number
}

export function getStageMarkers(shot: Shot): StageMarker[] {
  const markers: StageMarker[] = []
  for (let i = 1; i < shot.samples.length; i++) {
    const prev = shot.samples[i - 1]
    const curr = shot.samples[i]
    if (curr.status !== prev.status) {
      markers.push({ name: curr.status, seconds: curr.elapsed_ms / 1000 })
    }
  }
  return markers
}

export function buildStageShapes(markers: StageMarker[]) {
  return markers.map(m => ({
    type: 'line' as const,
    x0: m.seconds,
    x1: m.seconds,
    y0: 0,
    y1: 1,
    yref: 'paper' as const,
    line: { color: '#999999', width: 1, dash: 'dot' as const },
  }))
}

export function buildStageAnnotations(markers: StageMarker[]) {
  return markers.map(m => ({
    x: m.seconds,
    y: 1,
    yref: 'paper' as const,
    text: m.name,
    showarrow: false,
    yanchor: 'bottom' as const,
    font: { size: 10 },
  }))
}

export function buildShotTraces(shot: Shot, every = 3) {
  const points = decimate(shot.samples, every)
  const x = points.map(p => p.elapsed_ms / 1000)
  const trace = (
    name: string,
    key: keyof ShotSample,
    color: string,
    yaxis: 'y' | 'y2' = 'y',
  ) => ({
    x,
    y: points.map(p => p[key]),
    name,
    type: 'scatter' as const,
    mode: 'lines' as const,
    line: { color },
    yaxis,
  })
  return [
    trace('Pressure (bar)', 'pressure', '#29544d'),
    trace('Flow (ml/s)', 'flow', '#72a19b'),
    trace('Gravimetric flow (g/s)', 'gravimetric_flow', '#762f28', 'y2'),
    trace('Weight (g)', 'weight', '#fa6a69', 'y2'),
  ]
}
