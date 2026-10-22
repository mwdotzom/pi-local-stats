/**
 * Colour and dash pattern for the n-th provider series.
 *
 * Colour alone is not enough: two providers with identical success rates would
 * be drawn exactly on top of each other and one would be invisible, so the dash
 * pattern varies independently of the colour.
 */
export const PROVIDER_SERIES_COLORS = [
  "#2563eb",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
]

export const PROVIDER_SERIES_DASHES = ["", "6 3", "2 3", "10 3 2 3"]

export function providerSeriesStyle(index: number) {
  // Colour and dash advance independently, so neighbouring series differ in
  // both and any two coincident curves still differ in dash.
  return {
    color:
      PROVIDER_SERIES_COLORS[index % PROVIDER_SERIES_COLORS.length] as string,
    dashArray: PROVIDER_SERIES_DASHES[
      index % PROVIDER_SERIES_DASHES.length
    ] as string,
  }
}
