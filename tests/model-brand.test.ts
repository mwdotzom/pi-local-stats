import { describe, expect, it } from "vitest"

import { modelBrand, normaliseModelId, sortBrands } from "../server/model-brand.ts"

describe("model brand derivation", () => {
  it.each([
    ["deepseek-v4.1-flash", "deepseek"],
    ["DeepSeek-V4-Flash[free]", "deepseek"],
    ["deepseek-ai/DeepSeek-V4.1-Flash-1017", "deepseek"],
    ["deepseek-ai/deepseek-v4-flash-0731", "deepseek"],
    ["ft-256k/deepseek-v4.1-flash", "deepseek"],
    ["deepseek/deepseek-v4.1-flash", "deepseek"],
    ["Qwen/Qwen3.8-Flash-Next", "qwen"],
    ["qwen3.8-flash", "qwen"],
    ["qwen3.8-flash-next-262k", "qwen"],
    ["qwen/qwen3.8-flash-next", "qwen"],
    ["glm-5.3", "glm"],
    ["glm-5.3-200k", "glm"],
    ["z-ai/glm-5.3-flash", "glm"],
    ["chatglm-4", "glm"],
    ["moonshotai/kimi-k3", "kimi"],
    ["kimi-k3", "kimi"],
    ["minimax-m3.1-flash", "minimax"],
    ["mimo-v2.6-flash", "mimo"],
    ["grok-4.6", "grok"],
    ["grok-4.7", "grok"],
    ["gpt-5.6-sol", "gpt"],
    ["o3-mini", "gpt"],
    ["claude-sonnet-4.6", "claude"],
    ["gemini-3.8-flash", "gemini"],
    ["llama-4-scout", "llama"],
    ["mistral-large", "mistral"],
  ])("maps %s to %s", (model, brand) => {
    expect(modelBrand(model)).toBe(brand)
  })

  it("falls back to the leading token for unknown families", () => {
    expect(modelBrand("foobar-1.0")).toBe("foobar")
  })

  it("reports unknown instead of inventing a brand", () => {
    expect(modelBrand("")).toBe("unknown")
    expect(modelBrand("unknown")).toBe("unknown")
    expect(modelBrand("1234")).toBe("unknown")
    expect(modelBrand("///")).toBe("unknown")
  })

  it("strips bracket suffixes and routing path prefixes", () => {
    expect(normaliseModelId("DeepSeek-V4-Flash[free]")).toBe(
      "deepseek-v4-flash"
    )
    expect(normaliseModelId("openrouter/anthropic/claude-sonnet-4.6")).toBe(
      "claude-sonnet-4.6"
    )
    expect(normaliseModelId("glm-5.3(200k)")).toBe("glm-5.3")
  })

  it("orders brands by usage and hides unknown", () => {
    expect(
      sortBrands([
        { brand: "glm", requests: 10 },
        { brand: "deepseek", requests: 100 },
        { brand: "unknown", requests: 500 },
        { brand: "kimi", requests: 10 },
      ])
    ).toEqual(["deepseek", "glm", "kimi"])
  })
})
