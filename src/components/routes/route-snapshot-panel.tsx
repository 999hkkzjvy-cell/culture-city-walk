"use client";

import { Camera, History, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createRouteRepository,
  type RouteSnapshotPayload,
  type RouteSnapshotSummary,
} from "@/lib/repositories/route-repository";
import { saveLocalRouteToCloud } from "@/lib/repositories/route-cloud-sync";
import { demoRoute } from "@/lib/route";
import type { RoutePlan } from "@/lib/route";
import {
  readCandidateState,
  routePlanStorageKey,
  saveCandidateState,
  saveRoutePlan,
} from "@/lib/storage";

type SnapshotState = "loading" | "ready" | "error";

export function RouteSnapshotPanel({ route }: { route: RoutePlan }) {
  const [snapshots, setSnapshots] = useState<RouteSnapshotSummary[]>([]);
  const [state, setState] = useState<SnapshotState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const repository = createRouteRepository();
    queueMicrotask(() => {
      if (isMounted) {
        setState("loading");
      }
    });

    repository
      .listSnapshots(route.id)
      .then((items) => {
        if (!isMounted) {
          return;
        }
        setSnapshots(items);
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
  }, [route.id]);

  async function createSnapshot() {
    setMessage("");

    try {
      const repository = createRouteRepository();
      const snapshotInput =
        route.id === demoRoute.id
          ? await saveLocalRouteToCloud(repository)
          : {
              repository,
              route,
              candidateState: readCandidateState(route.id),
            };
      const snapshot = await snapshotInput.repository.createSnapshot(
        snapshotInput.route,
        snapshotInput.candidateState,
      );
      const payload = await repository.readSnapshot(snapshot.id);

      if (payload && payload.route.id !== route.id) {
        persistSnapshotPayload(payload);
      }

      setSnapshots((current) => [
        snapshot,
        ...current.filter((item) => item.id !== snapshot.id),
      ]);
      setState("ready");
      setMessage("快照已创建。");
    } catch (error) {
      setMessage(mapSnapshotError(error));
    }
  }

  async function restoreSnapshot(snapshotId: string) {
    setMessage("");
    const repository = createRouteRepository();

    try {
      const payload = await repository.readSnapshot(snapshotId);

      if (!payload) {
        setMessage("没有找到这个快照。");
        return;
      }

      persistSnapshotPayload(payload);
      setMessage("已恢复为当前本地预案，可继续编辑或保存云端。");
    } catch {
      setMessage("快照恢复失败，当前预案没有被修改。");
    }
  }

  return (
    <section className="route-snapshot-panel">
      <div>
        <span>
          <History size={16} />
          路线快照
        </span>
        <p>记录当前站点顺序、停留时间、备注和候选点状态。</p>
      </div>
      <button className="secondary-button" onClick={createSnapshot} type="button">
        <Camera size={17} />
        创建快照
      </button>
      {message ? <p className="auth-message">{message}</p> : null}
      {state === "loading" ? (
        <p className="snapshot-empty">正在读取快照...</p>
      ) : null}
      {state === "error" ? (
        <p className="snapshot-empty">快照暂时无法读取。</p>
      ) : null}
      {state === "ready" && snapshots.length === 0 ? (
        <p className="snapshot-empty">还没有快照。</p>
      ) : null}
      {snapshots.length > 0 ? (
        <div className="snapshot-list">
          {snapshots.map((snapshot) => (
            <article className="snapshot-item" key={snapshot.id}>
              <div>
                <strong>v{snapshot.version}</strong>
                <span>
                  {snapshot.stopCount} 站 · {snapshot.candidateCount} 个候选点
                  · {snapshot.createdAt.slice(0, 10)}
                </span>
              </div>
              <button
                className="secondary-link"
                onClick={() => restoreSnapshot(snapshot.id)}
                type="button"
              >
                <RotateCcw size={15} />
                恢复
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function mapSnapshotError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "auth_required") {
      return "请先登录，再创建云端快照。";
    }

    if (error.message === "supabase_not_configured") {
      return "Supabase 尚未配置，当前只保留本地快照。";
    }
  }

  return "快照创建失败，云端暂时无法写入。";
}

function persistSnapshotPayload(payload: RouteSnapshotPayload) {
  saveRoutePlan(payload.route);
  saveCandidateState({
    ...payload.candidateState,
    routeId: payload.route.id,
    updatedAt: new Date().toISOString(),
  });
  window.dispatchEvent(
    new StorageEvent("storage", { key: routePlanStorageKey }),
  );
}
