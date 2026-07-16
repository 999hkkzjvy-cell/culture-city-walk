# 待办清单

最后更新：2026-07-17

本文件只记录尚未完成、尚未验证或尚未部署确认的事项。已完成的开发项不再保留在本文中；历史完成情况请查看 `ignore-files/项目提交日志.md` 和阶段状态文档。

优先级说明：

- `P0`：阻塞核心路线规划、保存、分享、现场体验闭环或后续发布安全性的事项。
- `P1`：核心闭环可用后，应优先补齐的重要质量、可靠性或产品完整性工作。
- `P2`：体验打磨、视觉还原和更长期的产品扩展。

## P0 待验证与发布风险

当前没有 P0 待办。

## P1 规划与候选质量

当前没有 P1 规划与候选质量待办。

## P1 认证、云端与数据可靠性

- `P1` 线上验证头像上传与云端收藏迁移。
  - `20260716000200_profile_avatars_and_route_favorites.sql` 已由用户在 Supabase 执行，包含公开 `profile-avatars` bucket、头像 Storage policy、`route_favorites` 表和 owner-only RLS。
  - 本地代码已支持头像图片上传、本地收藏云端同步、登录后路线库合并云端收藏。
  - 前端代码已提交推送；仍需等待 GitHub Pages 部署后，线上验证头像上传最终展示、收藏同步、跨设备收藏读取和未登录本地收藏 fallback。

- `P1` 如未来开启邮件确认或 magic link，执行线上邮件链接回跳 smoke。
  - 登录页已支持 Supabase `code` 回跳和 hash token 回跳，并会按安全站内 `redirect` 参数跳转。
  - 2026-07-16 线上邮箱密码注册登录已通过，可直接进入 `/profile/`；当前生产注册没有强制邮件确认，本次线上烟测没有触发邮件确认链接。
  - 若后续启用邮件确认或恢复 magic-link 主流程，需要单独验证 GitHub Pages 回跳：
    - Site URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/`
    - Redirect URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/**`
    - 本地 Redirect URL：`http://localhost:3000/**`

- `P1` 线上执行 Supabase 路线/候选/快照完整性检查。
  - 已新增 `runRouteCloudIntegrityCheck` 和 Vitest contract，覆盖云端保存、路线重新读取、候选重新读取、快照创建/读取、分享创建/撤销。
  - 仍需在真实 Supabase 登录态下运行一次线上集成 smoke；Storage 上传已由打卡图线上冒烟覆盖，头像 Storage 需在新 migration 后补测。

## P2 UI 与内容打磨

当前没有 P2 待办。

## 下一次发布前操作清单

1. 运行本地验证：
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npm run e2e`
2. 提交并推送分支。
3. 确认 GitHub Pages workflow 成功。
4. 线上冒烟测试：路线规划、云端保存、分享、撤销/删除、途中打卡图归档、分享路线收藏/修改。

## 文档维护注意

- 以后 `docs/` 和项目内其他 Markdown 文档默认使用中文编写。
- `ignore-files/项目提交日志.md` 中较早的条目提到手工添加和只复核步行，这些是历史提交记录，不应当作当前行为说明。
