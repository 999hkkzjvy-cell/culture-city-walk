# Cultural Citywalk

一个以城市文化、主题滤镜和路线时间轴为核心的私人城市漫游助手。

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
- 高德 JS 地图、高德 Web Service 代理、必去地点搜索、沿途 POI 搜索和步行复核
- DeepSeek Edge Function 代理，支持规划意图解析、候选排序和 AI 用量记录
- 顶部导航统一为：首页、开始规划、我的路线、推荐路线、关于我们、如何使用
- 多城市规划会在切换城市时清空旧城市路线预览；本地候选种子仅用于南京，同城高德 POI 未返回时不会展示南京候选
- 路线详情页可进入 `/journey/?id=...` 途中模式，按站点查看路线概览、深读内容、打卡任务，并将打卡图压缩后存入本地设备

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

已实现的 Edge Functions：

- `share-route`：读取只读分享路线。
- `amap-proxy`：代理高德 Web 服务，支持 POI 关键字搜索与步行路线规划。
- `deepseek-proxy`：代理 DeepSeek JSON 输出，用于规划意图解析和候选点排序。

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
supabase secrets set DEEPSEEK_API_KEY=你的DeepSeekKey DEEPSEEK_MODEL=deepseek-v4-flash
```

然后部署函数，并在 GitHub Pages 环境变量中把
`NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED` 设为 `true`。登录用户触发规划解析和候选排序时，会把 token、耗时、估算成本和 prompt 版本写入 `route_ai_runs`：

```bash
supabase functions deploy deepseek-proxy
```

账号功能：

- 导航栏右侧显示登录入口。
- `/login/` 支持邮箱密码登录与注册。
- `/profile/` 支持修改昵称、所在地、微信号、个人签名和头像图片 URL。
- 个人资料字段由 `20260715000100_profile_details.sql` 迁移扩展。

## 参考资料

产品文档和 UI 参考图保留在 `ignore-files/` 下。

后续 AI 或协作者接手前，建议先读 `docs/ai-project-context.md`。
