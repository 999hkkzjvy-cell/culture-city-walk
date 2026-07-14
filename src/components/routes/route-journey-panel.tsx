"use client";

import { CheckCircle2, MapPin, RotateCcw, SkipForward } from "lucide-react";
import { useState } from "react";
import type { RoutePlan } from "@/lib/route";
import {
  readJourneyState,
  saveJourneyState,
  type StoredJourneyState,
} from "@/lib/storage";

export function RouteJourneyPanel({ route }: { route: RoutePlan }) {
  const [journey, setJourney] = useState<StoredJourneyState>(() =>
    typeof window === "undefined"
      ? {
          routeId: route.id,
          arrivedStopIds: [],
          skippedStopIds: [],
          updatedAt: new Date().toISOString(),
        }
      : readJourneyState(route.id),
  );

  const activeStop =
    route.stops.find(
      (stop) =>
        !journey.arrivedStopIds.includes(stop.id) &&
        !journey.skippedStopIds.includes(stop.id),
    ) ?? null;
  const nextStop = activeStop
    ? route.stops.find(
        (stop) =>
          route.stops.indexOf(stop) > route.stops.indexOf(activeStop) &&
          !journey.skippedStopIds.includes(stop.id),
      )
    : null;
  const completedCount = journey.arrivedStopIds.length;

  function updateJourney(next: StoredJourneyState) {
    saveJourneyState(next);
    setJourney(next);
  }

  function markArrived(stopId: string) {
    updateJourney({
      ...journey,
      arrivedStopIds: [...new Set([...journey.arrivedStopIds, stopId])],
      skippedStopIds: journey.skippedStopIds.filter((id) => id !== stopId),
      updatedAt: new Date().toISOString(),
    });
  }

  function skipStop(stopId: string) {
    updateJourney({
      ...journey,
      skippedStopIds: [...new Set([...journey.skippedStopIds, stopId])],
      arrivedStopIds: journey.arrivedStopIds.filter((id) => id !== stopId),
      updatedAt: new Date().toISOString(),
    });
  }

  function restoreStop(stopId: string) {
    updateJourney({
      ...journey,
      skippedStopIds: journey.skippedStopIds.filter((id) => id !== stopId),
      arrivedStopIds: journey.arrivedStopIds.filter((id) => id !== stopId),
      updatedAt: new Date().toISOString(),
    });
  }

  function resetJourney() {
    updateJourney({
      routeId: route.id,
      arrivedStopIds: [],
      skippedStopIds: [],
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="journey-panel" aria-label="途中模式">
      <div className="journey-heading">
        <span>
          <MapPin size={16} />
          途中模式
        </span>
        <button onClick={resetJourney} type="button">
          <RotateCcw size={14} />
          重置
        </button>
      </div>
      {activeStop ? (
        <article className="journey-next-card">
          <p>下一站</p>
          <h2>{activeStop.name}</h2>
          <span>
            {activeStop.time} · 停留 {activeStop.stayMinutes} 分钟
          </span>
          <div>
            <button onClick={() => markArrived(activeStop.id)} type="button">
              <CheckCircle2 size={16} />
              标记到达
            </button>
            <button onClick={() => skipStop(activeStop.id)} type="button">
              <SkipForward size={16} />
              临时跳过
            </button>
          </div>
        </article>
      ) : (
        <div className="journey-empty">
          <CheckCircle2 size={18} />
          <span>这条路线今天已经走完。</span>
        </div>
      )}
      <div className="journey-progress">
        <span>
          已到达 {completedCount}/{route.stops.length}
        </span>
        {nextStop ? <span>再下一站：{nextStop.name}</span> : null}
      </div>
      {journey.skippedStopIds.length > 0 ? (
        <div className="journey-skipped">
          {journey.skippedStopIds.map((stopId) => {
            const stop = route.stops.find((item) => item.id === stopId);

            return stop ? (
              <button key={stop.id} onClick={() => restoreStop(stop.id)} type="button">
                恢复 {stop.name}
              </button>
            ) : null;
          })}
        </div>
      ) : null}
    </section>
  );
}
