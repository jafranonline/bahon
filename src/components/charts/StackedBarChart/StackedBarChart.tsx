import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

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
  const data = {
    labels,
    datasets: series.map((s) => ({
      label: s.label,
      data: s.data,
      backgroundColor: s.color,
      borderRadius: 4,
      borderSkipped: false,
    })),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 11 } } },
      y: { stacked: true, grid: { color: 'var(--border)' }, ticks: { color: 'var(--text-muted)', font: { size: 11 } } },
    },
  }

  return (
    <div role="img" aria-label={ariaLabel} style={{ position: 'relative', height: 180 }}>
      <Bar data={data} options={options} />
    </div>
  )
}
