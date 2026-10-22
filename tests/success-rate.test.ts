import { describe, expect, it } from "vitest"

import {
  buildModelSuccessTimeline,
  buildSuccessTimeline,
  successDayKeys,
  successRateFrom,
} from "../server/success-rate.ts"

describe("success rate aggregation", () => {
  it("defines the rate as the share of requests that did not fail", () => {
    expect(successRateFrom(0, 0)).toBeNull()
    expect(successRateFrom(10, 0)).toBe(1)
    expect(successRateFrom(10, 1)).toBe(0.9)
    expect(successRateFrom(3, 1)).toBeCloseTo(2 / 3, 10)
    expect(successRateFrom(4, 4)).toBe(0)
  })

  it("reports a gap instead of a zero rate for days without requests", () => {
    const timeline = buildSuccessTimeline(
      [
        { date: "2026-01-01", provider: "p", model: "m", requests: 10, errors: 1 },
        { date: "2026-01-03", provider: "p", model: "m", requests: 4, errors: 0 },
      ],
      ["2026-01-01", "2026-01-02", "2026-01-03"]
    )
    expect(timeline).toHaveLength(3)
    expect(timeline[0]?.successRate).toBeCloseTo(0.9, 10)
    expect(timeline[1]?.requests).toBe(0)
    expect(timeline[1]?.successRate).toBeNull()
    expect(timeline[2]?.successRate).toBe(1)
  })

  it("aggregates several providers and models for the same day", () => {
    const timeline = buildSuccessTimeline(
      [
        { date: "2026-01-01", provider: "p1", model: "m", requests: 10, errors: 1 },
        { date: "2026-01-01", provider: "p2", model: "m", requests: 10, errors: 3 },
      ],
      ["2026-01-01"]
    )
    expect(timeline[0]?.requests).toBe(20)
    expect(timeline[0]?.errors).toBe(4)
    expect(timeline[0]?.successRate).toBe(0.8)
  })

  it("splits the same model id across providers", () => {
    const models = buildModelSuccessTimeline(
      [
        { date: "2026-01-01", provider: "p1", model: "m", requests: 10, errors: 1 },
        { date: "2026-01-01", provider: "p2", model: "m", requests: 10, errors: 5 },
      ],
      ["2026-01-01"],
      [
        { provider: "p1", model: "m" },
        { provider: "p2", model: "m" },
      ]
    )
    expect(models).toHaveLength(2)
    expect(models[0]?.successRate).toBeCloseTo(0.9, 10)
    expect(models[1]?.successRate).toBeCloseTo(0.5, 10)
    expect(models[0]?.points[0]?.successRate).toBeCloseTo(0.9, 10)
  })

  it("excludes unknown providers and models from the per-model breakdown", () => {
    const models = buildModelSuccessTimeline(
      [
        { date: "2026-01-01", provider: "unknown", model: "m", requests: 5, errors: 5 },
        { date: "2026-01-01", provider: "p", model: "unknown", requests: 5, errors: 5 },
      ],
      ["2026-01-01"],
      [{ provider: "p", model: "m" }]
    )
    expect(models).toHaveLength(1)
    expect(models[0]?.requests).toBe(0)
    expect(models[0]?.successRate).toBeNull()
  })

  it("builds contiguous UTC day keys for each range", () => {
    expect(successDayKeys("today", "2026-01-01")).toHaveLength(1)
    expect(successDayKeys("7d", "2026-01-01")).toHaveLength(7)
    expect(successDayKeys("30d", "2026-01-01")).toHaveLength(30)
    const all = successDayKeys("all", "2026-01-01")
    expect(all[0]).toBe("2026-01-01")
    expect(all.at(-1)).toBe(new Date().toISOString().slice(0, 10))
    expect(all.length).toBeGreaterThan(30)
    for (let index = 1; index < all.length; index += 1) {
      const previous = Date.parse(`${all[index - 1]}T00:00:00Z`)
      const current = Date.parse(`${all[index]}T00:00:00Z`)
      expect(current - previous).toBe(86_400_000)
    }
  })
})
