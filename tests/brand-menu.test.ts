import { describe, expect, it } from "vitest"

import { brandFilterApplied, brandMenu } from "../src/lib/brands.ts"
import type { StatsResponse } from "../src/types.ts"

function payload(overrides: Partial<StatsResponse> = {}): StatsResponse {
  return {
    meta: { lastSyncAt: null, indexedFiles: 1, indexedSessions: 1 },
    filters: { range: "all", project: "", brand: "", provider: "", model: "" },
    options: {
      projects: [],
      brands: [],
      providers: [],
      models: [],
    },
    overview: {
      requests: 0,
      errorRate: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheRate: 0,
      cost: 0,
      averageDurationMs: 0,
    },
    timeseries: [],
    successTimeline: [],
    modelSuccess: [],
    providers: [],
    projects: [],
    tools: [],
    skills: [],
    models: [],
    hiddenModels: [],
    ...overrides,
  } as unknown as StatsResponse
}

const modelRow = (model: string, provider: string, requests: number) => ({
  model,
  provider,
  requests,
  cost: 0,
  tokens: 0,
  errors: 0,
  cacheRate: 0,
})

describe("brand menu", () => {
  it("uses the server list when present", () => {
    const data = payload({
      options: {
        projects: [],
        brands: ["deepseek", "glm"],
        providers: [],
        models: ["glm-5.3", "deepseek-v4.1-flash"],
      },
    } as unknown as Partial<StatsResponse>)
    expect(brandMenu(data)).toEqual(["deepseek", "glm"])
  })

  it("derives the list when the server predates the brand filter", () => {
    const data = payload({
      options: {
        projects: [],
        providers: ["happycoding"],
        models: [
          "deepseek-v4.1-flash",
          "z-ai/glm-5.3",
          "Qwen/Qwen3.8-Flash-Next",
          "minimax-m3.1-flash",
        ],
      },
      models: [
        modelRow("deepseek-v4.1-flash", "happycoding", 500),
        modelRow("z-ai/glm-5.3", "pm", 70),
        modelRow("Qwen/Qwen3.8-Flash-Next", "cc", 300),
        modelRow("minimax-m3.1-flash", "lucky", 10),
      ],
    } as unknown as Partial<StatsResponse>)
    expect(brandMenu(data)).toEqual(["deepseek", "qwen", "glm", "minimax"])
  })

  it("orders by aggregate usage across providers", () => {
    const data = payload({
      options: {
        projects: [],
        providers: [],
        models: ["deepseek-v4.1-flash", "glm-5.3"],
      },
      models: [
        modelRow("deepseek-v4.1-flash", "a", 10),
        modelRow("deepseek-v4.1-flash", "b", 10),
        modelRow("glm-5.3", "c", 15),
      ],
    } as unknown as Partial<StatsResponse>)
    expect(brandMenu(data)).toEqual(["deepseek", "glm"])
  })

  it("hides unknown brands and survives an empty payload", () => {
    expect(
      brandMenu(
        payload({
          options: {
            projects: [],
            providers: [],
            models: ["foobar-1.0"],
          },
        } as unknown as Partial<StatsResponse>)
      )
    ).toEqual(["foobar"])
    expect(brandMenu(null)).toEqual([])
  })
})

describe("brand filter support", () => {
  it("treats an empty request as applied", () => {
    expect(brandFilterApplied(payload(), "")).toBe(true)
  })

  it("detects a server that echoed the brand back", () => {
    const data = payload({
      filters: {
        range: "all",
        project: "",
        brand: "glm",
        provider: "",
        model: "",
      },
    } as unknown as Partial<StatsResponse>)
    expect(brandFilterApplied(data, "glm")).toBe(true)
  })

  it("detects a server that ignored the brand parameter", () => {
    const legacy = {
      ...payload(),
      filters: { range: "all", project: "", provider: "", model: "" },
    } as unknown as StatsResponse
    expect(brandFilterApplied(legacy, "glm")).toBe(false)
  })

  it("does not claim support when no payload has arrived", () => {
    expect(brandFilterApplied(null, "glm")).toBe(false)
  })
})
