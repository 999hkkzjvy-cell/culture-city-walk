"use client";

import Link from "next/link";
import { Bookmark, Cloud, Edit3, FileText, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { RouteShareManager } from "@/components/routes/route-share-manager";
import {
  createRouteRepository,
  type SavedRouteSummary,
} from "@/lib/repositories/route-repository";
import { saveLocalRouteToCloud } from "@/lib/repositories/route-cloud-sync";
import type { Theme } from "@/lib/route";
import { readFavoriteRoutes, saveRoutePlan } from "@/lib/storage";
import { routeUrl } from "@/lib/urls";

type LoadState = "loading" | "ready" | "error";

export function RouteLibrary({
  selectedThemes = [],
  view = "plans",
}: {
  selectedThemes?: Theme[];
  view?: "plans" | "favorites";
}) {
  const [routes, setRoutes] = useState<SavedRouteSummary[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [favoriteRoutes] = useState(() =>
    typeof window === "undefined" ? [] : readFavoriteRoutes(),
  );

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
      const { saved } = await saveLocalRouteToCloud(repository);
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

  const filteredRoutes = routes.filter(
    (route) =>
      selectedThemes.length === 0 ||
      selectedThemes.every((theme) => route.themes.includes(theme)),
  );

  if (view === "favorites") {
    const filteredFavorites = favoriteRoutes.filter(
      (route) =>
        selectedThemes.length === 0 ||
        selectedThemes.every((theme) => route.themes.includes(theme)),
    );

    return (
      <section className="library-panel">
        <div className="section-heading">
          <h2>我的收藏</h2>
        </div>
        <div className="route-list">
          {filteredFavorites.length > 0 ? (
            filteredFavorites.map((route) => (
              <article className="route-list-item" key={route.id}>
                <Bookmark size={22} aria-hidden="true" />
                <div>
                  <h3>{route.title}</h3>
                  <p>
                    {route.city} · {route.stops.length} 个站点
                  </p>
                  <div className="route-list-tags">
                    {route.themes.map((theme) => (
                      <span key={theme}>{theme}</span>
                    ))}
                  </div>
                </div>
                <Link
                  className="secondary-link"
                  href={routeUrl(route.id)}
                  onClick={() => saveRoutePlan(route)}
                >
                  查看
                </Link>
                <Link
                  className="secondary-link"
                  href="/plan/"
                  onClick={() => saveRoutePlan(route)}
                >
                  <Edit3 size={15} />
                  修改
                </Link>
              </article>
            ))
          ) : (
            <div className="library-empty">
              <Bookmark size={24} />
              <span>收藏夹还没有路线。推荐路线和朋友分享可在这里归档。</span>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="library-panel">
      <div className="section-heading">
        <h2>我的规划</h2>
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
        {filteredRoutes.length > 0 ? (
          filteredRoutes.map((route) => (
            <article className="route-list-item" key={route.id}>
              <FileText size={22} aria-hidden="true" />
              <div>
                <h3>{route.title}</h3>
                <p>
                  {route.city} ·{" "}
                  {route.visibility === "shared" ? "已分享" : "私有"} · v
                  {route.version}
                </p>
                {route.themes.length > 0 ? (
                  <div className="route-list-tags">
                    {route.themes.map((theme) => (
                      <span key={theme}>{theme}</span>
                    ))}
                  </div>
                ) : null}
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
              <RouteShareManager routeId={route.id} />
            </article>
          ))
        ) : (
          <div className="library-empty">
            <FileText size={24} />
            <span>
              {routes.length > 0
                ? "当前主题筛选下没有路线。"
                : "还没有云端路线。先保存当前预案，之后可以跨设备查看。"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
