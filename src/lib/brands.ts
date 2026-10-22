import { modelBrand, sortBrands } from "../../server/model-brand.ts"
import type { StatsResponse } from "@/types"

export { modelBrand }

/**
 * Brand choices for the filter menu.
 *
 * The server normally returns `options.brands` (unfiltered, usage-ordered). A
 * dashboard server started before the brand filter existed does not, and the
 * client cannot see that from the payload alone — it would render an empty
 * menu. Falling back to the unfiltered model list keeps the menu populated, and
 * derives exactly the same brands as the server because both use the same
 * `modelBrand` implementation.
 */
export function brandMenu(data: StatsResponse | null | undefined): string[] {
  if (!data) return []
  const fromServer = data.options?.brands ?? []
  if (fromServer.length > 0) return fromServer

  const usage = new Map<string, number>()
  for (const row of data.models ?? [])
    usage.set(
      modelBrand(row.model),
      (usage.get(modelBrand(row.model)) ?? 0) + row.requests
    )

  // options.models is unfiltered on every server version, so the menu stays
  // stable while a brand is selected.
  const models = data.options?.models ?? []
  if (models.length === 0) return sortBrands([...usage].map(([brand, requests]) => ({ brand, requests })))

  return sortBrands(
    models.map((model) => {
      const brand = modelBrand(model)
      return { brand, requests: usage.get(brand) ?? 0 }
    })
  )
}

/**
 * Whether the serving dashboard honoured the requested brand. Older servers
 * ignore the parameter and echo filters without it, in which case the numbers on
 * screen are unfiltered and must not be presented as a brand breakdown.
 */
export function brandFilterApplied(
  data: StatsResponse | null | undefined,
  requested: string
): boolean {
  if (!requested) return true
  return data?.filters?.brand === requested
}
