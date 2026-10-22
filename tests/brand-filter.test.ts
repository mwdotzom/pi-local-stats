import { afterEach, describe, expect, it } from "vitest"

import { createDatabase } from "../server/database.ts"
import { getStats } from "../server/stats.ts"
import type { StatsFilters } from "../server/types.ts"

const databases: ReturnType<typeof createDatabase>[] = []

afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function filters(overrides: Partial<StatsFilters> = {}): StatsFilters {
  return {
    range: "all",
    project: "",
    brand: "",
    provider: "",
    model: "",
    ...overrides,
  }
}

/** Two deepseek ids from different providers, one qwen, one glm. */
function seed() {
  const database = createDatabase(":memory:")
  databases.push(database)
  database
    .prepare(
      "INSERT INTO sessions (file_path, session_id, cwd, name, started_at, parent_session, accounting_session_id, session_kind) VALUES ('/s.jsonl', 's', '/work/p', 'session', '2026-10-01T09:00:00.000Z', NULL, 's', 'root')"
    )
    .run()
  const insertRequest = database.prepare(
    `INSERT INTO requests (id, source_key, request_key, file_path, session_id,
      accounting_session_id, cwd, timestamp, provider, model, input_tokens,
      cache_read_tokens, total_tokens, cost, is_error, duration_ms)
     VALUES (?, ?, ?, '/s.jsonl', 's', 's', '/work/p', ?, ?, ?,
      10, 0, 10, 0, ?, 100)`
  )
  const rows = [
    ["r1", "happycoding", "deepseek-v4.1-flash", 0],
    ["r2", "fengwind", "deepseek-v4.1-flash", 1],
    ["r3", "cc", "Qwen/Qwen3.8-Flash-Next", 1],
    ["r4", "zhipu", "z-ai/glm-5.3", 1],
  ] as const
  rows.forEach(([id, provider, model, isError], index) => {
    insertRequest.run(
      id,
      `${id}:key`,
      `${id}:request`,
      `2026-10-0${index + 1}T10:00:00.000Z`,
      provider,
      model,
      isError
    )
  })
  const insertTool = database.prepare(
    `INSERT INTO tool_calls (id, source_key, file_path, session_id, cwd, name,
      provider, model, started_at, duration_ms, is_error)
     VALUES (?, ?, '/s.jsonl', 's', '/work/p', 'bash', ?, ?, ?, 10, 0)`
  )
  rows.forEach(([id, provider, model], index) => {
    insertTool.run(
      `t${id}`,
      `t${id}:key`,
      provider,
      model,
      `2026-10-0${index + 1}T10:00:01.000Z`
    )
  })
  return database
}

describe("brand filter", () => {
  it("lists derived brands most used first", () => {
    const stats = getStats(seed(), filters(), null)
    expect(stats.options.brands).toEqual([
      "deepseek",
      "glm",
      "qwen",
    ])
  })

  it("narrows every aggregate to the selected brand", () => {
    const database = seed()
    const all = getStats(database, filters(), null)
    const deepseek = getStats(database, filters({ brand: "deepseek" }), null)

    expect(all.overview.requests).toBe(4)
    expect(deepseek.overview.requests).toBe(2)
    expect(deepseek.overview.errorRate).toBe(0.5)
    // models are keyed by (model, provider): the same id served by two
    // providers stays two rows, both under the same brand.
    expect(deepseek.models.map((row) => row.model)).toEqual([
      "deepseek-v4.1-flash",
      "deepseek-v4.1-flash",
    ])
    expect(deepseek.tools).toHaveLength(1)
    expect(deepseek.tools[0]).toMatchObject({ name: "bash", calls: 2 })
    expect(deepseek.timeseries.reduce((sum, p) => sum + p.requests, 0)).toBe(2)
    expect(
      deepseek.successTimeline.reduce((sum, p) => sum + p.requests, 0)
    ).toBe(2)
    expect(
      deepseek.modelSuccess.reduce((sum, m) => sum + m.requests, 0)
    ).toBe(2)
    // the failing deepseek request sits with provider fengwind; the healthy
    // one with happycoding, so each per-provider series is 0.0% / 100%.
    expect(
      deepseek.modelSuccess.map((row) => row.successRate).sort()
    ).toEqual([0, 1])
  })

  it("merges every provider and model of a brand into one entry", () => {
    const deepseek = getStats(seed(), filters({ brand: "deepseek" }), null)
    expect(deepseek.brandSummary).toHaveLength(1)
    const [brand] = deepseek.brandSummary
    expect(brand).toMatchObject({
      brand: "deepseek",
      requests: 2,
      errors: 1,
      successRate: 0.5,
      providerCount: 2,
      modelCount: 1,
    })
    expect(
      brand!.points.reduce((sum, point) => sum + point.requests, 0)
    ).toBe(2)
  })

  it("lists one entry per brand with no duplicates", () => {
    const stats = getStats(seed(), filters(), null)
    const brands = stats.brandSummary.map((row) => row.brand)
    expect(brands).toHaveLength(new Set(brands).size)
    expect(brands.sort()).toEqual(["deepseek", "glm", "qwen"])
    const total = stats.brandSummary.reduce((sum, row) => sum + row.requests, 0)
    expect(total).toBe(stats.overview.requests)
  })

  it("ranks brands by success rate and keeps the totals consistent", () => {
    const stats = getStats(seed(), filters(), null)
    // deepseek 2 req / 1 err = 50%; glm and qwen are 1/1 = 0% and tie on
    // requests, so the stable sort keeps their input order.
    expect(stats.brandSummary.map((row) => row.brand)).toEqual([
      "deepseek",
      "glm",
      "qwen",
    ])
    for (const row of stats.brandSummary) {
      expect(row.requests).toBeGreaterThan(0)
      expect(row.successRate).toBe(
        1 - row.errors / row.requests
      )
    }
  })

  it("groups the same model id across providers under one brand", () => {
    const stats = getStats(seed(), filters({ brand: "deepseek" }), null)
    expect(stats.providers.map((row) => row.provider).sort()).toEqual([
      "fengwind",
      "happycoding",
    ])
  })

  it("combines with the provider filter", () => {
    const stats = getStats(
      seed(),
      filters({ brand: "deepseek", provider: "happycoding" }),
      null
    )
    expect(stats.overview.requests).toBe(1)
    expect(stats.overview.errorRate).toBe(0)
  })

  it("keeps the brand menu stable under an active brand", () => {
    expect(getStats(seed(), filters({ brand: "glm" }), null).options.brands).toEqual([
      "deepseek",
      "glm",
      "qwen",
    ])
  })

  it("returns nothing for a brand with no rows", () => {
    const stats = getStats(seed(), filters({ brand: "kimi" }), null)
    expect(stats.overview.requests).toBe(0)
    expect(stats.models).toHaveLength(0)
  })
})

describe("provider timeline", () => {
  it("splits a brand into one series per provider", () => {
    const stats = getStats(seed(), filters({ brand: "deepseek" }), null)
    expect(stats.providerTimeline.map((row) => row.provider).sort()).toEqual([
      "fengwind",
      "happycoding",
    ])
    const happy = stats.providerTimeline.find(
      (row) => row.provider === "happycoding"
    )
    expect(happy).toMatchObject({ requests: 1, errors: 0, successRate: 1 })
    const fengwind = stats.providerTimeline.find(
      (row) => row.provider === "fengwind"
    )
    expect(fengwind).toMatchObject({ requests: 1, errors: 1, successRate: 0 })
  })

  it("keeps the per-provider series consistent with the brand total", () => {
    for (const brand of ["deepseek", "qwen", "glm"]) {
      const stats = getStats(seed(), filters({ brand }), null)
      const providerRequests = stats.providerTimeline.reduce(
        (sum, row) => sum + row.requests,
        0
      )
      const providerErrors = stats.providerTimeline.reduce(
        (sum, row) => sum + row.errors,
        0
      )
      expect(providerRequests).toBe(stats.overview.requests)
      expect(providerErrors).toBe(
        Math.round(stats.overview.requests * stats.overview.errorRate)
      )
      const brandRow = stats.brandSummary[0]!
      expect(brandRow.requests).toBe(providerRequests)
      expect(brandRow.errors).toBe(providerErrors)
    }
  })

  it("aggregates each provider across the brand's models", () => {
    const database = seed()
    // Second deepseek model on the same provider must join the same series.
    database
      .prepare(
        `INSERT INTO requests (id, source_key, request_key, file_path, session_id,
          accounting_session_id, cwd, timestamp, provider, model, input_tokens,
          cache_read_tokens, total_tokens, cost, is_error, duration_ms)
         VALUES ('r5', 'r5:key', 'r5:request', '/s.jsonl', 's', 's', '/work/p',
          '2026-10-05T10:00:00.000Z', 'happycoding', 'deepseek-v4.1', 10, 0, 10, 0, 0, 100)`
      )
      .run()
    const stats = getStats(database, filters({ brand: "deepseek" }), null)
    const happy = stats.providerTimeline.find(
      (row) => row.provider === "happycoding"
    )
    expect(happy?.requests).toBe(2)
    expect(stats.providerTimeline).toHaveLength(2)
  })
})
