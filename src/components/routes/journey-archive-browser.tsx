"use client";

import Link from "next/link";
import { CalendarDays, Camera, FileText, MapPin, Route } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  journeyArchivesStorageKey,
  readJourneyArchives,
  type StoredJourneyArchive,
} from "@/lib/storage";
import { journeyUrl, routeUrl } from "@/lib/urls";

type ArchiveFilter = {
  city: string;
  routeId: string;
};

const emptyArchives: StoredJourneyArchive[] = [];
let cachedArchives:
  | {
      key: string;
      archives: StoredJourneyArchive[];
    }
  | undefined;

export function JourneyArchiveBrowser() {
  const archives = useSyncExternalStore(
    subscribeToJourneyArchives,
    readJourneyArchivesSnapshot,
    () => emptyArchives,
  );
  const [filter, setFilter] = useState<ArchiveFilter>({
    city: "all",
    routeId: "all",
  });

  const cityOptions = useMemo(
    () => Array.from(new Set(archives.map((archive) => archive.city))).sort(),
    [archives],
  );
  const routeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          archives.map((archive) => [
            archive.routeId,
            {
              id: archive.routeId,
              title: archive.routeTitle,
              city: archive.city,
            },
          ]),
        ).values(),
      ).sort((a, b) => a.title.localeCompare(b.title, "zh-CN")),
    [archives],
  );

  const filteredArchives = archives.filter(
    (archive) =>
      (filter.city === "all" || archive.city === filter.city) &&
      (filter.routeId === "all" || archive.routeId === filter.routeId),
  );
  const summary = summarizeArchives(filteredArchives);

  return (
    <section className="journey-archive-browser">
      <aside className="journey-archive-sidebar" aria-label="行程存档筛选">
        <div>
          <p>存档筛选</p>
          <strong>{archives.length} 次完成记录</strong>
        </div>
        <label>
          城市
          <select
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                city: event.target.value,
              }))
            }
            value={filter.city}
          >
            <option value="all">全部城市</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label>
          路线
          <select
            onChange={(event) =>
              setFilter((current) => ({
                ...current,
                routeId: event.target.value,
              }))
            }
            value={filter.routeId}
          >
            <option value="all">全部路线</option>
            {routeOptions.map((route) => (
              <option key={route.id} value={route.id}>
                {route.city} · {route.title}
              </option>
            ))}
          </select>
        </label>
      </aside>

      <div className="journey-archive-content">
        <section className="journey-archive-summary" aria-label="存档总览">
          <SummaryCard
            icon={CalendarDays}
            label="完成行程"
            value={`${summary.count} 次`}
          />
          <SummaryCard
            icon={MapPin}
            label="到达站点"
            value={`${summary.arrivedCount} 个`}
          />
          <SummaryCard
            icon={Camera}
            label="打卡图"
            value={`${summary.photoCount} 张`}
          />
          <SummaryCard
            icon={FileText}
            label="最近体验"
            value={summary.count > 0 ? "可继续回看" : "-"}
          />
        </section>

        <section className="library-panel">
          <div className="section-heading">
            <h2>完成记录</h2>
            <span>{filteredArchives.length} 条</span>
          </div>
          <div className="journey-archive-list">
            {filteredArchives.length > 0 ? (
              filteredArchives.map((archive) => (
                <article className="journey-archive-item" key={archive.id}>
                  <div className="journey-archive-score">
                    <strong>{archive.arrivedCount}</strong>
                    <span>站</span>
                  </div>
                  <div>
                    <p>{archive.city}</p>
                    <h3>{archive.routeTitle}</h3>
                    <div className="journey-archive-metrics">
                      <span>
                        到达 {archive.arrivedCount}/
                        {archive.experienceStopCount}
                      </span>
                      <span>跳过 {archive.skippedCount}</span>
                      <span>打卡图 {archive.photoCount} 张</span>
                      <span>{formatArchiveTime(archive.completedAt)}</span>
                    </div>
                  </div>
                  <div className="journey-archive-actions">
                    <Link
                      className="secondary-link"
                      href={routeUrl(archive.routeId)}
                    >
                      查看路线
                    </Link>
                    <Link
                      className="secondary-link"
                      href={journeyUrl(archive.routeId)}
                    >
                      <Route size={15} />
                      继续体验
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <div className="library-empty">
                <CalendarDays size={24} />
                <span>
                  {archives.length > 0
                    ? "当前筛选下没有完成记录。"
                    : "还没有行程存档。完成一次路线后，分数、到达站点和打卡图会集中显示在这里。"}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <article>
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function summarizeArchives(archives: StoredJourneyArchive[]) {
  const scoreTotal = archives.reduce((total, archive) => total + archive.score, 0);
  return {
    count: archives.length,
    arrivedCount: archives.reduce(
      (total, archive) => total + archive.arrivedCount,
      0,
    ),
    photoCount: archives.reduce(
      (total, archive) => total + archive.photoCount,
      0,
    ),
    averageScore:
      archives.length > 0 ? Math.round(scoreTotal / archives.length) : 0,
  };
}

function formatArchiveTime(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function readJourneyArchivesSnapshot() {
  const storageValue =
    window.localStorage.getItem(journeyArchivesStorageKey) ?? "";

  if (cachedArchives?.key === storageValue) {
    return cachedArchives.archives;
  }

  const archives = readJourneyArchives();
  cachedArchives = {
    key: storageValue,
    archives,
  };

  return archives;
}

function subscribeToJourneyArchives(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => window.removeEventListener("storage", onStoreChange);
}
