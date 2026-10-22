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
