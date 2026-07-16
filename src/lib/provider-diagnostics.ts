"use client";

import { isDeepSeekProxyConfigured } from "@/lib/ai/deepseek";
import { getAmapJsConfig, loadAmapJsApi } from "@/lib/maps/amap-js";
import { isAmapWebProxyConfigured } from "@/lib/maps/amap-web";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

export type ProviderDiagnosticStatus = "ready" | "warning" | "error";

export type ProviderDiagnostic = {
  id: string;
  label: string;
  status: ProviderDiagnosticStatus;
  detail: string;
};

export async function runProviderDiagnostics(): Promise<ProviderDiagnostic[]> {
  const checks = await Promise.allSettled([
    checkAmapJs(),
    checkAmapWebService(),
    checkDeepSeek(),
    checkSupabaseAuth(),
    checkSupabaseDb(),
    checkSupabaseStorage(),
  ]);

  return checks.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : {
          id: diagnosticLabels[index].id,
          label: diagnosticLabels[index].label,
          status: "error",
          detail:
            result.reason instanceof Error
              ? result.reason.message
              : "诊断失败。",
        },
  );
}

const diagnosticLabels = [
  { id: "amap-js", label: "高德 JS" },
  { id: "amap-web", label: "高德 Web Service" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "supabase-auth", label: "Supabase Auth" },
  { id: "supabase-db", label: "Supabase DB" },
  { id: "supabase-storage", label: "Supabase Storage" },
];

async function checkAmapJs(): Promise<ProviderDiagnostic> {
  if (!getAmapJsConfig().key) {
    return warning("amap-js", "高德 JS", "未配置浏览器 JS Key。");
  }

  try {
    await loadAmapJsApi();
    return ready("amap-js", "高德 JS", "JS SDK 已加载。");
  } catch (error) {
    return failure("amap-js", "高德 JS", error, "JS SDK 加载失败。");
  }
}

async function checkAmapWebService(): Promise<ProviderDiagnostic> {
  const client = createBrowserSupabaseClient();

  if (!client || !isAmapWebProxyConfigured()) {
    return warning("amap-web", "高德 Web Service", "Supabase 代理未配置。");
  }

  const { data, error } = await client.functions.invoke("amap-proxy", {
    body: { action: "diagnostic", probe: true },
  });

  if (error) {
    return failure("amap-web", "高德 Web Service", error, "代理调用失败。");
  }

  const diagnostic = data as {
    amapKeyConfigured?: boolean;
    providerReachable?: boolean | null;
    info?: string | null;
  };

  if (!diagnostic.amapKeyConfigured) {
    return warning("amap-web", "高德 Web Service", "Edge Function 缺少高德 Key。");
  }

  return diagnostic.providerReachable
    ? ready("amap-web", "高德 Web Service", "代理和高德 Web Service 均可达。")
    : warning(
        "amap-web",
        "高德 Web Service",
        diagnostic.info
          ? `代理可达，高德返回 ${diagnostic.info}。`
          : "代理可达，高德探测未确认。",
      );
}

async function checkDeepSeek(): Promise<ProviderDiagnostic> {
  const client = createBrowserSupabaseClient();

  if (!client || !isDeepSeekProxyConfigured()) {
    return warning("deepseek", "DeepSeek", "DeepSeek 前端开关未启用。");
  }

  const { data, error } = await client.functions.invoke("deepseek-proxy", {
    body: { action: "diagnostic" },
  });

  if (error) {
    return failure("deepseek", "DeepSeek", error, "DeepSeek 代理调用失败。");
  }

  const diagnostic = data as {
    deepseekKeyConfigured?: boolean;
    dailyUserLimit?: number | null;
    projectCostLimit?: number | null;
    limitStatus?: string;
  };

  if (!diagnostic.deepseekKeyConfigured) {
    return warning("deepseek", "DeepSeek", "Edge Function 缺少 DeepSeek Key。");
  }

  const limits = [
    diagnostic.dailyUserLimit
      ? `用户每日 ${diagnostic.dailyUserLimit} 次`
      : "未设用户每日次数",
    diagnostic.projectCostLimit
      ? `项目日成本 ${diagnostic.projectCostLimit} 元`
      : "未设项目日成本",
  ].join("；");

  return diagnostic.limitStatus === "allowed"
    ? ready("deepseek", "DeepSeek", `代理可达，限额检查通过：${limits}。`)
    : warning(
        "deepseek",
        "DeepSeek",
        `代理可达，限额状态：${diagnostic.limitStatus ?? "未知"}；${limits}。`,
      );
}

async function checkSupabaseAuth(): Promise<ProviderDiagnostic> {
  const client = createBrowserSupabaseClient();

  if (!client || !isSupabaseConfigured()) {
    return warning("supabase-auth", "Supabase Auth", "Supabase 未配置。");
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    return failure("supabase-auth", "Supabase Auth", error, "Auth 不可达。");
  }

  return ready(
    "supabase-auth",
    "Supabase Auth",
    data.session ? "Auth 可达，当前已登录。" : "Auth 可达，当前未登录。",
  );
}

async function checkSupabaseDb(): Promise<ProviderDiagnostic> {
  const client = createBrowserSupabaseClient();

  if (!client) {
    return warning("supabase-db", "Supabase DB", "Supabase 未配置。");
  }

  const { error } = await client
    .from("routes")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
    return warning(
      "supabase-db",
      "Supabase DB",
      `数据库可达性未确认：${error.message}`,
    );
  }

  return ready("supabase-db", "Supabase DB", "routes 表可达。");
}

async function checkSupabaseStorage(): Promise<ProviderDiagnostic> {
  const client = createBrowserSupabaseClient();

  if (!client) {
    return warning("supabase-storage", "Supabase Storage", "Supabase 未配置。");
  }

  const { error } = await client.storage.from("route-media").list("", {
    limit: 1,
  });

  if (error) {
    return warning(
      "supabase-storage",
      "Supabase Storage",
      `Storage 可达性未确认：${error.message}`,
    );
  }

  return ready("supabase-storage", "Supabase Storage", "route-media 可读取。");
}

function ready(id: string, label: string, detail: string): ProviderDiagnostic {
  return { id, label, status: "ready", detail };
}

function warning(id: string, label: string, detail: string): ProviderDiagnostic {
  return { id, label, status: "warning", detail };
}

function failure(
  id: string,
  label: string,
  error: unknown,
  fallback: string,
): ProviderDiagnostic {
  return {
    id,
    label,
    status: "error",
    detail: error instanceof Error ? error.message : fallback,
  };
}
