import { expect, test, type Route } from "@playwright/test"

import type { StatsResponse } from "../server/types.ts"

/** Payload from a dashboard server started before the brand filter existed:
 *  no `options.brands`, and `filters` echoes no `brand`. */
const legacy = {
  meta: {
    lastSyncAt: "2026-10-22T15:00:00Z",
    indexedFiles: 398,
    indexedSessions: 357,
  },
  filters: { range: "all", project: "", provider: "", model: "" },
  options: {
    projects: [],
    providers: ["happycoding", "fengwind"],
    models: [
      "deepseek-v4.1-flash",
      "z-ai/glm-5.3",
      "Qwen/Qwen3.8-Flash-Next",
      "minimax-m3.1-flash",
      "moonshotai/kimi-k3",
      "mimo-v2.6-flash",
      "grok-4.6",
    ],
  },
  overview: {
    requests: 58_789,
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
    { model: "deepseek-v4.1-flash", provider: "happycoding", requests: 18_030, tokens: 1e9, cost: 0, errors: 274, cacheRate: 0.98 },
    { model: "Qwen/Qwen3.8-Flash-Next", provider: "cc", requests: 8_070, tokens: 1e8, cost: 0, errors: 4_144, cacheRate: 0.7 },
    { model: "mimo-v2.6-flash", provider: "fengwind", requests: 6_118, tokens: 1e8, cost: 0, errors: 2_822, cacheRate: 0.79 },
    { model: "moonshotai/kimi-k3", provider: "runanytime2", requests: 1_904, tokens: 1e6, cost: 0, errors: 441, cacheRate: 0.5 },
    { model: "minimax-m3.1-flash", provider: "lucky", requests: 949, tokens: 1e6, cost: 0, errors: 298, cacheRate: 0.5 },
    { model: "grok-4.6", provider: "bohe", requests: 386, tokens: 1e5, cost: 0, errors: 64, cacheRate: 0.5 },
    { model: "z-ai/glm-5.3", provider: "pm", requests: 67, tokens: 1e4, cost: 0, errors: 10, cacheRate: 0.5 },
  ],
  hiddenModels: [],
} as unknown as StatsResponse

test("brand menu is populated by a server without brand support", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.route("**/api/**", async (route: Route) => {
    await route.fulfill({ json: legacy })
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")

  const trigger = page.getByRole("combobox", { name: "All brands" })
  await trigger.click()
  const options = page.getByRole("option")
  // Derived from the unfiltered model list, ordered by usage.
  await expect(options).toHaveText([
    "All brands",
    "deepseek",
    "qwen",
    "mimo",
    "kimi",
    "minimax",
    "grok",
    "glm",
  ])

  await page.getByRole("option", { name: "glm", exact: true }).click()
  await expect(page).toHaveURL(/brand=glm/)
  await expect(trigger).toContainText("glm")
  // A server that ignored the parameter must not present unfiltered numbers as
  // a brand breakdown.
  await expect(page.getByRole("status")).toContainText(
    "does not apply the brand filter yet"
  )
  expect(errors).toEqual([])
})
