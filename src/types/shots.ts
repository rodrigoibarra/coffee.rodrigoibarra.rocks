export interface ShotIndexEntry {
  id: string
  db_key: number
  timestamp: string
  profile_name: string
  profile_temperature: number
  profile_target_weight: number
}

export interface ShotSample {
  elapsed_ms: number
  profile_elapsed_ms: number
  status: string
  pressure: number | null
  flow: number | null
  weight: number | null
  gravimetric_flow: number | null
  setpoint_active: 'pressure' | 'flow' | null
  setpoint_pressure: number | null
  setpoint_flow: number | null
}

export interface Shot extends ShotIndexEntry {
  samples: ShotSample[]
}
