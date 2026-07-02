import { useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutSlice[]
  size?: number
  ariaLabel?: string
}

const options = {
  cutout: '70%',
  plugins: {
    tooltip: { enabled: true },
    legend: { display: false },
  },
  responsive: false,
  animation: { duration: 400 },
} as const

export function DonutChart({ data, size = 100, ariaLabel = 'Expense breakdown' }: DonutChartProps) {
  const chartData = useMemo(() => ({
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((d) => d.color),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }), [data])

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <Doughnut data={chartData} options={options} width={size} height={size} />
    </div>
  )
}
