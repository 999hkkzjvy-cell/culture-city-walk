"use client";

import Link from "next/link";
import { Cloud, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { createRouteRepository } from "@/lib/repositories/route-repository";
import { demoRoute } from "@/lib/route";
import { shareUrl } from "@/lib/urls";

type SaveState = "idle" | "saving" | "saved" | "error";

export function RouteCloudActions() {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function saveToCloud() {
    setSaveState("saving");
    setMessage("");

    try {
      const repository = createRouteRepository();
      const saved = await repository.save(demoRoute);
      setSaveState("saved");
      setMessage(`已保存：${saved.title}`);
    } catch (error) {
      setSaveState("error");
      setMessage(mapError(error));
    }
  }

  async function createShare() {
    setMessage("");

    try {
      const repository = createRouteRepository();
      const saved = await repository.save(demoRoute);
      const share = await repository.createShare(saved.id);
      setShareCode(share.code);
      setMessage("分享链接已生成。");
    } catch (error) {
      setMessage(mapError(error));
    }
  }

  async function copyShareLink() {
    if (!shareCode) {
      return;
    }

    await window.navigator.clipboard.writeText(`${window.location.origin}${shareUrl(shareCode)}`);
    setMessage("分享链接已复制。");
  }

  return (
    <section className="cloud-actions" aria-label="云端路线操作">
      <button className="secondary-button" onClick={saveToCloud} type="button">
        <Cloud size={17} />
        {saveState === "saving" ? "保存中" : saveState === "saved" ? "已保存" : "保存到云端"}
      </button>
      <button className="secondary-button" onClick={createShare} type="button">
        <Share2 size={17} />
        生成分享
      </button>
      {shareCode ? (
        <>
          <Link className="secondary-link" href={shareUrl(shareCode)}>
            打开分享页
          </Link>
          <button className="icon-text-button" onClick={copyShareLink} type="button">
            <Copy size={16} />
            复制
          </button>
        </>
      ) : null}
      {message ? <p>{message}</p> : null}
    </section>
  );
}

function mapError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "auth_required") {
      return "请先在“我的路线”页面登录，再保存到云端。";
    }

    if (error.message === "supabase_not_configured") {
      return "Supabase 尚未配置，当前只保留本地草稿。";
    }
  }

  return "云端操作暂时失败，请稍后重试。";
}
