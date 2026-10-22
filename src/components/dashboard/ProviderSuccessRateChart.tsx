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
import { providerSeriesStyle as seriesStyle } from "@/lib/provider-series"
import { useI18n } from "@/lib/i18n"
import {
  formatSuccessRate,
  getSuccessRateTextClass,
  successRateAxisMin,
} from "@/lib/success-rate"
import type { StatsResponse } from "@/types"

type ProviderSeries = StatsResponse["providerTimeline"][number]

export function ProviderSuccessRateChart({
  series,
  limit = 12,
}: {
  series?: ProviderSeries[]
  limit?: number
}) {
  const { messages: t, format } = useI18n()
  const ranked = (series ?? [])
    .filter((entry) => entry.requests > 0)
    .toSorted((left, right) => right.requests - left.requests)
    .slice(0, limit)

  if (ranked.length === 0)
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        {t.noSuccessRateData}
      </div>
    )

  const dates = [
    ...new Set(ranked.flatMap((entry) => entry.points.map((p) => p.date))),
  ].sort()
  const rows = dates.map((date) => {
    const row: Record<string, number | null | string> = { date }
    for (const entry of ranked) {
      const point = entry.points.find((candidate) => candidate.date === date)
      row[entry.provider] =
        point?.successRate === null || point?.successRate === undefined
          ? null
          : point.successRate * 100
    }
    return row
  })

  const measurable = ranked.flatMap((entry) =>
    entry.points
      .filter((point) => point.successRate !== null && point.requests > 0)
      .map((point) => (point.successRate ?? 0) * 100)
  )
  const axisMin = successRateAxisMin(measurable)

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="h-72 w-full">
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
                const point = payload[0]?.payload as
                  | Record<string, number | null | string>
                  | undefined
                if (!point) return null
                return chartTooltip(
                  format.day(String(point.date)),
                  t.providers,
                  "",
                  ranked.map((entry) => {
                    const value = point[entry.provider]
                    return {
                      label: entry.provider,
                      value:
                        typeof value === "number"
                          ? formatSuccessRate(value)
                          : "—",
                    }
                  })
                )
              }}
            />
            {ranked.map((entry, index) => {
              const { color, dashArray } = seriesStyle(index)
              return (
                <Line
                  key={entry.provider}
                  dataKey={entry.provider}
                  name={entry.provider}
                  type="monotone"
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={dashArray || undefined}
                  // Animation rewrites strokeDasharray while it runs, which would
                  // hide the per-series dash pattern.
                  isAnimationActive={false}
                  connectNulls={false}
                  // Markers make providers with only one or two recorded days
                  // visible; a bare fragment of line would be easy to miss.
                  dot={{ r: 2, fill: color, strokeWidth: 0 }}
                  activeDot={{
                    r: 3.5,
                    fill: color,
                    stroke: "var(--background)",
                    strokeWidth: 2,
                  }}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label={t.successRateByProvider}>
        {ranked.map((entry, index) => {
          const { color, dashArray } = seriesStyle(index)
          const percent =
            entry.successRate === null ? null : entry.successRate * 100
          return (
            <li key={entry.provider} className="flex items-center gap-1.5">
              <svg
                aria-hidden="true"
                width="18"
                height="8"
                viewBox="0 0 18 8"
                className="shrink-0"
              >
                <line
                  x1="0"
                  y1="4"
                  x2="18"
                  y2="4"
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray={dashArray || undefined}
                />
              </svg>
              <span className="text-muted-foreground">{entry.provider}</span>
              <span
                className={`font-mono tabular-nums ${getSuccessRateTextClass(percent)}`}
              >
                {format.successRate(entry.successRate)}
              </span>
              <span className="text-muted-foreground/70">
                {format.number(entry.requests)}
              </span>
            </li>
          )
        })}
      </ul>
      {ranked.length > 1 ? (
        <p className="text-[11px] text-muted-foreground">
          {t.providerChartLegendHint}
        </p>
      ) : null}
    </div>
  )
}
