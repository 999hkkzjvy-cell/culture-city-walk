"use client";

import { Database, KeyRound, Map, Sparkles } from "lucide-react";
import { isAmapJsConfigured } from "@/lib/maps/amap";
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
    getReady: () => false,
    readyText: "已接入",
    pendingText: "待 Edge Function",
  },
  {
    label: "AI",
    icon: Sparkles,
    getReady: () => false,
    readyText: "DeepSeek",
    pendingText: "模板 fallback",
  },
];

export function DeveloperStatusPanel() {
  return (
    <section className="dev-status-panel" aria-label="开发状态">
      <div>
        <p>开发状态</p>
        <h2>当前路线仍可在无外部 API 情况下使用</h2>
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
    </section>
  );
}
