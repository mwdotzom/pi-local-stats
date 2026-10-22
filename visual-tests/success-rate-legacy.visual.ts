import { expect, test } from "@playwright/test"

import type { StatsResponse } from "../server/types.ts"

/** Payload shape produced by a dashboard server started before the timeline
 *  fields existed: models carry request/error counters but there is no
 *  successTimeline and no modelSuccess. */
const legacyPayload = {
  meta: {
    lastSyncAt: "2026-10-22T15:00:00Z",
    indexedFiles: 398,
    indexedSessions: 357,
  },
  filters: { range: "all", project: "", provider: "", model: "" },
  options: {
    projects: [],
    providers: ["happycoding", "fengwind"],
    models: ["deepseek-v4.1-flash", "mimo-v2.6-flash"],
  },
  overview: {
    requests: 58_476,
    errorRate: 0.2148216835,
    totalTokens: 10_474_628_840,
    cacheReadTokens: 8_159_481_088,
    cacheRate: 0.7827294252386608,
    cost: 0,
    averageDurationMs: 232894,
  },
  timeseries: [{ date: "2026-10-21", requests: 2050, cost: 0 }],
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
    {
      model: "Qwen3.8-Flash-Next",
      provider: "cc-switch-model-scope",
      requests: 8_070,
      tokens: 1_793_939_529,
      cost: 0,
      errors: 4_144,
      cacheRate: 0.79,
    },
  ],
  hiddenModels: [],
} as unknown as StatsResponse

test("legacy payload still ranks models by success rate", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ json: legacyPayload })
  })
  await page.setViewportSize({ width: 1440, height: 1000 })

  for (const path of ["/", "/models"]) {
    await page.goto(path)
    const ranking = page.getByLabel("Success rate by model")
    await expect(ranking.getByText("98.48%", { exact: true })).toBeVisible()
    await expect(ranking.getByText("48.65%", { exact: true })).toBeVisible()
    await expect(
      ranking
        .locator("xpath=..")
        .getByText(/dashboard restart \(/)
    ).toBeVisible()
    await expect(page.getByText("No measurable success rate")).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
