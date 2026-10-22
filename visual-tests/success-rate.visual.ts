import { expect, test, type Route } from "@playwright/test"

import type { StatsResponse } from "../server/types.ts"

const timeline = [
  { date: "2026-09-15", requests: 229, errors: 26, successRate: 0.8864628820960698 },
  { date: "2026-09-16", requests: 454, errors: 31, successRate: 0.9317180616740088 },
  { date: "2026-09-17", requests: 72, errors: 12, successRate: 0.8333333333333334 },
  { date: "2026-09-18", requests: 684, errors: 27, successRate: 0.9605263157894737 },
  { date: "2026-09-19", requests: 134, errors: 0, successRate: 1 },
  { date: "2026-09-20", requests: 0, errors: 0, successRate: null },
  { date: "2026-09-21", requests: 812, errors: 41, successRate: 0.9495073891629355 },
  { date: "2026-09-22", requests: 5400, errors: 264, successRate: 0.9511111111111111 },
]

const stats: StatsResponse = {
  meta: {
    lastSyncAt: "2026-09-22T21:41:00Z",
    indexedFiles: 20,
    indexedSessions: 20,
  },
  filters: { range: "all", project: "", provider: "", model: "" },
  options: {
    projects: [],
    providers: ["happycoding", "fengwind"],
    models: ["deepseek-v4.1-flash", "mimo-v2.6-flash"],
  },
  overview: {
    requests: 58_303,
    errorRate: 0.2150831216172308,
    totalTokens: 10_474_628_840,
    cacheReadTokens: 8_159_481_088,
    cacheRate: 0.7827294252386608,
    cost: 0,
    averageDurationMs: 232894,
  },
  timeseries: timeline.map((point) => ({
    date: point.date,
    requests: point.requests,
    cost: 0,
  })),
  successTimeline: timeline,
  modelSuccess: [
    {
      provider: "happycoding",
      model: "deepseek-v4.1-flash",
      requests: 17_940,
      errors: 273,
      successRate: 0.9847881828316609,
      points: timeline,
    },
    {
      provider: "fengwind",
      model: "mimo-v2.6-flash",
      requests: 6_108,
      errors: 2_812,
      successRate: 0.5396463667321558,
      points: timeline.map((point) => ({
        ...point,
        successRate:
          point.successRate === null ? null : Math.max(0, point.successRate - 0.4),
      })),
    },
  ],
  providers: [],
  projects: [],
  tools: [],
  skills: [],
  models: [
    {
      model: "deepseek-v4.1-flash",
      provider: "happycoding",
      requests: 17_940,
      tokens: 3_341_011_674,
      cost: 0,
      errors: 273,
      cacheRate: 0.9847156530514739,
    },
    {
      model: "mimo-v2.6-flash",
      provider: "fengwind",
      requests: 6_108,
      tokens: 1_793_939_529,
      cost: 0,
      errors: 2_812,
      cacheRate: 0.7926759934779851,
    },
  ],
  hiddenModels: [],
}

test("success rate timeline renders on overview and models", async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.route("**/api/**", async (route: Route) => {
    await route.fulfill({ json: stats })
  })
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.goto("/")
  await expect(
    page.getByText("Overall success rate over time", { exact: true })
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath("overview-success-rate.png"),
    animations: "disabled",
    fullPage: true,
  })

  await page.goto("/models")
  await expect(page.getByRole("table").getByText("98.48%")).toBeVisible()
  await expect(page.getByRole("table").getByText("53.96%")).toBeVisible()
  await expect(
    page.getByText("Success rate by model", { exact: true })
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath("models-success-rate.png"),
    animations: "disabled",
    fullPage: true,
  })
  expect(errors).toEqual([])
})
