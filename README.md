# Cultural Citywalk

一个以城市文化、主题滤镜和路线时间轴为核心的私人城市漫游助手。

## 当前阶段

阶段 1 已完成，阶段 2 已开始：Supabase 数据层、登录、保存与分享基础。

- Next.js App Router + TypeScript
- 静态导出，适配 GitHub Pages
- 首页、规划页、路线阅读页
- localStorage 草稿保存与恢复
- Vitest 纯函数测试
- Playwright 桌面与移动端冒烟测试
- GitHub Pages workflow
- Supabase migration、RLS、邮箱登录入口、我的路线与分享页骨架

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

阶段 2 的数据库迁移在 `supabase/migrations/` 下。复制 `.env.example` 为 `.env.local` 后，填入：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（仅 Edge Function 使用）
- `NEXT_PUBLIC_AMAP_JS_KEY`（浏览器地图展示用）
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
`NEXT_PUBLIC_DEEPSEEK_PROXY_ENABLED` 设为 `true`：

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
