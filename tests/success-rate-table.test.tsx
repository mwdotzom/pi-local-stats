import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ModelsTable } from "../src/components/dashboard/DataPanels.tsx"
import { catalogs, I18nProvider } from "../src/lib/i18n.tsx"

const points = [
  { date: "2026-09-01", requests: 10, errors: 0, successRate: 1 },
  { date: "2026-09-02", requests: 10, errors: 5, successRate: 0.5 },
  { date: "2026-09-03", requests: 0, errors: 0, successRate: null },
]

function render(modelSuccess?: unknown[]) {
  return renderToStaticMarkup(
    <I18nProvider>
      <ModelsTable
        rows={[
          {
            provider: "provider",
            model: "model",
            requests: 20,
            tokens: 100,
            cost: 1,
            errors: 5,
            cacheRate: 0.5,
          },
        ]}
        hiddenRows={[]}
        hidingModel={null}
        showingModel={null}
        deletingModel={null}
        onHide={async () => {}}
        onShow={async () => {}}
        onDelete={async () => {}}
        modelSuccess={
          modelSuccess as never
        }
      />
    </I18nProvider>
  )
}

describe("model success rate column", () => {
  it("shows the success rate and a per-day strip when a timeline exists", () => {
    const markup = render([
      {
        provider: "provider",
        model: "model",
        requests: 20,
        errors: 5,
        successRate: 0.75,
        points,
      },
    ])
    expect(markup).toContain("75.00%")
    expect(markup).toContain("Success rate")
    expect(markup).toContain('role="img"')
    expect(markup).toContain("bg-red-500")
    expect(markup).toContain("bg-emerald-500")
  })

  it("falls back to the request counters when no timeline is available", () => {
    const markup = render()
    expect(markup).toContain("75.00%")
    expect(markup).not.toContain('role="img"')
  })

  it("marks a model without requests as unmeasurable", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider>
        <ModelsTable
          rows={[
            {
              provider: "provider",
              model: "model",
              requests: 0,
              tokens: 0,
              cost: 0,
              errors: 0,
              cacheRate: 0,
            },
          ]}
          hiddenRows={[]}
          hidingModel={null}
          showingModel={null}
          deletingModel={null}
          onHide={async () => {}}
          onShow={async () => {}}
          onDelete={async () => {}}
        />
      </I18nProvider>
    )
    expect(markup).toContain("—")
    expect(markup).not.toContain("NaN")
  })

  it("keeps the English and French catalogs aligned", () => {
    expect(catalogs.en.messages.successRateSignal).toBe("Success rate")
    expect(catalogs.fr.messages.successRateSignal).toBe("Taux de réussite")
  })
})
