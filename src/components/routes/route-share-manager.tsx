"use client";

import Link from "next/link";
import { Copy, Link2, RotateCcw, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createRouteRepository,
  type ShareRecord,
} from "@/lib/repositories/route-repository";
import { mapCloudError } from "@/lib/repositories/cloud-error-messages";
import { shareUrl } from "@/lib/urls";

type ShareLoadState = "loading" | "ready" | "error";

export function RouteShareManager({ routeId }: { routeId: string }) {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [state, setState] = useState<ShareLoadState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const repository = createRouteRepository();

    repository
      .listShares(routeId)
      .then((items) => {
        if (!isMounted) {
          return;
        }
        setShares(items);
        setState("ready");
      })
      .catch((error) => {
        if (isMounted) {
          setMessage(mapCloudError(error, "share"));
          setState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [routeId]);

  async function createShare() {
    setMessage("");
    const repository = createRouteRepository();

    try {
      const share = await repository.createShare(routeId);
      setShares((current) => [share, ...current]);
      setState("ready");
      setMessage("分享链接已生成。");
    } catch (error) {
      setMessage(mapCloudError(error, "share"));
    }
  }

  async function copyShare(code: string) {
    await window.navigator.clipboard.writeText(
      `${window.location.origin}${shareUrl(code)}`,
    );
    setMessage("分享链接已复制。");
  }

  async function revokeShare(code: string) {
    setMessage("");
    const repository = createRouteRepository();

    try {
      await repository.revokeShare(code);
      setShares((current) => current.filter((share) => share.code !== code));
      setMessage("分享链接已删除。");
    } catch (error) {
      setMessage(mapCloudError(error, "share"));
    }
  }

  return (
    <section className="route-share-manager" aria-label="分享管理">
      <div className="share-manager-heading">
        <span>
          <Share2 size={15} />
          分享管理
        </span>
        <button onClick={createShare} type="button">
          <Link2 size={15} />
          生成分享
        </button>
      </div>
      {message ? <p>{message}</p> : null}
      {state === "loading" ? <p>正在读取分享链接...</p> : null}
      {state === "error" ? <p>分享链接暂时无法读取。</p> : null}
      {state === "ready" && shares.length === 0 ? (
        <p>还没有分享链接。</p>
      ) : null}
      {shares.length > 0 ? (
        <div className="share-list">
          {shares.map((share) => (
              <article className="share-item" key={share.code}>
                <div>
                  <strong>{share.code}</strong>
                  <span>{getShareStatus(share)}</span>
                </div>
                <Link
                  className="secondary-link"
                  href={shareUrl(share.code)}
                >
                  打开
                </Link>
                <button onClick={() => copyShare(share.code)} type="button">
                  <Copy size={14} />
                  复制
                </button>
                <button onClick={() => revokeShare(share.code)} type="button">
                  <RotateCcw size={14} />
                  撤销
                </button>
              </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function getShareStatus(share: ShareRecord) {
  return share.expiresAt ? `有效至 ${share.expiresAt.slice(0, 10)}` : "长期有效";
}
