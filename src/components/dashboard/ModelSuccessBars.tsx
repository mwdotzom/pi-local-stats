import { useI18n } from "@/lib/i18n"
import {
  formatSuccessRate,
  getSuccessRateColor,
  getSuccessRateTextClass,
} from "@/lib/success-rate"

interface ModelRateRow {
  provider: string
  model: string
  requests: number
  errors: number
}

function rateOf(row: ModelRateRow): number | null {
  if (!row.requests || row.requests <= 0) return null
  return 1 - row.errors / row.requests
}

/**
 * Per-model success-rate ranking for the selected period.
 *
 * Unlike the daily timeline this needs no per-day history: it is derived from
 * the request and error counters already present in the models summary, so it
 * stays available even when the dashboard server predates the timeline fields.
 */
export function ModelSuccessBars({
  rows,
  limit = 12,
}: {
  rows?: ModelRateRow[]
  limit?: number
}) {
  const { format } = useI18n()
  const ranked = (rows ?? [])
    .filter((row) => row.requests > 0)
    .toSorted((left, right) => {
      const leftRate = rateOf(left) ?? -1
      const rightRate = rateOf(right) ?? -1
      return rightRate - leftRate
    })
    .slice(0, limit)

  if (ranked.length === 0) return null

  return (
    <ul className="flex flex-col gap-2" aria-label="Success rate by model">
      {ranked.map((row) => {
        const rate = rateOf(row)
        const width = Math.max(2, Math.round((rate ?? 0) * 100))
        return (
          <li
            key={`${row.provider}/${row.model}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
          >
            <span className="truncate text-muted-foreground" title={row.model}>
              {row.model}
              <span className="text-muted-foreground/60"> · {row.provider}</span>
            </span>
            <span
              className={`font-mono text-xs font-medium tabular-nums ${getSuccessRateTextClass((rate ?? 0) * 100)}`}
            >
              {formatSuccessRate(rate === null ? null : rate * 100)}
            </span>
            <span
              aria-hidden="true"
              className="col-span-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${width}%`,
                  backgroundColor: getSuccessRateColor((rate ?? 0) * 100),
                }}
              />
            </span>
            <span className="col-span-2 text-[11px] text-muted-foreground">
              {format.number(row.requests)} req · {format.number(row.errors)}{" "}
              err
            </span>
          </li>
        )
      })}
    </ul>
  )
}
