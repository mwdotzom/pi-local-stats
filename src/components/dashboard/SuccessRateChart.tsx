import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { chartTooltip } from "@/components/dashboard/ChartTooltipContent"
import { useI18n } from "@/lib/i18n"
import { getSuccessRateColor, successRateAxisMin } from "@/lib/success-rate"
import type { StatsResponse } from "@/types"

type TimelinePoint = StatsResponse["successTimeline"][number]

/**
 * Success rate over time.
 *
 * A day without recorded requests has no measurable success rate; those points
 * are rendered as gaps (connectNulls is off) instead of being reported as 0%.
 */
export function SuccessRateChart({
  data,
}: {
  data?: TimelinePoint[]
}) {
  const { messages: t, format } = useI18n()
  const chartData = (data ?? []).map((point) => ({
    ...point,
    successRatePercent:
      point.successRate === null ? null : point.successRate * 100,
  }))
  const measurable = chartData.filter(
    (point) => point.successRatePercent !== null && point.requests > 0
  )

  if (measurable.length === 0)
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {t.noSuccessRateData}
      </div>
    )

  const axisMin = successRateAxisMin(
    measurable.map((point) => point.successRatePercent ?? 0)
  )

  return (
    <div className="h-72 w-full text-xs">
      <ResponsiveContainer initialDimension={{ width: 320, height: 200 }}>
        <LineChart data={chartData} margin={{ left: 4, right: 12, top: 12 }}>
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
            domain={[axisMin, 100]}
            tick={{ fill: "var(--muted-foreground)" }}
            tickFormatter={(value: number) => `${value}%`}
          />
          <ReferenceLine
            y={100}
            stroke="var(--border)"
            strokeDasharray="4 4"
            label={{
              value: "100%",
              position: "insideTopRight",
              fill: "var(--muted-foreground)",
              fontSize: 10,
            }}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0]?.payload as TimelinePoint | undefined
              if (!point) return null
              return chartTooltip(
                format.day(point.date),
                t.successRateSignal,
                format.successRate(point.successRate),
                [
                  {
                    label: t.requests,
                    value: format.number(point.requests),
                  },
                  {
                    label: t.errors,
                    value: format.number(point.errors),
                  },
                ]
              )
            }}
          />
          <Line
            dataKey="successRatePercent"
            type="monotone"
            stroke="var(--chart-1)"
            strokeWidth={2}
            connectNulls={false}
            dot={(props) => {
              const point = props.payload as (typeof chartData)[number]
              const rate = point?.successRatePercent
              if (rate === null || rate === undefined) return null
              return (
                <circle
                  key={`${point.date}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={3}
                  fill={getSuccessRateColor(rate)}
                  stroke="var(--background)"
                  strokeWidth={1.5}
                />
              )
            }}
            activeDot={(props) => {
              const point = props.payload as (typeof chartData)[number]
              const rate = point?.successRatePercent
              return (
                <circle
                  key={`${point?.date}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={4.5}
                  fill={
                    rate === null || rate === undefined
                      ? "var(--muted-foreground)"
                      : getSuccessRateColor(rate)
                  }
                  stroke="var(--background)"
                  strokeWidth={2}
                />
              )
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Compact per-day status strip, mirroring the new-api uptime sparkline:
 * one coloured bar per day, colour = success-rate grade.
 */
export function SuccessRateSparkline({
  points,
  className,
}: {
  points: TimelinePoint[]
  className?: string
}) {
  const { format } = useI18n()
  const measurable = points.filter(
    (point) => point.successRate !== null && point.requests > 0
  )
  if (measurable.length === 0)
    return <span className="text-muted-foreground text-xs">—</span>

  return (
    <span
      className={className}
      role="img"
      aria-label={format.successRate(
        measurable.reduce((total, point) => total + (point.successRate ?? 0), 0) /
          measurable.length
      )}
    >
      <span className="flex h-3 items-end gap-px">
        {points.map((point) => (
          <span
            key={point.date}
            aria-hidden="true"
            title={`${format.day(point.date)} · ${format.successRate(
              point.successRate
            )}`}
            className={`h-full w-[3px] shrink-0 rounded-xs ${
              point.successRate === null
                ? "bg-muted-foreground/20"
                : point.successRate * 100 >= 100
                  ? "bg-emerald-500"
                  : point.successRate * 100 >= 90
                    ? "bg-emerald-400"
                    : point.successRate * 100 >= 70
                      ? "bg-amber-500"
                      : "bg-red-500"
            }`}
          />
        ))}
      </span>
    </span>
  )
}
