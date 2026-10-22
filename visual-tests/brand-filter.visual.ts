import { expect, test, type Route } from "@playwright/test"

import type { StatsResponse } from "../server/types.ts"

const base = {
  meta: {
    lastSyncAt: "2026-10-22T15:00:00Z",
    indexedFiles: 398,
    indexedSessions: 357,
  },
  filters: { range: "all", project: "", brand: "", provider: "", model: "" },
  options: {
    projects: [],
    brands: ["deepseek", "qwen", "mimo", "kimi", "minimax", "glm", "grok"],
    providers: ["happycoding", "fengwind"],
    models: ["deepseek-v4.1-flash", "z-ai/glm-5.3"],
  },
  overview: {
    requests: 58_476,
    errorRate: 0.2148,
    totalTokens: 10_474_628_840,
    cacheReadTokens: 8_159_481_088,
    cacheRate: 0.78,
    cost: 0,
    averageDurationMs: 232_894,
  },
  timeseries: [],
  successTimeline: [],
  modelSuccess: [],
  providers: [],
  projects: [],
  tools: [],
  skills: [],
  models: [
    {
      model: "deepseek-v4.1-flash",
      provider: "happycoding",
      requests: 17_962,
      tokens: 3_341_011_674,
      cost: 0,
      errors: 273,
      cacheRate: 0.98,
    },
  ],
  hiddenModels: [],
} as unknown as StatsResponse

const filtered: StatsResponse = {
  ...base,
  filters: { range: "all", project: "", brand: "glm", provider: "", model: "" },
  overview: { ...base.overview, requests: 586, errorRate: 0.2 },
  models: [
    {
      model: "z-ai/glm-5.3",
      provider: "zhipu",
      requests: 586,
      tokens: 1_000,
      cost: 0,
      errors: 117,
      cacheRate: 0.5,
    },
  ],
} as unknown as StatsResponse

test("brand selector filters the dashboard", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const statsRequests: string[] = []
  await page.route("**/api/stats*", async (route: Route) => {
    const url = new URL(route.request().url())
    statsRequests.push(`${url.searchParams.get("brand") ?? ""}|${url.searchParams.get("range")}`)
    await route.fulfill({
      json: url.searchParams.get("brand") === "glm" ? filtered : base,
    })
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/models")

  const trigger = page.getByRole("combobox", { name: "All brands" })
  await expect(trigger).toBeVisible()
  await trigger.click()
  for (const brand of ["deepseek", "qwen", "mimo", "kimi", "minimax", "glm", "grok"])
    await expect(page.getByRole("option", { name: brand, exact: true })).toBeVisible()
  await page.getByRole("option", { name: "glm", exact: true }).click()

  await expect.poll(() => statsRequests.at(-1)).toBe("glm|all")
  await expect(page).toHaveURL(/brand=glm/)
  await expect(page.getByText("z-ai/glm-5.3").first()).toBeVisible()

  // The chosen brand must remain listed in its own menu.
  await page.getByRole("combobox", { name: "All brands" }).click()
  await expect(page.getByRole("option", { name: "glm", exact: true })).toBeVisible()
  await page.keyboard.press("Escape")

  // Reload keeps the filter in the URL.
  await page.reload()
  await expect(page.getByRole("combobox", { name: "All brands" })).toContainText("glm")

  // Clearing it returns the full dataset.
  await page.getByRole("combobox", { name: "All brands" }).click()
  await page.getByRole("option", { name: "All brands", exact: true }).click()
  await expect.poll(() => statsRequests.at(-1)).toBe("|all")
  await expect(page).not.toHaveURL(/brand=/)
  expect(errors).toEqual([])
})

test("brand choice reads as one entry covering all providers", async ({
  page,
}) => {
  const point = (date: string, requests: number, errors: number) => ({
    date,
    requests,
    errors,
    successRate: requests > 0 ? 1 - errors / requests : null,
  })
  const brand = (
    name: string,
    requests: number,
    errors: number,
    providerCount: number,
    modelCount: number
  ) => ({
    brand: name,
    requests,
    errors,
    successRate: 1 - errors / requests,
    tokens: 1_000,
    cacheReadTokens: 500,
    cacheRate: 0.5,
    cost: 0,
    providerCount,
    modelCount,
    points: [
      point("2026-10-19", requests, errors),
      point("2026-10-20", requests, errors),
    ],
  })
  const withBrands = {
    ...base,
    filters: { range: "all", project: "", brand: "deepseek", provider: "", model: "" },
    options: { ...base.options, brands: ["deepseek", "glm"] },
    overview: { ...base.overview, requests: 40_248, errorRate: 0.1092 },
    brandSummary: [brand("deepseek", 40_248, 4_397, 10, 8)],
    modelSuccess: [
      {
        provider: "happycoding",
        model: "deepseek-v4.1-flash",
        requests: 18_030,
        errors: 274,
        successRate: 0.9848,
        points: [
          point("2026-10-19", 9_000, 137),
          point("2026-10-20", 18_030, 274),
        ],
      },
      {
        provider: "fengwind",
        model: "deepseek-v4.1-flash",
        requests: 14_852,
        errors: 3_750,
        successRate: 0.7475,
        points: [
          point("2026-10-19", 7_400, 1_870),
          point("2026-10-20", 14_852, 3_750),
        ],
      },
    ],
    models: [
      {
        model: "deepseek-v4.1-flash",
        provider: "happycoding",
        requests: 18_030,
        tokens: 1_000,
        cost: 0,
        errors: 274,
        cacheRate: 0.9,
      },
    ],
  } as unknown as StatsResponse

  await page.route("**/api/**", async (route) => {
    await route.fulfill({ json: withBrands })
  })
  await page.setViewportSize({ width: 1440, height: 1400 })
  await page.goto("/models")

  const byBrand = page.getByLabel("Success rate by brand")
  // One entry for the whole brand, not one per provider or per model id.
  await expect(byBrand.locator("li")).toHaveCount(1)
  await expect(byBrand).toContainText("deepseek")
  await expect(byBrand).toContainText("40,248 req")
  await expect(byBrand).toContainText("10 providers")
  await expect(byBrand).toContainText("8 models")

  // The success chart shows the brand as a single series even though two
  // providers serve it.
  await expect(page.locator(".recharts-line-curve")).toHaveCount(1)
})
