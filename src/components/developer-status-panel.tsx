"use client";

import { Database, KeyRound, Map, Sparkles } from "lucide-react";
import { useState } from "react";
import { isDeepSeekProxyConfigured } from "@/lib/ai/deepseek";
import { isAmapJsConfigured } from "@/lib/maps/amap";
import { isAmapWebProxyConfigured } from "@/lib/maps/amap-web";
import {
  runProviderDiagnostics,
  type ProviderDiagnostic,
} from "@/lib/provider-diagnostics";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const statuses = [
  {
    label: "Supabase",
    icon: Database,
    getReady: () => Boolean(createBrowserSupabaseClient()),
    readyText: "已配置",
    pendingText: "本地 fallback",
  },
  {
    label: "高德 JS",
    icon: Map,
    getReady: () => isAmapJsConfigured(),
    readyText: "已配置",
    pendingText: "未配置",
  },
  {
    label: "高德 Web",
    icon: KeyRound,
    getReady: () => isAmapWebProxyConfigured(),
    readyText: "代理可调用",
    pendingText: "待 Edge Function",
  },
  {
    label: "AI",
    icon: Sparkles,
    getReady: () => isDeepSeekProxyConfigured(),
    readyText: "DeepSeek",
    pendingText: "模板 fallback",
  },
];

export function DeveloperStatusPanel() {
  const [diagnostics, setDiagnostics] = useState<ProviderDiagnostic[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  async function runDiagnostics() {
    setIsChecking(true);
    try {
      setDiagnostics(await runProviderDiagnostics());
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className="dev-status-panel" aria-label="开发状态">
      <div>
        <p>开发状态</p>
        <h2>当前路线仍可在无外部 API 情况下使用</h2>
        <button
          className="secondary-button compact"
          disabled={isChecking}
          onClick={runDiagnostics}
          type="button"
        >
          {isChecking ? "检测中" : "实时检测 Provider"}
        </button>
      </div>
      <div className="dev-status-grid">
        {statuses.map((status) => {
          const Icon = status.icon;
          const ready = status.getReady();

          return (
            <article className={ready ? "ready" : ""} key={status.label}>
              <Icon aria-hidden="true" size={18} />
              <span>{status.label}</span>
              <strong>{ready ? status.readyText : status.pendingText}</strong>
            </article>
          );
        })}
      </div>
      {diagnostics.length > 0 ? (
        <div className="provider-diagnostics" aria-label="Provider 实时诊断">
          {diagnostics.map((item) => (
            <article className={item.status} key={item.id}>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
