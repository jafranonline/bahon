import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { useChartTheme } from '../useChartTheme'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

interface LineChartProps {
  labels: string[]
  data: number[]
  color?: string
  ariaLabel?: string
  yLabel?: string
}

export function LineChart({
  labels,
  data,
  color,
  ariaLabel = 'Efficiency trend',
  yLabel,
}: LineChartProps) {
  const theme = useChartTheme()
  const lineColor = color ?? theme.accent

  const chartData = useMemo(() => ({
    labels,
    datasets: [
      {
        data,
        borderColor: lineColor,
        backgroundColor: lineColor + '22',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: lineColor,
        tension: 0.3,
        fill: true,
      },
    ],
  }), [labels, data, lineColor])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? ''}${yLabel ? ' ' + yLabel : ''}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: theme.textMuted, font: { size: 11 } } },
      y: { grid: { color: theme.border }, ticks: { color: theme.textMuted, font: { size: 11 } } },
    },
  }), [yLabel, theme])

  return (
    <div role="img" aria-label={ariaLabel} style={{ position: 'relative', height: 160 }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
