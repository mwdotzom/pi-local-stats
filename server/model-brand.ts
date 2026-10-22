/**
 * Model brand ("family") derivation.
 *
 * pi session records only carry a provider and a raw model id, e.g.
 * `deepseek-v4.1-flash`, `moonshotai/kimi-k3`, `z-ai/glm-5.3`.
 * The brand is derived from that id so several models of the same family can be
 * filtered together regardless of which provider served them.
 *
 * This is a naming heuristic on the model id alone. It never contacts a
 * registry and it cannot know a brand the id does not name, so unrecognised ids
 * fall back to their leading token and, failing that, to "unknown".
 */

interface BrandRule {
  brand: string
  /** Anchored at the start of the normalised model id. */
  pattern: RegExp
}

/** Ordered: the first matching rule wins. */
const BRAND_RULES: BrandRule[] = [
  { brand: "deepseek", pattern: /^deepseek/ },
  { brand: "qwen", pattern: /^qwen/ },
  { brand: "glm", pattern: /^(glm|chatglm)/ },
  { brand: "kimi", pattern: /^(kimi|moonshot)/ },
  { brand: "minimax", pattern: /^(minimax|abab)/ },
  { brand: "mimo", pattern: /^mimo/ },
  { brand: "grok", pattern: /^grok/ },
  // o1/o3/o4 style ids are OpenAI models without the gpt prefix.
  { brand: "gpt", pattern: /^(gpt|o[1-9])(?![a-z])/ },
  { brand: "claude", pattern: /^(claude|sonnet|opus|haiku)/ },
  { brand: "gemini", pattern: /^(gemini|gemma|palm)/ },
  { brand: "llama", pattern: /^llama/ },
  { brand: "mistral", pattern: /^(mistral|mixtral|codestral|devstral)/ },
  { brand: "phi", pattern: /^phi/ },
  { brand: "doubao", pattern: /^doubao/ },
  { brand: "ernie", pattern: /^ernie/ },
  { brand: "hunyuan", pattern: /^hunyuan/ },
  { brand: "yi", pattern: /^yi-/ },
  { brand: "step", pattern: /^step/ },
  { brand: "command", pattern: /^command/ },
  { brand: "nova", pattern: /^nova/ },
]

/**
 * Reduce a model id to the token the brand rules match against:
 * lower case, without bracket suffixes (`[free]`), routing path prefixes
 * (`z-ai/`, `ft-256k/`) or reseller suffixes.
 */
export function normaliseModelId(model: string): string {
  const withoutBrackets = model.toLowerCase().replace(/[[(][^\])]*[\])]/g, "")
  const segments = withoutBrackets.split("/").filter(Boolean)
  const segment = segments.at(-1) ?? ""
  return segment.replace(/^[^a-z0-9]+/, "")
}

export function modelBrand(model: string): string {
  if (!model) return "unknown"
  const normalised = normaliseModelId(model)
  if (!normalised) return "unknown"
  for (const rule of BRAND_RULES) {
    if (rule.pattern.test(normalised)) return rule.brand
  }
  const leadingToken = normalised.match(/^[a-z]+/)?.[0]
  return leadingToken && leadingToken !== "unknown" ? leadingToken : "unknown"
}

/**
 * Distinct brands, most used first, for the filter menu.
 *
 * Duplicate entries are summed rather than repeated: callers may feed one row
 * per (model, provider) pair, and the menu must still offer each brand exactly
 * once so a single choice covers every provider serving that brand.
 */
export function sortBrands(
  counts: Array<{ brand: string; requests: number }>
): string[] {
  const totals = new Map<string, number>()
  for (const entry of counts) {
    if (!entry.brand || entry.brand === "unknown") continue
    totals.set(entry.brand, (totals.get(entry.brand) ?? 0) + entry.requests)
  }
  return [...totals]
    .toSorted(
      ([leftBrand, leftRequests], [rightBrand, rightRequests]) =>
        rightRequests - leftRequests || leftBrand.localeCompare(rightBrand)
    )
    .map(([brand]) => brand)
}
