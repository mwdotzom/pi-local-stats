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
