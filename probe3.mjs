import { chromium } from "@playwright/test"
const page0 = await chromium.launch()
const page = await page0.newPage({ viewport: { width: 1440, height: 1100 } })
const tl = (rates) => rates.map((r,i) => ({ date: `2026-09-${String(15+i).padStart(2,"0")}`, requests: r===null?0:100, errors: r===null?0:Math.round(100*(1-r)), successRate: r }))
const timeline = tl([0.886,0.932,null,0.961,1,0.835,0.95])
const stats = {
  meta:{lastSyncAt:"2026-09-22T21:41:00Z",indexedFiles:20,indexedSessions:20},
  filters:{range:"all",project:"",provider:"",model:""},
  options:{projects:[],providers:["happycoding","fengwind"],models:["deepseek-v4.1-flash","mimo-v2.6-flash"]},
  overview:{requests:100,errorRate:0.2,totalTokens:1000,cacheReadTokens:500,cacheRate:0.5,cost:1,averageDurationMs:100},
  timeseries: timeline.map(p=>({date:p.date,requests:p.requests,cost:0.1})),
  successTimeline: timeline,
  modelSuccess:[
    {provider:"happycoding",model:"deepseek-v4.1-flash",requests:17940,errors:273,successRate:0.9847881828316609,points:tl([0.99,0.99,0.98,1,0.99,0.98,0.99])},
    {provider:"fengwind",model:"mimo-v2.6-flash",requests:6108,errors:2812,successRate:0.5396463667321558,points:tl([0.55,0.52,0.58,0.51,0.56,0.53,0.54])},
  ],
  providers:[],projects:[],tools:[],skills:[],
  models:[
    {model:"deepseek-v4.1-flash",provider:"happycoding",requests:17940,tokens:3341011674,cost:0,errors:273,cacheRate:0.98},
    {model:"mimo-v2.6-flash",provider:"fengwind",requests:6108,tokens:1793939529,cost:0,errors:2812,cacheRate:0.79},
  ],
  hiddenModels:[],
}
await page.route("**/api/**", r => r.fulfill({ json: stats }))
await page.goto("http://127.0.0.1:4173/models")
await page.waitForTimeout(2500)
const out = await page.evaluate(() => {
  const lines = [...document.querySelectorAll(".recharts-line-curve")]
  const legend = [...document.querySelectorAll("li")].map(li=>li.textContent?.trim()).filter(x=>x&&x.includes("%"))
  const tableCells = [...document.querySelectorAll("td")].map(td=>td.textContent?.trim())
  return {
    lineCount: lines.length,
    strokes: lines.map(l=>l.getAttribute("stroke")),
    hasPath: lines.map(l=>!!l.getAttribute("d")),
    legend,
    tableRates: tableCells.filter(c=>c&&c.endsWith("%")),
    strips: document.querySelectorAll('[role="img"]').length,
  }
})
console.log(JSON.stringify(out, null, 1))
await page.screenshot({ path: "/tmp/models-sr.png", fullPage: true })
await page0.close()
