"use client";

import Link from "next/link";
import { Cloud, FileText, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createRouteRepository,
  type SavedRouteSummary,
} from "@/lib/repositories/route-repository";
import { readRoutePlan } from "@/lib/storage";
import { routeUrl } from "@/lib/urls";

type LoadState = "loading" | "ready" | "error";

export function RouteLibrary() {
  const [routes, setRoutes] = useState<SavedRouteSummary[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const repository = createRouteRepository();

    repository
      .list()
      .then((items) => {
        if (!isMounted) {
          return;
        }
        setRoutes(items);
        setState("ready");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setState("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function saveCurrentRoute() {
    setMessage("");
    const repository = createRouteRepository();

    try {
      const saved = await repository.save(readRoutePlan());
      setRoutes((current) => [
        saved,
        ...current.filter((route) => route.id !== saved.id),
      ]);
      setMessage("当前本地预案已保存。");
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "auth_required"
          ? "请先登录，再保存到云端。"
          : "保存失败，当前仍可使用本地草稿。",
      );
    }
  }

  async function deleteRoute(routeId: string) {
    const repository = createRouteRepository();
    await repository.delete(routeId);
    setRoutes((current) => current.filter((route) => route.id !== routeId));
  }

  if (state === "loading") {
    return <p className="auth-note">正在整理路线库...</p>;
  }

  if (state === "error") {
    return (
      <p className="auth-note">云端路线暂时无法读取，本地草稿仍可继续使用。</p>
    );
  }

  return (
    <section className="library-panel">
      <div className="section-heading">
        <h2>我的路线</h2>
        <button
          className="secondary-button"
          onClick={saveCurrentRoute}
          type="button"
        >
          <Cloud size={17} />
          保存当前预案
        </button>
      </div>
      {message ? <p className="auth-message">{message}</p> : null}
      <div className="route-list">
        {routes.length > 0 ? (
          routes.map((route) => (
            <article className="route-list-item" key={route.id}>
              <FileText size={22} aria-hidden="true" />
              <div>
                <h3>{route.title}</h3>
                <p>
                  {route.city} ·{" "}
                  {route.visibility === "shared" ? "已分享" : "私有"} · v
                  {route.version}
                </p>
              </div>
              <Link className="secondary-link" href={routeUrl(route.id)}>
                查看
              </Link>
              <button
                aria-label={`删除 ${route.title}`}
                className="icon-button"
                onClick={() => deleteRoute(route.id)}
                type="button"
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))
        ) : (
          <div className="library-empty">
            <FileText size={24} />
            <span>还没有云端路线。先保存当前预案，之后可以跨设备查看。</span>
          </div>
        )}
      </div>
    </section>
  );
}
