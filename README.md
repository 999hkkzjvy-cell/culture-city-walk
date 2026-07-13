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

## 参考资料

产品文档和 UI 参考图保留在 `ignore-files/` 下。
