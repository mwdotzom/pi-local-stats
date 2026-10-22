import type { DailySuccessRow, SuccessRatePoint } from "./success-rate.ts"
import { successRateFrom } from "./success-rate.ts"

export interface BrandTotalRow {
  brand: string
  requests: number
  errors: number
  tokens: number
  cache_read: number
  cost: number
  providers: number
  models: number
}

export interface BrandSummary {
  brand: string
  requests: number
  errors: number
  successRate: number | null
  tokens: number
  cacheReadTokens: number
  cacheRate: number
  cost: number
  providerCount: number
  modelCount: number
  points: SuccessRatePoint[]
}

/**
 * One row per brand, merging every model and provider that serves that brand.
 *
 * This is the whole point of the brand filter: `deepseek` must read as a single
 * entry even when ten providers and thirteen model ids carry it, so the figures
 * describe the brand rather than a provider/model pair.
 */
export function buildBrandSummary(
  totals: BrandTotalRow[],
  daily: DailySuccessRow[],
  dayKeys: string[],
  brandFromModel: (model: string) => string
): BrandSummary[] {
  const dailyByBrand = new Map<
    string,
    Map<string, { requests: number; errors: number }>
  >()
  for (const row of daily) {
    const brand = brandFromModel(row.model)
    if (!brand || brand === "unknown") continue
    let dates = dailyByBrand.get(brand)
    if (!dates) {
      dates = new Map()
      dailyByBrand.set(brand, dates)
    }
    const current = dates.get(row.date) ?? { requests: 0, errors: 0 }
    current.requests += row.requests
    current.errors += row.errors
    dates.set(row.date, current)
  }

  return totals
    .filter((row) => row.brand && row.brand !== "unknown")
    .map((row) => {
      const dates = dailyByBrand.get(row.brand) ?? new Map()
      const requests = Number(row.requests)
      const errors = Number(row.errors)
      const tokens = Number(row.tokens)
      const cacheReadTokens = Number(row.cache_read)
      return {
        brand: row.brand,
        requests,
        errors,
        successRate: successRateFrom(requests, errors),
        tokens,
        cacheReadTokens,
        cacheRate: tokens > 0 ? cacheReadTokens / tokens : 0,
        cost: Number(row.cost),
        providerCount: Number(row.providers),
        modelCount: Number(row.models),
        points: dayKeys.map((date) => {
          const aggregate = dates.get(date) ?? { requests: 0, errors: 0 }
          return {
            date,
            requests: aggregate.requests,
            errors: aggregate.errors,
            successRate: successRateFrom(
              aggregate.requests,
              aggregate.errors
            ),
          }
        }),
      }
    })
    .toSorted(
      (left, right) =>
        (right.successRate ?? -1) - (left.successRate ?? -1) ||
        right.requests - left.requests
    )
}

export interface ProviderSeries {
  provider: string
  requests: number
  errors: number
  successRate: number | null
  points: SuccessRatePoint[]
}

/**
 * One series per provider, within whatever filters are active.
 *
 * Selecting a brand merges providers into a single brand figure, but the brand
 * figure hides which provider actually served the traffic. This keeps the
 * providers side by side so they can be compared on the same timeline.
 */
export function buildProviderTimeline(
  daily: DailySuccessRow[],
  dayKeys: string[],
  providerFromModel: (provider: string) => string = (provider) => provider
): ProviderSeries[] {
  const byProvider = new Map<
    string,
    Map<string, { requests: number; errors: number }>
  >()
  for (const row of daily) {
    const provider = providerFromModel(row.provider)
    if (!provider || provider === "unknown") continue
    let dates = byProvider.get(provider)
    if (!dates) {
      dates = new Map()
      byProvider.set(provider, dates)
    }
    const current = dates.get(row.date) ?? { requests: 0, errors: 0 }
    current.requests += row.requests
    current.errors += row.errors
    dates.set(row.date, current)
  }

  return [...byProvider]
    .map(([provider, dates]) => {
      const totals = [...dates.values()].reduce(
        (accumulator, value) => ({
          requests: accumulator.requests + value.requests,
          errors: accumulator.errors + value.errors,
        }),
        { requests: 0, errors: 0 }
      )
      return {
        provider,
        requests: totals.requests,
        errors: totals.errors,
        successRate: successRateFrom(totals.requests, totals.errors),
        points: dayKeys.map((date) => {
          const aggregate = dates.get(date) ?? { requests: 0, errors: 0 }
          return {
            date,
            requests: aggregate.requests,
            errors: aggregate.errors,
            successRate: successRateFrom(
              aggregate.requests,
              aggregate.errors
            ),
          }
        }),
      }
    })
    .toSorted((left, right) => right.requests - left.requests)
}
