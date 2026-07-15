export type CloudAction =
  | "save"
  | "share"
  | "snapshot"
  | "route_list"
  | "route_delete"
  | "photo_upload";

const actionLabels: Record<CloudAction, string> = {
  save: "保存",
  share: "分享",
  snapshot: "快照",
  route_list: "路线读取",
  route_delete: "路线删除",
  photo_upload: "打卡图同步",
};

export function mapCloudError(error: unknown, action: CloudAction) {
  const label = actionLabels[action];
  const message = getErrorText(error);
  const code = getErrorCode(error);
  const normalized = `${code} ${message}`.toLowerCase();

  if (message === "auth_required") {
    return `请先登录，再执行${label}。`;
  }

  if (message === "supabase_not_configured") {
    return "Supabase 尚未配置，当前只能使用本地草稿。";
  }

  if (matchesAny(normalized, ["jwt", "session", "invalid token"])) {
    return "登录状态已失效，请重新登录后再试。";
  }

  if (
    matchesAny(normalized, [
      "row-level security",
      "permission denied",
      "not authorized",
      "forbidden",
      "rls",
      "42501",
    ])
  ) {
    return `${label}被云端权限策略拒绝：请确认已登录正确账号，且这条路线属于当前用户。`;
  }

  if (
    matchesAny(normalized, [
      "route-media",
      "bucket",
      "storage",
      "object not found",
    ])
  ) {
    return "云端 Storage 尚不可用：请确认 `route-media` bucket 和相关 RLS 策略已完成迁移。";
  }

  if (
    matchesAny(normalized, [
      "route_checkin_photos",
      "relation does not exist",
      "schema cache",
      "column",
      "42p01",
      "42703",
    ])
  ) {
    return "云端数据库结构缺失：请先应用最新 Supabase migration 后再试。";
  }

  if (
    matchesAny(normalized, [
      "failed to fetch",
      "network",
      "timeout",
      "abort",
      "econnreset",
      "fetch",
    ])
  ) {
    return `${label}时网络连接失败：请检查网络或 Supabase 服务状态后重试。`;
  }

  if (message) {
    return `${label}失败：${message}`;
  }

  return `${label}暂时失败，请稍后重试。`;
}

function getErrorText(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }

  return "";
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }

  return "";
}

function matchesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}
