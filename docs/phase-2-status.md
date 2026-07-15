# 阶段 2 状态

日期：2026-07-14

## 范围

阶段 2 已形成可运行基础。应用已具备 Supabase 支持的认证、路线保存和只读分享能力，同时保留本地 fallback 行为。

## 已实现

- Supabase 云端项目：
  - 项目名：`culture-city-walk`
  - Project ref：`wedwvcmdbrnbzjwlllgl`
  - Region：`ap-southeast-1`
- 已应用的 Supabase 迁移包含：
  - `profiles`
  - `places`
  - `routes`
  - `route_stops`
  - `route_constraints`
  - `route_snapshots`
  - `route_shares`
  - 私有 `route-media` Storage bucket
- 路线数据 owner-only RLS 策略。
- URL-safe 分享码生成。
- 已部署 Edge Function `share-route`，用于只读分享路线查询。
- 浏览器 Supabase client 和类型化数据库定义。
- Route Repository 接口，包含本地 fallback 和 Supabase 实现。
- 邮箱 magic-link 认证面板。
- `/library/` 路线归档页。
- `/share/?code=...` 只读分享页壳。
- 路线阅读页上的云端保存/分享操作。
- GitHub Pages 构建变量，包含 Supabase URL 和 publishable key。
- 基于旧南京路线的演示种子数据：
  - 脚本：`supabase/seed.sql`
  - 分享码：`nanjing-minguo`
  - URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/share/?code=nanjing-minguo`
- 首页精选卡片链接到种子南京路线。

## 尚未完成

- 在 Supabase Dashboard 中确认 Auth URL 配置：
  - Site URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/`
  - Redirect URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/**`
  - 本地 Redirect URL：`http://localhost:3000/**`
- 完整账号引导流程尚未完成。
- 登录后的本地草稿迁移尚未完成。
- 路线归档的空态、加载态和错误态仍较基础。
- 邮件模板尚未自定义。

## 备注

- 公开分享由 `share-route` 处理，并设置 `verify_jwt=false`；访问控制依赖分享码、撤销状态和过期时间检查。
- 私有路线数据仍由 RLS owner 策略保护。
- 当前项目全局地图见 `docs/ai-project-context.md`。
