import { BoxIcon, CoinsIcon, DatabaseIcon, SparklesIcon } from "lucide-react"

import { BrandBreakdown } from "@/components/dashboard/BrandBreakdown"
import { ModelsTable } from "@/components/dashboard/DataPanels"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { ModelSuccessRateChart } from "@/components/dashboard/ModelSuccessRateChart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"
import type { StatsResponse } from "@/types"

interface ModelAction {
  provider: string
  model: string
}

export function ModelsPage({
  data,
  hidingModel,
  showingModel,
  deletingModel,
  onHide,
  onShow,
  onDelete,
}: {
  data: StatsResponse
  hidingModel: ModelAction | null
  showingModel: ModelAction | null
  deletingModel: ModelAction | null
  onDelete: (provider: string, model: string) => Promise<void>
  onHide: (provider: string, model: string) => Promise<void>
  onShow: (provider: string, model: string) => Promise<void>
}) {
  const { messages: t, format } = useI18n()
  const activeModelProviders = new Set(
    data.models.map((model) => model.provider)
  ).size
  const topTokenModel = data.models.toSorted(
    (left, right) => right.tokens - left.tokens
  )[0]
  const topCostModel = data.models.toSorted(
    (left, right) => right.cost - left.cost
  )[0]
  const topTokenShare = data.overview.totalTokens
    ? (topTokenModel?.tokens ?? 0) / data.overview.totalTokens
    : 0

  // A brand choice must read as one series covering every model and provider of
  // that brand, not as one series per provider/model pair.
  const selectedBrand = data.filters?.brand ?? ""
  const brandSeries = (data.brandSummary ?? [])
    .filter((entry) => !selectedBrand || entry.brand === selectedBrand)
    .map((entry) => ({
      provider: "",
      model: entry.brand,
      requests: entry.requests,
      errors: entry.errors,
      successRate: entry.successRate,
      points: entry.points,
    }))
  const series = selectedBrand
    ? brandSeries
    : (data.modelSuccess ?? [])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t.activeModels}
          value={format.number(data.models.length)}
          detail={t.providerCount(
            format.number(activeModelProviders),
            activeModelProviders
          )}
          icon={BoxIcon}
        />
        <MetricCard
          label={t.topTokens}
          value={format.percent(topTokenShare)}
          detail={topTokenModel?.model ?? t.noActivity}
          icon={SparklesIcon}
        />
        <MetricCard
          label={t.topCost}
          value={format.currency(topCostModel?.cost ?? 0)}
          detail={topCostModel?.model ?? t.noActivity}
          icon={CoinsIcon}
        />
        <MetricCard
          label={t.cacheReadRate}
          value={format.percent(data.overview.cacheRate)}
          detail={t.tokensRead(
            format.compact(data.overview.cacheReadTokens),
            data.overview.cacheReadTokens
          )}
          icon={DatabaseIcon}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t.successRateByBrand}</CardTitle>
          <CardDescription>{t.successRateByBrandDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandBreakdown rows={data.brandSummary} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.successRateByModel}</CardTitle>
          <CardDescription>{t.successRateByModelDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ModelSuccessRateChart
            data={series}
            fallback={data.models}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t.models}</CardTitle>
          <CardDescription>{t.modelDetails}</CardDescription>
        </CardHeader>
        <CardContent>
          <ModelsTable
            rows={data.models}
            hiddenRows={data.hiddenModels}
            hidingModel={hidingModel}
            showingModel={showingModel}
            deletingModel={deletingModel}
            onDelete={onDelete}
            onHide={onHide}
            onShow={onShow}
            modelSuccess={data.modelSuccess}
          />
        </CardContent>
      </Card>
    </div>
  )
}
