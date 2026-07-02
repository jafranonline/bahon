import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { useChartTheme } from '../useChartTheme'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface BarSeries {
  label: string
  data: number[]
  color: string
}

interface StackedBarChartProps {
  labels: string[]
  series: BarSeries[]
  ariaLabel?: string
}

export function StackedBarChart({ labels, series, ariaLabel = 'Monthly cost breakdown' }: StackedBarChartProps) {
  const theme = useChartTheme()

  const data = useMemo(() => ({
    labels,
    datasets: series.map((s) => ({
      label: s.label,
      data: s.data,
      backgroundColor: s.color,
      borderRadius: 4,
      borderSkipped: false,
    })),
  }), [labels, series])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: theme.textMuted, font: { size: 11 } } },
      y: { stacked: true, grid: { color: theme.border }, ticks: { color: theme.textMuted, font: { size: 11 } } },
    },
  }), [theme])

  return (
    <div role="img" aria-label={ariaLabel} style={{ position: 'relative', height: 180 }}>
      <Bar data={data} options={options} />
    </div>
  )
}
