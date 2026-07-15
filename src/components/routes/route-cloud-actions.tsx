"use client";

import { Cloud } from "lucide-react";
import { useState } from "react";
import { RouteShareManager } from "@/components/routes/route-share-manager";
import { mapCloudError } from "@/lib/repositories/cloud-error-messages";
import { saveLocalRouteToCloud } from "@/lib/repositories/route-cloud-sync";
import { demoRoute } from "@/lib/route";
import { readRoutePlan } from "@/lib/storage";

type SaveState = "idle" | "saving" | "saved" | "error";

export function RouteCloudActions() {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [cloudRouteId, setCloudRouteId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const route = readRoutePlan();
    return route.id === demoRoute.id ? null : route.id;
  });
  const [message, setMessage] = useState("");

  async function saveToCloud() {
    setSaveState("saving");
    setMessage("");

    try {
      const { saved, candidateSyncFailed } = await saveLocalRouteToCloud();
      setCloudRouteId(saved.id);
      setSaveState("saved");
      setMessage(
        candidateSyncFailed
          ? `已保存：${saved.title}。候选点状态本次未同步，路线本身已在云端。`
          : `已保存：${saved.title}`,
      );
    } catch (error) {
      setSaveState("error");
      setMessage(mapCloudError(error, "save"));
    }
  }

  return (
    <section
      className="cloud-actions"
      data-route-cloud-actions
      aria-label="云端路线操作"
    >
      <button className="secondary-button" onClick={saveToCloud} type="button">
        <Cloud size={17} />
        {saveState === "saving"
          ? "保存中"
          : saveState === "saved"
            ? "已保存"
            : "保存到云端"}
      </button>
      {cloudRouteId ? (
        <RouteShareManager routeId={cloudRouteId} />
      ) : (
        <p>保存到云端后，可以生成、复制和撤销分享链接。</p>
      )}
      {message ? <p>{message}</p> : null}
    </section>
  );
}
