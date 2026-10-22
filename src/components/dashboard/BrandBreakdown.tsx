import { useI18n } from "@/lib/i18n"
import {
  formatSuccessRate,
  getSuccessRateColor,
  getSuccessRateTextClass,
} from "@/lib/success-rate"
import type { StatsResponse } from "@/types"

type BrandSummary = StatsResponse["brandSummary"][number]

/**
 * One row per brand. Every model and provider serving that brand is merged into
 * a single line, which is how a brand choice is meant to read.
 */
export function BrandBreakdown({ rows }: { rows?: BrandSummary[] }) {
  const { messages: t, format } = useI18n()
  const ranked = rows ?? []

  if (ranked.length === 0)
    return (
      <p className="text-sm text-muted-foreground">{t.noBrandData}</p>
    )

  return (
    <ul className="flex flex-col gap-2.5" aria-label={t.successRateByBrand}>
      {ranked.map((row) => {
        const percent = row.successRate === null ? null : row.successRate * 100
        return (
          <li
            key={row.brand}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
          >
            <span className="truncate font-medium" title={row.brand}>
              {row.brand}
            </span>
            <span
              className={`font-mono text-xs font-medium tabular-nums ${getSuccessRateTextClass(percent)}`}
            >
              {formatSuccessRate(percent)}
            </span>
            <span
              aria-hidden="true"
              className="col-span-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(2, Math.round(percent ?? 0))}%`,
                  backgroundColor: getSuccessRateColor(percent),
                }}
              />
            </span>
            <span className="col-span-2 text-[11px] text-muted-foreground">
              {t.brandRowDetail(
                format.number(row.requests),
                format.number(row.errors),
                format.number(row.modelCount),
                format.number(row.providerCount)
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
