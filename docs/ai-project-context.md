# AI 项目上下文

最后更新：2026-07-16

这是后续 AI agent 在修改 Cultural Citywalk 代码库前应优先阅读的文档。它概括产品意图、架构、当前状态和最重要的文件。

## Agent 工作规则

- 在修改产品、数据、认证、Supabase、部署或 UI 前，先阅读本文件。
- 以后项目内各类 Markdown 文档默认使用中文编写，包括 `docs/`、README、提交日志和面向协作者的说明文档。
- 提交信息必须使用中文。
- 每次提交前，更新 `ignore-files/项目提交日志.md`，用中文总结变更；当项目状态、架构、设置或优先级变化时，同步更新本文件。
- `ignore-files/项目提交日志.md` 虽位于被忽略目录下，但需要被追踪，方便后续 agent 快速理解提交历史。除非用户明确要求，不要 force-add `ignore-files/` 下其他文件。
- 首页 hero 标题在 `src/app/page.tsx` 中已故意简化为 `细读一座城`，不要改回早期的问题式标题。

## 产品一句话

Cultural Citywalk 是一个私人城市漫游规划助手，帮助用户通过历史、文学、建筑、音乐、书店、美食和城市记忆细读一座城。产品核心原则是：地理优先、主题增强、AI 协作、事实可核验。路线必须先现实可走，再追求主题丰富。

## 资料来源

- 产品架构：`ignore-files/Citywalk-AI-完整产品与技术架构-v3.md`
- UI 参考：`ignore-files/UI-web.jpg`、`ignore-files/UI-mobile.jpg`
- 提交/变更日志：`ignore-files/项目提交日志.md`
- 阶段 1 审核：`docs/phase-1-audit.md`
- 阶段 2 状态：`docs/phase-2-status.md`
- 阶段 3 状态：`docs/phase-3-status.md`
- 阶段 4/5 状态：`docs/phase-4-5-status.md`
- 待办清单：`docs/todo.md`
- 用户侧设置说明：`README.md`
- Agent 规则：`AGENTS.md`

注意：`ignore-files/` 被 git ignore，但本地保留为产品和设计参考。

## 当前技术形态

- 框架：Next.js App Router、React、TypeScript。
- 部署：静态导出到 GitHub Pages。
- 样式：`src/app/globals.css` 中的纸张/档案风格 design tokens，并使用 `next/font` 加载 Noto Sans SC / Noto Serif SC。
- 测试：Vitest 覆盖纯函数，Playwright 覆盖桌面/移动端冒烟流程。
- 数据：本地 demo/localStorage fallback，加上 Supabase 支持的认证、路线、分享、只读分享查询，以及路线内核/map provider 抽象。
- 图标：`lucide-react`。

## Next.js 注意事项

本项目使用的 Next.js 版本包含相对常见训练资料的破坏性变化。修改 Next.js API、路由、静态导出、字体或图片行为前，必须阅读 `node_modules/next/dist/docs/` 中相关文档。

## 主要路由

- `/`：首页，包含规划模式卡片和精选主题。
- `/plan/`：规划对话和路线摘要。
- `/route/?id=demo`：路线阅读页，优先读取本地保存路线，fallback 到 demo route。
- `/journey/?id=demo`：两栏式路线途中体验页，包含路线概览、站点深读、打卡任务和本地/云端照片归档。
- `/library/`：我的路线工作区。未登录时展示与 `/login/` 一致的邮箱密码登录/注册表单；登录后展示左侧 `我的规划` / `我的收藏` 导航和右侧路线内容。
- `/recommendations/`：推荐路线浏览页，包含城市、主题、节奏和时长筛选。
- `/login/`：Supabase 邮箱密码登录/注册页。
- `/profile/`：个人资料中心，支持昵称、所在地、微信号、签名和头像 URL。
- `/share/?code=...`：通过 Supabase Edge Function 读取的只读分享路线页。
- `/about/`：产品目的和原则。
- `/guide/`：规划、候选、编辑、分享和途中体验的简短使用说明。

由于应用以静态方式导出到 GitHub Pages，动态 route ID 通过 query string 传递，而不是使用动态 App Router segment。

## 关键文件

- `src/app/page.tsx`：首页和精选路线入口。
- `src/app/plan/page.tsx`：规划页壳。
- `src/app/route/page.tsx`：路线阅读页壳。
- `src/app/journey/page.tsx`：路线途中模式页壳。
- `src/app/library/page.tsx`：认证和保存路线归档页。
- `src/app/recommendations/page.tsx`：推荐路线浏览页。
- `src/app/login/page.tsx`：登录/注册页。
- `src/app/profile/page.tsx`：个人资料中心。
- `src/app/share/page.tsx`：分享页。
- `src/app/about/page.tsx`：关于页。
- `src/app/guide/page.tsx`：使用指南页。
- `src/app/globals.css`：设计系统、响应式布局和路线阅读 UI。
- `src/app/layout.tsx`：应用 metadata 和字体加载。
- `src/components/site-header.tsx`：共享顶部导航。
- `src/components/planning-desk.tsx`：核心规划交互。
- `src/components/auth/auth-panel.tsx`：Supabase magic-link 认证 UI。
- `src/components/auth/auth-nav.tsx`：顶部登录/头像入口。
- `src/components/auth/login-form.tsx`：邮箱密码登录/注册表单。
- `src/components/auth/profile-center.tsx`：个人资料编辑。
- `src/components/routes/library-workspace.tsx`：路线库认证门禁、左侧导航和主题筛选。
- `src/components/routes/route-library.tsx`：路线列表与收藏列表。
- `src/components/routes/recommended-routes-explorer.tsx`：推荐路线筛选 UI。
- `src/components/routes/route-cloud-actions.tsx`：保存/分享控制。
- `src/components/routes/route-journey-mode.tsx`：两栏式途中体验页，包含进度、站点深读、打卡任务和照片归档。
- `src/components/routes/route-reader.tsx`：客户端路线阅读页，优先读本地规划预览，fallback 到 demo route，并提供本地编辑控制。
- `src/components/routes/shared-route-reader.tsx`：只读分享路线加载器，并支持把分享路线导入为本地规划副本。
- `src/components/developer-status-panel.tsx`：规划页本地/API 配置状态面板。
- `src/lib/route.ts`：路线类型和 demo route。
- `src/lib/recommended-routes.ts`：`/recommendations/` 使用的静态推荐路线目录。
- `src/lib/route-kernel.ts`：路线时间线、总计和校验纯函数。
- `src/lib/route-candidates.ts`：候选评分、绕行估算、高德 POI 到候选转换、类型推断、去重和 fallback 来源标签。
- `src/lib/route-editing.ts`：候选插入、站点删除、移动、停留时间、路段交通方式、手工路段分钟和估算重算。
- `src/lib/transport.ts`：步行、骑行、公交、驾车和打车的标签与本地估算规则。
- `src/lib/ai/route-collaboration.ts`：结构化 intent、路线 proposal、站点主题内容 schema 和本地 fallback。
- `src/lib/ai/usage-log.ts`：浏览器侧 AI 运行日志，best effort 写入 `route_ai_runs`。
- `src/lib/maps/types.ts`：地图 provider、坐标、POI 和路线段契约。
- `src/lib/maps/amap.ts`：高德 URL helper 和 POI 解析 helper。
- `src/lib/maps/amap-web.ts`：浏览器侧高德 Web Service provider，通过 Supabase `amap-proxy` 调用，不暴露 Web Service key。
- `src/lib/maps/route-candidate-search.ts`：高德沿途候选搜索 helper，包含 POI type code 映射、采样超时和部分失败收集。
- `src/lib/maps/fallback.ts`：本地步行估算 fallback。
- `src/lib/repositories/route-repository.ts`：本地/Supabase 路线 repository；同时持久化候选快照和候选 action，并 upsert 确认 POI 到 `places`。
- `src/lib/repositories/route-cloud-sync.ts`：保存本地路线到 repository、把 demo/local ID 迁移为 Supabase route ID，并同步候选状态。
- `src/lib/repositories/checkin-photo-repository.ts`：打卡图归档 helper；本地 fallback，并可把云端路线照片同步到 Supabase Storage 和 `route_checkin_photos`。
- `src/lib/supabase/client.ts`：浏览器 Supabase client。
- `src/lib/supabase/database.types.ts`：生成/手工维护的数据库类型。
- `src/lib/urls.ts`：静态导出友好的 URL helper。
- `src/lib/storage.ts`：localStorage 草稿、路线预览、候选状态、途中进度、本地打卡图、本地行程存档、本地收藏路线和规划导入来源。
- `src/lib/validation/route-schemas.ts`：Zod URL/input 校验。

## Supabase 状态

远端项目：

- 名称：`culture-city-walk`
- Project ref：`wedwvcmdbrnbzjwlllgl`
- Region：`ap-southeast-1`
- URL：`https://wedwvcmdbrnbzjwlllgl.supabase.co`

已实现：

- 迁移：`supabase/migrations/20260713000100_phase2_routes_auth.sql`
- 迁移：`supabase/migrations/20260714000100_phase4_candidates_ai_runs.sql`
- 迁移：`supabase/migrations/20260715000100_profile_details.sql`
- 迁移：`supabase/migrations/20260715000200_route_checkin_photos.sql`
- 迁移：`supabase/migrations/20260716000100_places_source_place_id_unique.sql`
- 表：`profiles`、`places`、`routes`、`route_stops`、`route_constraints`、`route_snapshots`、`route_shares`、`route_candidates`、`route_ai_runs`、`route_checkin_photos`
- Storage bucket：私有 `route-media`
- RLS：路线数据 owner-only。
- Edge Function：`share-route`
- Edge Function：`amap-proxy`，用于高德 POI 关键字搜索、周边搜索、步行/公交/驾车路线代理。`AMAP_WEB_SERVICE_KEY` 只能放在 Supabase Function secrets 中。
- Edge Function：`deepseek-proxy`，用于 DeepSeek JSON-mode intent 解析、候选排序和站点深读。`DEEPSEEK_API_KEY` 只能放在 Supabase Function secrets 中。
- 种子脚本：`supabase/seed.sql`
- 公共种子分享码：`nanjing-minguo`
- 种子分享 URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/share/?code=nanjing-minguo`

`share-route` 使用 `verify_jwt=false` 部署，因为公开分享链接通过分享码、过期时间和撤销状态在函数体中控制访问。

`amap-proxy` 已在 2026-07-16 重新部署。`route_checkin_photos` 迁移已由用户在 Supabase 网站端部署，私有 bucket `route-media` 也已由用户登录网站端确认存在。2026-07-16 线上保存路线曾因 `places` 表缺少 PostgREST 可识别的 `(source, source_place_id)` 唯一约束而失败，已新增并在线执行 `20260716000100_places_source_place_id_unique.sql`。同日已执行 Supabase migration repair：将本地迁移 `20260713000100`、`20260714000100`、`20260715000100`、`20260715000200`、`20260716000100` 标记为已应用，并将远端孤立版本 `20260713174555` 标记为已回退；`supabase migration list --linked` 已显示本地与远端迁移历史对齐。线上排查发现 `route_candidates` 和 `route_ai_runs` 远端表实际缺失，已补执行 `20260714000100_phase4_candidates_ai_runs.sql` 并刷新 PostgREST schema cache。`supabase db push --linked --yes --dry-run` 在远端 schema diff 阶段长时间无输出后被中断，未发现新的迁移历史不一致输出。2026-07-16 线上真实冒烟已通过云端路线保存、分享生成、分享打开、分享撤销、云端打卡图上传、签名 URL 预览、刷新后读取和删除。

## 认证行为

- 旧同步认证面板位于 `/library/`，调用 `supabase.auth.signInWithOtp`。
- 顶部导航提供 `/login/` 和 `/profile/`。
- `/login/` 支持邮箱密码登录/注册。
- `/profile/` 更新 `profiles.display_name`、`avatar_url`、`location`、`wechat_id` 和 `bio`。
- 注册和登录复用同一套流程。
- Supabase JS 在浏览器中持久化 session。
- 登录后，用户可以保存 demo 路线、列出自己的云端路线并生成分享链接。路线页和路线库的保存动作会使用当前本地编辑后的路线预览。
- 2026-07-16 线上邮箱密码注册登录已通过，可直接进入 `/profile/`；当前生产注册没有强制邮件确认，因此本次烟测未触发邮件确认链接回跳。

Supabase Auth URL 必须允许 GitHub Pages 回跳：

- Site URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/`
- Redirect URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/**`
- 本地 Redirect URL：`http://localhost:3000/**`

## 环境变量

本地 `.env.local` 被 git 忽略。`.env.example` 记录预期变量。

客户端变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AMAP_JS_KEY`：浏览器高德 JS 地图展示。
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`：当高德 JS key 需要安全密钥时使用。
- `NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED`：设为 `true` 后前端调用 `deepseek-proxy`。
- `NEXT_PUBLIC_BASE_PATH`：GitHub Actions Pages 构建时设置。

服务端 / Edge Function 变量：

- `SUPABASE_SERVICE_ROLE_KEY`
- `SHARE_ALLOWED_ORIGINS`
- `AMAP_WEB_SERVICE_KEY`：provider-backed POI、步行、公交、驾车/打车路线代理。
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`，默认 `deepseek-v4-flash`
- `AI_DAILY_USER_LIMIT`
- `AI_PROJECT_COST_LIMIT_CNY`

不要把 service role key、DeepSeek key 或高德 Web Service key 暴露在前端环境变量或提交文件中。

GitHub Actions Pages 构建需要的 repository variables：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_AMAP_JS_KEY`
- `NEXT_PUBLIC_AMAP_SECURITY_JS_CODE`
- `NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED`

## 当前 UX 状态

- 首页 hero 标题为 `细读一座城`，精选卡链接到种子南京路线。
- 顶部导航统一为六项：`首页`、`开始规划`、`我的路线`、`推荐路线`、`关于我们`、`如何使用`。
- `/library/` 未登录时展示邮箱密码登录/注册卡片；登录后为左侧 `我的规划` / `我的收藏` 和右侧内容区，并支持多选主题筛选。
- `/recommendations/` 是两栏式推荐路线浏览页，左侧支持城市文本、主题、节奏和时长筛选。
- 分享链接是直接 URL，暂不提供手工输入分享码 UI；等小红书/海报/口令分享用例明确后再评估。线上分享页读取 `share-route` 的前端超时为 15 秒，避免 Edge Function 冷启动或跨区访问超过 2.5 秒时误显示“分享链接不可用”。
- 路线阅读页显示路段来源，可渲染高德 JS 地图、站点 marker、provider/estimated polyline，并可通过 `amap-proxy` 复核步行、公交、驾车/打车路段。地图只读取路线中的坐标；确认站点和候选 POI 会在路线/候选保存时单独持久化到 `places`。
- `/plan/` Complete 模式可生成 10-15 个沿途候选，按绕行和主题适配评分，并支持加入、备用、忽略。候选生成会采样路线站点、中点和 provider polyline 点，通过高德附近 POI 搜索后映射成路线候选。单个采样点失败不再导致整个候选生成 fallback。
- 高德候选会按类别筛选，未知 POI 不兜底成景点，超市/便利店等会被排除，与已选站点距离近且名称相近的重复 POI 会被过滤。高德返回的开放时间、电话、评分、人均会保留；缺少开放时间会显示为待核验风险。
- 规划页必须从 provider 结果选择出发/必去/终点；自由文本手工添加按钮已移除，按 Enter 会触发高德搜索。规划流程包含起始时间和可选含餐问题。含餐时自动纳入餐厅候选，并把人数、人均、菜系和一句话路线目标交给 AI/本地排序；餐厅候选明确排除奶茶/茶饮/冷饮、咖啡馆、面包烘焙和甜品店。路线标题会基于城市、主题、站点和目标生成。
- 候选插入会更新可编辑路线预览，并重新计算路段、结束时间、移动/删除/停留时间控制。候选列表支持类型筛选、适配分组和折叠窄行卡片。路线预览和候选 action 保存到 localStorage。
- 保存本地/demo 路线到云端后，会把 Supabase 返回的 route ID 写回 localStorage，使后续分享、快照和候选操作指向云端路线而不是旧 `demo`。
- 路线支持 `步行`、`骑行`、`公共交通`、`驾车`、`打车`。高德复核会尝试步行、公交、驾车/打车；骑行和失败路段保留本地估算或手工覆盖。
- 站点带显式 `routeRole`。用户添加为 `出发` 或 `终点` 的站点不设置停留、深读或打卡；`必去` 和沿途候选即使被移动到首尾，也继续保留停留、深读和打卡。开放时间在规划/阅读页展示，可识别的到达时间冲突会标红。
- DeepSeek 启用时，体验站点可生成更长的建筑、历史、城市记忆、核验建议和打卡任务；失败或未启用时使用未核验模板 fallback。
- `/journey/` 是两栏途中模式：左侧路线概览，右侧选中站点深读、打卡任务、实践提示、高德导航、到达/跳过和打卡图上传。图片先压缩后存入 localStorage；云端 UUID 路线且用户登录时，会同步到私有 `route-media` 和 `route_checkin_photos`。云端打卡图记录 id 必须使用 UUID，以匹配 `route_checkin_photos.id` 类型。到显式终点后完成路线会保存本地行程存档，并展示最近完成记录、分数、到达站点数、打卡图数量和完成时间。
- 途中模式只按体验站点统计进度。到显式终点后，可完成路线并按到达站点和上传打卡图生成分数与夸夸文案，本地行程存档会持久保留。
- 路线详情页收藏按钮有可见的本地 `已收藏` 状态。分享路线展示深读文案但不展示打卡任务，并可本地收藏。路线库 `我的收藏` 读取本地收藏，并提供 `查看` 和 `修改`；收藏夹“修改”和分享页“修改为我的路线”都会导入为本地规划副本，规划页会提示来源，并说明修改不会覆盖原分享或原收藏。本地导入副本使用 `local-import-*` id，保存到云端时必须按新路线插入；只有真实 Supabase UUID 才能进入云端分享、快照、打卡图和更新路径。
- 云端保存、路线列表、删除、快照、分享和打卡图上传共用 `mapCloudError` 映射，错误提示会区分未登录、Supabase 未配置、会话失效、RLS/权限、Storage bucket、数据库表/字段缺失、网络超时和兜底失败。
- AI 协作在 `NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED=true` 时调用 `deepseek-proxy`；否则使用确定性本地 fallback。登录用户的 intent 解析和候选排序会记录到 `route_ai_runs`，包括 prompt 版本、model、token、耗时、估算成本和幂等键。用量限制尚未执行。
- 认证 MVP 已存在：顶部登录/头像入口、`/login/` 邮箱密码登录/注册、`/profile/` 个人资料编辑、登录后的云端路线保存/列表/分享。撤销分享现在删除记录并从列表移除，不保留已撤销分享码。
- 移动端字体和路线阅读布局已向参考图靠近。路线阅读页移动端保留地图和时间线关联，但仍不是最终现场导航形态。
- UI 还未完全像素级还原设计图。已知缺口：首页模式卡仍是线性图标，规划页移动端摘要还不是 mock 中右侧纸卡。

## 验证命令

提交重要变更前运行：

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run e2e
```

备注：

- 当前环境中，`npm run build` 可能需要网络权限，因为 Next/Turbopack 会拉取 Google Fonts。
- `npm run e2e` 会启动或复用本地 dev server。
- GitHub Pages workflow 会运行单元测试、Playwright、静态构建和部署。
- 2026-07-16 已完成 GitHub Pages 线上真实冒烟：公开页面 8 个、公开分享页 `nanjing-minguo`、南京/上海高德 POI 与沿途候选、分享收藏后导入规划副本、邮箱密码注册登录、云端保存、生成/打开/撤销分享、云端打卡图上传/签名预览/刷新读取/删除、烟测路线删除。

## 开发优先级

近期方向：

- 阶段 3：更好的地图视野行为和视情况补 provider-backed 骑行 API。
- 阶段 4/5：提升路线采样候选质量、加强高德元数据之外的事实核验、基于 `route_ai_runs` 执行用户/项目 AI 用量限制。
- 阶段 2 收尾：认证 redirect 验证、更清晰的 auth UX、登录后的本地草稿迁移、路线归档空态、头像上传。
- 继续改善移动端与 `ignore-files/UI-mobile.jpg` 的一致性。
- 在部署策略改变前，继续遵守静态导出限制。

## 守护规则

- Supabase 未配置时必须保留本地 fallback。
- 不要破坏 GitHub Pages 静态导出。
- 不要把 secrets 写入提交文件或前端环境变量。
- 私有路线继续保持 RLS owner-only。
- 不要假设种子数据应出现在用户 `/library/`；它主要用于公开分享页验证。
