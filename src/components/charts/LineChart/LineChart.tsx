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
  color = '#2a78d6',
  ariaLabel = 'Efficiency trend',
  yLabel,
}: LineChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: color,
        tension: 0.3,
        fill: true,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: { parsed: { y: number } }) => `${ctx.parsed.y}${yLabel ? ' ' + yLabel : ''}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 11 } } },
      y: { grid: { color: 'var(--border)' }, ticks: { color: 'var(--text-muted)', font: { size: 11 } } },
    },
  }

  return (
    <div role="img" aria-label={ariaLabel} style={{ position: 'relative', height: 160 }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
