export type SuccessRateLevel =
  | "excellent"
  | "good"
  | "warning"
  | "critical"
  | "unknown"

const EXCELLENT_MIN = 100
const GOOD_MIN = 90
const WARNING_MIN = 70

/**
 * Grade a success rate expressed as a percentage (0-100).
 * - excellent: 100% (full green)
 * - good: >= 90% (lighter green)
 * - warning: >= 70% (amber)
 * - critical: below 70% (red)
 * - unknown: not a finite rate, e.g. a day without requests
 */
export function getSuccessRateLevel(rate: number | null): SuccessRateLevel {
  if (rate === null || !Number.isFinite(rate)) return "unknown"
  if (rate >= EXCELLENT_MIN) return "excellent"
  if (rate >= GOOD_MIN) return "good"
  if (rate >= WARNING_MIN) return "warning"
  return "critical"
}

const DOT_CLASS: Record<SuccessRateLevel, string> = {
  excellent: "bg-emerald-500",
  good: "bg-emerald-400",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  unknown: "bg-muted-foreground/40",
}

const TEXT_CLASS: Record<SuccessRateLevel, string> = {
  excellent: "text-emerald-600 dark:text-emerald-400",
  good: "text-emerald-500 dark:text-emerald-300",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
  unknown: "text-muted-foreground",
}

const HEX_COLOR: Record<SuccessRateLevel, string> = {
  excellent: "#10b981",
  good: "#34d399",
  warning: "#f59e0b",
  critical: "#ef4444",
  unknown: "#9ca3af",
}

export function getSuccessRateDotClass(rate: number | null): string {
  return DOT_CLASS[getSuccessRateLevel(rate)]
}

export function getSuccessRateTextClass(rate: number | null): string {
  return TEXT_CLASS[getSuccessRateLevel(rate)]
}

export function getSuccessRateColor(rate: number | null): string {
  return HEX_COLOR[getSuccessRateLevel(rate)]
}

/**
 * Percentage with two decimals, matching the precision used by new-api.
 * Returns an em dash when there is no measurable rate.
 */
export function formatSuccessRate(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return "—"
  return `${rate.toFixed(2)}%`
}

/**
 * Focus the vertical axis on the interesting band instead of always starting
 * at 0, so small regressions stay visible.
 */
export function successRateAxisMin(values: number[]): number {
  const finite = values.filter((value) => Number.isFinite(value))
  if (finite.length === 0) return 90
  const minimum = Math.max(0, Math.min(...finite))
  if (minimum >= 95) return 95
  if (minimum >= 90) return 90
  return Math.max(0, Math.floor((minimum - 5) / 10) * 10)
}
