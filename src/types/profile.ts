import type { MeticulousProfile, ProfileStage, ProfileVariable } from '@/types/profile'

function resolveValue(raw: number | string, variables: ProfileVariable[]): number {
  if (typeof raw === 'number')
    return raw
  const key = raw.replace(/^\$/, '')
  const variable = variables.find(v => v.key === key)
  if (!variable)
    throw new Error(`Unresolved variable reference: ${raw}`)
  return variable.value
}

export function getStageDurations(
  profile: MeticulousProfile,
  idealTime: number,
  overrides: Record<string, number> = {},
): number[] {
  const { stages, variables } = profile
  const known = stages.map((stage) => {
    if (overrides[stage.key] != null)
      return overrides[stage.key]
    const timeTrigger = stage.exit_triggers.find((t: any) => t.type === 'time')
    return timeTrigger ? resolveValue(timeTrigger.value, variables) : null
  })
  const unknownCount = known.filter(d => d === null).length
  const knownTotal = known.reduce((sum: number, d) => sum + (d ?? 0), 0)
  const remaining = Math.max(idealTime - knownTotal, 0)
  const perUnknown = unknownCount > 0 ? remaining / unknownCount : 0
  return known.map(d => d ?? perUnknown)
}

function resolvePoints(stage: ProfileStage, variables: ProfileVariable[]): [number, number][] {
  return stage.dynamics.points.map(([x, y]) => [resolveValue(x, variables), resolveValue(y, variables)])
}

function valueAt(points: [number, number][], t: number): number {
  if (points.length === 1)
    return points[0][1]
  const last = points[points.length - 1]
  if (t >= last[0])
    return last[1]
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    if (t >= x0 && t <= x1)
      return y0 + (y1 - y0) * ((t - x0) / (x1 - x0))
  }
  return last[1]
}

export interface StageMarker { name: string, seconds: number }

export function getProfileStageMarkers(
  profile: MeticulousProfile,
  idealTime: number,
  overrides: Record<string, number> = {},
): StageMarker[] {
  const durations = getStageDurations(profile, idealTime, overrides)
  const markers: StageMarker[] = []
  let cursor = 0
  profile.stages.forEach((stage, i) => {
    if (i > 0)
      markers.push({ name: stage.name, seconds: cursor })
    cursor += durations[i]
  })
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

export function buildIdealTraces(
  profile: MeticulousProfile,
  idealTime: number,
  overrides: Record<string, number> = {},
  stepSeconds = 0.5,
) {
  const durations = getStageDurations(profile, idealTime, overrides)
  const x: number[] = []
  const y: number[] = []
  let cursor = 0
  profile.stages.forEach((stage, i) => {
    const points = resolvePoints(stage, profile.variables)
    for (let t = 0; t <= durations[i]; t += stepSeconds) {
      x.push(cursor + t)
      y.push(valueAt(points, t))
    }
    cursor += durations[i]
  })
  return [{
    x,
    y,
    name: 'Ideal curve',
    type: 'scatter' as const,
    mode: 'lines' as const,
    line: { color: profile.display.accentColor || '#29544d' },
  }]
}

export interface ProfileVariable {
  name: string
  key: string
  type: string
  value: number
}

export interface ProfileDisplay {
  shortDescription: string
  description: string
  accentColor: string
  image: string
}

export interface PreviousAuthor {
  name: string
  author_id: string
  profile_id: string
}

export interface MeticulousProfile {
  name: string
  id: string
  author: string
  author_id: string
  previous_authors: PreviousAuthor[]
  temperature: number
  final_weight: number
  variables: ProfileVariable[]
  display: ProfileDisplay
  last_changed: number
  isLast: boolean
  temporary: boolean
}

export interface IdealCurve {
  time: number[]
  pressure: number[]
  flow: number[]
  weight: number[]
  gravimetric_flow: number[]
}
