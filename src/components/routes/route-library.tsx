"use client";

import Link from "next/link";
import { Bookmark, Cloud, Edit3, FileText, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { RouteShareManager } from "@/components/routes/route-share-manager";
import {
  listFavoriteRoutesWithCloud,
  syncFavoriteRoutesToCloud,
} from "@/lib/repositories/favorite-route-repository";
import { mapCloudError } from "@/lib/repositories/cloud-error-messages";
import {
  createRouteRepository,
  type SavedRouteSummary,
} from "@/lib/repositories/route-repository";
import { saveLocalRouteToCloud } from "@/lib/repositories/route-cloud-sync";
import type { Theme } from "@/lib/route";
import {
  hasSyncedRoutePlan,
  importRouteForPlanning,
  readFavoriteRoutes,
  readRoutePlan,
  saveRoutePlan,
} from "@/lib/storage";
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
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [hasPendingLocalPreview, setHasPendingLocalPreview] = useState(false);
  const [localPreview, setLocalPreview] = useState(() =>
    typeof window === "undefined" ? null : readRoutePlan(),
  );
  const [favoriteRoutes, setFavoriteRoutes] = useState(() =>
    typeof window === "undefined" ? [] : readFavoriteRoutes(),
  );
  const [favoriteCloudAvailable, setFavoriteCloudAvailable] = useState(false);

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
        setLocalPreview(readRoutePlan());
        setHasPendingLocalPreview(!hasSyncedRoutePlan());
        setState("ready");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setMessage(mapCloudError(error, "route_list"));
        setState("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (view !== "favorites") {
      return;
    }

    let isMounted = true;

    listFavoriteRoutesWithCloud().then((result) => {
      if (!isMounted) {
        return;
      }

      setFavoriteRoutes(result.routes);
      setFavoriteCloudAvailable(result.cloudAvailable);
      setFavoriteMessage(
        result.cloudAvailable && result.cloudCount > 0
          ? `已合并 ${result.cloudCount} 条云端收藏。`
          : "",
      );
    });

    return () => {
      isMounted = false;
    };
  }, [view]);

  async function saveCurrentRoute() {
    setMessage("");
    const repository = createRouteRepository();

    try {
      const { saved } = await saveLocalRouteToCloud(repository);
      setRoutes((current) => [
        saved,
        ...current.filter((route) => route.id !== saved.id),
      ]);
      setLocalPreview(readRoutePlan());
      setHasPendingLocalPreview(false);
      setMessage(
        saved.version > 1
          ? `当前本地预案已同步，并更新云端路线：${saved.title}。`
          : `当前本地预案已保存为云端路线：${saved.title}。`,
      );
    } catch (error) {
      setMessage(mapCloudError(error, "save"));
    }
  }

  async function deleteRoute(routeId: string) {
    const repository = createRouteRepository();
    try {
      await repository.delete(routeId);
      setRoutes((current) => current.filter((route) => route.id !== routeId));
    } catch (error) {
      setMessage(mapCloudError(error, "route_delete"));
    }
  }

  async function syncFavorites() {
    setFavoriteMessage("");

    try {
      await syncFavoriteRoutesToCloud(readFavoriteRoutes());
      const result = await listFavoriteRoutesWithCloud();
      setFavoriteRoutes(result.routes);
      setFavoriteCloudAvailable(result.cloudAvailable);
      setFavoriteMessage("本地收藏已同步到云端。");
    } catch (error) {
      setFavoriteMessage(mapCloudError(error, "favorite"));
    }
  }

  if (state === "loading") {
    return <p className="auth-note">正在整理路线库...</p>;
  }

  if (state === "error") {
    return (
      <p className="auth-note">
        {message || "云端路线暂时无法读取，本地草稿仍可继续使用。"}
      </p>
    );
  }

  const filteredRoutes = routes.filter(
    (route) =>
      selectedThemes.length === 0 ||
      selectedThemes.every((theme) => route.themes.includes(theme)),
  );
  const localConflict =
    localPreview &&
    routes.find(
      (route) =>
        route.id === localPreview.id ||
        (route.title === localPreview.title && route.city === localPreview.city),
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
          <button
            className="secondary-button"
            onClick={syncFavorites}
            type="button"
          >
            <Cloud size={17} />
            同步收藏
          </button>
        </div>
        {favoriteMessage ? (
          <p className="auth-message">{favoriteMessage}</p>
        ) : favoriteCloudAvailable ? (
          <p className="auth-note">云端收藏已接入，可跨设备合并查看。</p>
        ) : null}
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
                  onClick={() =>
                    importRouteForPlanning(route, {
                      source: "favorite",
                      label: "我的收藏",
                    })
                  }
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
      {hasPendingLocalPreview && localPreview ? (
        <div className="library-sync-card">
          <div>
            <strong>发现未同步的本地预案</strong>
            <span>
              {localPreview.title} · {localPreview.city} ·{" "}
              {localPreview.stops.length} 个站点
            </span>
            <small>
              {localConflict?.id === localPreview.id
                ? "同步会更新同一条云端路线。"
                : localConflict
                  ? `云端已有同名路线“${localConflict.title}”，同步会保存为独立副本。`
                  : "同步后可在云端路线库跨设备查看。"}
            </small>
          </div>
          <button
            className="secondary-button"
            onClick={saveCurrentRoute}
            type="button"
          >
            <Cloud size={17} />
            同步本地预案
          </button>
        </div>
      ) : null}
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
                ? "当前主题筛选下没有路线，取消部分主题即可查看其他云端路线。"
                : hasPendingLocalPreview
                  ? "云端暂时没有路线；上方可以先把本地预案同步到云端。"
                  : "还没有云端路线。先在规划页生成路线，再保存到云端跨设备查看。"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
