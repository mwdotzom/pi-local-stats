import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { chartTooltip } from "@/components/dashboard/ChartTooltipContent"
import { useI18n } from "@/lib/i18n"
import { getSuccessRateColor } from "@/lib/success-rate"
import type { StatsResponse } from "@/types"

type ModelSuccess = StatsResponse["modelSuccess"][number]

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-3)",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
]

function label(model: ModelSuccess) {
  return model.model.length > 20 ? `${model.model.slice(0, 18)}…` : model.model
}

/**
 * Success-rate timeline for several models at once, so their reliability can be
 * compared directly over the selected period.
 */
export function ModelSuccessRateChart({
  data,
  limit = 8,
}: {
  data?: StatsResponse["modelSuccess"]
  limit?: number
}) {
  const { messages: t, format } = useI18n()
  const series = (data ?? [])
    .filter((entry) => entry.requests > 0)
    .toSorted((left, right) => right.requests - left.requests)
    .slice(0, limit)

  if (series.length === 0)
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {t.noSuccessRateData}
      </div>
    )

  const dates = [...new Set(series.flatMap((entry) => entry.points.map((p) => p.date)))].sort()
  const rows = dates.map((date) => {
    const row: Record<string, number | null | string> = { date }
    for (const entry of series) {
      const point = entry.points.find((p) => p.date === date)
      row[`${entry.provider}/${entry.model}`] =
        point?.successRate === null || point?.successRate === undefined
          ? null
          : point.successRate * 100
    }
    return row
  })

  return (
    <div className="h-72 w-full text-xs">
      <ResponsiveContainer initialDimension={{ width: 320, height: 200 }}>
        <LineChart data={rows} margin={{ left: 4, right: 12, top: 12 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            tick={{ fill: "var(--muted-foreground)" }}
            tickFormatter={format.day}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={46}
            domain={[0, 100]}
            tick={{ fill: "var(--muted-foreground)" }}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0]?.payload as
                | Record<string, number | null | string>
                | undefined
              if (!point) return null
              return chartTooltip(
                format.day(String(point.date)),
                t.successRateSignal,
                "",
                series.map((entry) => {
                  const key = `${entry.provider}/${entry.model}`
                  const value = point[key]
                  return {
                    label: label(entry),
                    value:
                      typeof value === "number"
                        ? format.successRate(value / 100)
                        : "—",
                  }
                })
              )
            }}
          />
          {series.map((entry, index) => {
            const key = `${entry.provider}/${entry.model}`
            const color = SERIES_COLORS[index % SERIES_COLORS.length]
            return (
              <Line
                key={key}
                dataKey={key}
                name={label(entry)}
                type="monotone"
                stroke={color}
                strokeWidth={2}
                connectNulls={false}
                dot={false}
                activeDot={{
                  r: 3.5,
                  fill: getSuccessRateColor(
                    (entry.successRate ?? 0) * 100
                  ),
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((entry, index) => (
          <li
            key={`${entry.provider}/${entry.model}`}
            className="flex items-center gap-1.5"
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  SERIES_COLORS[index % SERIES_COLORS.length],
              }}
            />
            <span className="text-muted-foreground">{label(entry)}</span>
            <span className="font-mono tabular-nums">
              {format.successRate(entry.successRate)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
