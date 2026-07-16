# 待办清单

最后更新：2026-07-16

本文件只记录尚未完成、尚未验证或尚未部署确认的事项。已完成的开发项不再保留在本文中；历史完成情况请查看 `ignore-files/项目提交日志.md` 和阶段状态文档。

优先级说明：

- `P0`：阻塞核心路线规划、保存、分享、现场体验闭环或后续发布安全性的事项。
- `P1`：核心闭环可用后，应优先补齐的重要质量、可靠性或产品完整性工作。
- `P2`：体验打磨、视觉还原和更长期的产品扩展。

## P0 待验证与发布风险

当前没有 P0 待办。

## P1 规划与候选质量

- `P1` 执行 AI 用量限制的生产登录/超额烟测。
  - `deepseek-proxy` 新版已部署，Supabase Function secrets 已配置 `AI_DAILY_USER_LIMIT=30` 和 `AI_PROJECT_COST_LIMIT_CNY=20`。
  - 未登录诊断 smoke 已返回 `deepseek_auth_required`，高德 provider 诊断已返回 `OK`。
  - 仍需在用户明确授权后，创建临时生产用户并写入 `route_ai_runs` 超额记录，验证正常调用和超额拒绝分支；该操作会改写生产 Supabase 数据，本次因安全审查未执行。

## P1 认证、云端与数据可靠性

- `P1` 如未来开启邮件确认或 magic link，补充邮件链接回跳验证。
  - 2026-07-16 线上邮箱密码注册登录已通过，可直接进入 `/profile/`。
  - 由于当前生产注册没有强制邮件确认，本次线上烟测没有触发邮件确认链接。
  - 若后续启用邮件确认或恢复 magic-link 主流程，需要单独验证 GitHub Pages 回跳：
    - Site URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/`
    - Redirect URL：`https://999hkkzjvy-cell.github.io/culture-city-walk/**`
    - 本地 Redirect URL：`http://localhost:3000/**`

- `P1` 改进登录后的本地草稿迁移。
  - 当前同步是 best effort。
  - 需要更明确的“保存本地草稿到云端”流程，并处理云端已有路线时的冲突。

- `P1` 增加头像上传。
  - 当前 profile 只支持头像 URL。
  - 需要决定头像 Storage 的私有/公开策略，并增加图片上传 UI。

- `P1` 改进路线归档空态与错误态。
  - 区分“没有路线”、“未登录”、“云端不可用”和“主题筛选为空”。

- `P1` 增加 Supabase 路线/候选/快照完整性测试。
  - 本地 repository 和纯函数已有测试。
  - 需要补云端保存、路线重新读取、候选重新读取、快照创建/读取、分享创建/删除和 Storage 上传的集成检查。

- `P1` 评估登录用户收藏云端同步。
  - 当前 P0 决策是收藏保留在本地浏览器存储，保证未登录也能收藏和修改。
  - 如需要跨设备收藏，应新增 schema/RLS、repository 方法和迁移，并明确与本地收藏的合并策略。

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
