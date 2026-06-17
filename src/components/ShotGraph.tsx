import type { Data, Layout } from 'plotly.js'
import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'

interface ShotGraphProps {
  traces: Data[]
  shapes: Layout['shapes']
  annotations: Layout['annotations']
}

export default function ShotGraph({ traces, shapes, annotations }: ShotGraphProps) {
  const [Plot, setPlot] = useState<ComponentType<any> | null>(null)

  useEffect(() => {
    import('react-plotly.js').then(mod => setPlot(() => mod.default))
  }, [])

  if (!Plot)
    return <div className="shot-graph-loading">Loading graph…</div>

  return (
    <Plot
      data={traces}
      layout={{
        autosize: true,
        margin: { t: 20, r: 50, b: 40, l: 50 },
        xaxis: { title: 'Time (s)' },
        yaxis: { title: 'Pressure / Flow' },
        yaxis2: { title: 'Weight (g)', overlaying: 'y', side: 'right' },
        legend: { orientation: 'h', y: -0.2 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        shapes,
        annotations,
      }}
      useResizeHandler
      style={{ width: '100%', height: '400px' }}
      config={{ displayModeBar: false }}
    />
  )
}
