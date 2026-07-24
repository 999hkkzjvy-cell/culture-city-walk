# Cultural Citywalk

一个以主题路线、可信知识和现场陪伴为核心的城市文化伴游。

## 当前阶段

阶段 1/2 已完成，阶段 3/4/5 的 MVP 能力已开始贯通：Supabase
保存分享、高德地图/POI/步行代理、沿途候选补点、DeepSeek 规划协作和路线阅读编辑已具备本地 fallback。

- Next.js App Router + TypeScript
- 静态导出，适配 GitHub Pages
- 首页、规划页、路线阅读页、路线途中模式页、路线库、推荐路线页
- localStorage 草稿保存与恢复
- Vitest 纯函数测试
- Playwright 桌面与移动端冒烟测试
- GitHub Pages workflow
- Supabase migration、RLS、邮箱登录、我的路线、云端保存、快照与分享管理
- 高德 JS 地图、高德 Web Service 代理、真实 POI 必去点搜索、沿途 POI 搜索、真实绕行复核、规划页候选插入地图预览、时间线选中站点地图高亮，以及步行/公交/驾车/打车复核
- DeepSeek Edge Function 代理，支持规划意图解析、候选排序、资料驱动的导游式深读与现场问答
- 顶部导航收拢为：探索路线、规划路线、我的路线；关于与使用说明位于页脚
- 多城市规划会在切换城市时清空旧城市路线预览；本地候选种子仅用于南京，同城高德 POI 未返回时不会展示南京候选
- 南京探索页展示三条待人工审核的主题路线编辑稿，以及一条本地可直接开始的现场验证版“人间烟火：一座城市的日常”；后者保留 0725 的 13 个站点、固定时间与离线导览卡，部署和真实走测通过前不视为永久发布
- 规划页已移除自由手工添加地点；出发、必去、终点都需要从高德搜索结果中选择真实 POI。默认生成 5–6 个可调整项；餐厅最多保留 3 个候选，并用绕行、时段、预算、菜系、营业状态和实际返回的高德评分解释选择
- 开放时间提示支持多时间段、跨夜、星期规则和具体日期例外；深读会显示资料状态、来源、检索时间及百度检索统计，资料不足时不会虚构事实补足内容
- 保存路线和候选时会将确认 POI upsert 到 `places`，并持久化路线校验快照；路线途中打卡图会先本地存档，云端路线登录后同步到 `route-media`

## 本地开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
npm run e2e
```

## Supabase

数据库迁移在 `supabase/migrations/` 下。复制 `.env.example` 为 `.env.local` 后，填入：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（仅 Edge Function 使用）
- `NEXT_PUBLIC_AMAP_JS_KEY`（浏览器地图展示用）
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`（高德 JS API 安全密钥；对应 Key 需要时填写）
- `AMAP_WEB_SERVICE_KEY`（仅 `amap-proxy` Edge Function 使用）
- `NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED`（公开开关，设为 `true` 后前端调用 DeepSeek 代理）
- `DEEPSEEK_API_KEY`（仅 `deepseek-proxy` Edge Function 使用）
- `DEEPSEEK_MODEL`（默认 `deepseek-v4-flash`）
- `BAIDU_AI_SEARCH_API_KEY`（仅 Edge Function 使用；用于在站点深读前检索政府、场馆、档案/学术与权威媒体资料）

已实现的 Edge Functions：

- `share-route`：读取只读分享路线。
- `amap-proxy`：代理高德 Web 服务，支持 POI 关键字/周边搜索、步行、公交和驾车路线规划。
- `deepseek-proxy`：代理 DeepSeek JSON 输出，用于规划意图、候选点排序、路线命名、现场问答和“资料检索后”的站点深读。站点深读会分别检索官方沿革、人物故事、建筑/人文主题，再把筛选后的来源摘要、链接和检索时间交给 DeepSeek；页面可显示百度检索次数、返回量和采用量。仅有地图或文化文章资料时内容会降为资料有限版。

部署高德代理时，先在 Supabase Secrets 中设置：

```bash
supabase secrets set AMAP_WEB_SERVICE_KEY=你的高德Web服务Key
```

然后部署函数：

```bash
supabase functions deploy amap-proxy
```

部署 DeepSeek 代理时，先在 Supabase Secrets 中设置：

```bash
supabase secrets set DEEPSEEK_API_KEY=你的DeepSeekKey DEEPSEEK_MODEL=deepseek-v4-flash BAIDU_AI_SEARCH_API_KEY=你的百度AI搜索Key
```

然后部署函数，并在 GitHub Pages 环境变量中把
`NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED` 设为 `true`。登录用户触发规划解析、候选排序和路线标题生成时，会把 token、耗时、估算成本和 prompt 版本写入 `route_ai_runs`。`deepseek-proxy` 代码支持 `AI_DAILY_USER_LIMIT` 和 `AI_PROJECT_COST_LIMIT_CNY`，配置后需重新部署函数并做线上烟测：

```bash
supabase functions deploy deepseek-proxy
```

### 精选路线深读审核稿

下面的命令会使用已部署的 `deepseek-proxy` 为“人间烟火：一座城市的日常”逐站生成深读和两项现场任务，输出到 `docs/review-drafts/`。它只生成供人工审核的 JSON 与 Markdown，不替换正式路线内容、不提交也不发布。执行前确保本地 `.env.local` 中存在 Supabase 浏览器配置：

```bash
set -a; source .env.local; set +a
npm run generate:curated-review -- --execute
npm run generate:curated-review -- --render
npm run audit:curated-review
```

审核清单会阻止资料不足、文化类来源被误标为事实、传说未标注或篇幅不符合要求的站点进入正式稿。

账号功能：

- 导航栏右侧显示登录入口。
- `/login/` 支持邮箱密码登录与注册。
- `/profile/` 支持修改昵称、所在地、微信号、个人签名和头像图片 URL。
- 个人资料字段由 `20260715000100_profile_details.sql` 迁移扩展。

## 参考资料

产品文档和 UI 参考图保留在 `ignore-files/` 下。

后续 AI 或协作者接手前，建议先读 `docs/ai-project-context.md`。
