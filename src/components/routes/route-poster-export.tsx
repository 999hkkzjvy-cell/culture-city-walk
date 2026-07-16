"use client";

import { Download } from "lucide-react";
import type { RoutePlan } from "@/lib/route";
import { buildRoutePosterSvg, routePosterFileName } from "@/lib/route-poster";

export function RoutePosterExport({
  route,
  variant = "button",
}: {
  route: RoutePlan;
  variant?: "button" | "panel";
}) {
  function exportPoster() {
    const svg = buildRoutePosterSvg(route);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = routePosterFileName(route);
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  if (variant === "panel") {
    return (
      <section className="route-poster-panel" aria-label="分享海报导出">
        <div>
          <p>分享海报</p>
          <h2>把路线导出成一张可转发的路线卡</h2>
          <span>包含标题、城市、主题、站点清单和出发前核验提醒。</span>
        </div>
        <button onClick={exportPoster} type="button">
          <Download size={16} />
          导出 SVG 海报
        </button>
      </section>
    );
  }

  return (
    <button onClick={exportPoster} type="button">
      <Download size={17} />
      海报
    </button>
  );
}
