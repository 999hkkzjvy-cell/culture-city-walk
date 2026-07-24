"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Clock3,
  ExternalLink,
  FileCheck2,
  MapPin,
  Milestone,
  Route,
  Search,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  getCuratedRouteDraft,
  type CuratedRouteDraft,
} from "@/lib/curated-route-drafts";
import type { Theme } from "@/lib/route";
import {
  recommendationDurations,
  recommendationPaces,
  recommendationThemes,
  recommendedRoutes,
  type RouteDuration,
  type RoutePace,
} from "@/lib/recommended-routes";
import {
  readRecommendedRouteDraftId,
  recommendedRoutesUrl,
} from "@/lib/urls";

export function RecommendedRoutesExplorer() {
  const searchParams = useSearchParams();
  const activeDraft = getCuratedRouteDraft(
    readRecommendedRouteDraftId(searchParams),
  );
  const [cityKeyword, setCityKeyword] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<Theme[]>([]);
  const [selectedPaces, setSelectedPaces] = useState<RoutePace[]>([]);
  const [selectedDurations, setSelectedDurations] = useState<RouteDuration[]>(
    [],
  );
  const filteredRoutes = useMemo(() => {
    const city = cityKeyword.trim();

    return recommendedRoutes.filter((route) => {
      const cityMatches = !city || route.city.includes(city);
      const themeMatches =
        selectedThemes.length === 0 ||
        selectedThemes.every((theme) => route.themes.includes(theme));
      const paceMatches =
        selectedPaces.length === 0 || selectedPaces.includes(route.pace);
      const durationMatches =
        selectedDurations.length === 0 ||
        selectedDurations.includes(route.duration);

      return cityMatches && themeMatches && paceMatches && durationMatches;
    });
  }, [cityKeyword, selectedDurations, selectedPaces, selectedThemes]);

  if (activeDraft) {
    return <EditorialRouteDraftDetail draft={activeDraft} />;
  }

  function toggleValue<T>(value: T, values: T[], setter: (next: T[]) => void) {
    setter(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }

  return (
    <section className="recommendation-layout">
      <aside className="recommendation-sidebar" aria-label="推荐路线筛选">
        <div>
          <p>筛选</p>
          <h2>推荐路线</h2>
        </div>

        <label className="recommendation-search">
          <Search size={16} />
          城市
          <input
            onChange={(event) => setCityKeyword(event.target.value)}
            placeholder="输入城市名"
            value={cityKeyword}
          />
        </label>

        <FilterGroup label="主题">
          {recommendationThemes.map((theme) => (
            <button
              className={selectedThemes.includes(theme) ? "selected" : ""}
              key={theme}
              onClick={() =>
                toggleValue(theme, selectedThemes, setSelectedThemes)
              }
              type="button"
            >
              {theme}
            </button>
          ))}
        </FilterGroup>

        <FilterGroup label="节奏">
          {recommendationPaces.map((pace) => (
            <button
              className={selectedPaces.includes(pace) ? "selected" : ""}
              key={pace}
              onClick={() => toggleValue(pace, selectedPaces, setSelectedPaces)}
              type="button"
            >
              {pace}
            </button>
          ))}
        </FilterGroup>

        <FilterGroup label="时长">
          {recommendationDurations.map((duration) => (
            <button
              className={selectedDurations.includes(duration) ? "selected" : ""}
              key={duration}
              onClick={() =>
                toggleValue(duration, selectedDurations, setSelectedDurations)
              }
              type="button"
            >
              {duration}
            </button>
          ))}
        </FilterGroup>
      </aside>

      <div className="recommendation-results">
        <div className="recommendation-results-heading">
          <div>
            <p>精选主题路线</p>
            <h2>{filteredRoutes.length} 条路线</h2>
          </div>
          <span>可按城市、主题、节奏和时长组合筛选</span>
        </div>

        {filteredRoutes.length > 0 ? (
          <div className="recommendation-grid">
            {filteredRoutes.map((route) => (
              <Link
                className="recommendation-card"
                href={route.href}
                key={route.id}
              >
                <div>
                  <span>
                    <MapPin size={15} />
                    {route.city}
                  </span>
                  <strong>{route.title}</strong>
                  <p className="recommendation-question">{route.centralQuestion}</p>
                  <p>{route.summary}</p>
                  <div className="recommendation-preview">
                    <Route size={15} />
                    <span>{route.previewStops.join(" → ")}</span>
                  </div>
                </div>
                <div className="recommendation-share-copy">
                  <BookOpenText size={15} />
                  <span>{route.storyHighlights.join(" · ")}</span>
                </div>
                <div className="recommendation-tags">
                  {route.themes.map((theme) => (
                    <span key={theme}>{theme}</span>
                  ))}
                  <span>{route.pace}</span>
                  <span>{route.duration}</span>
                  <span>{route.bestFor}</span>
                  {route.status === "review" ? <span>编辑稿待审核</span> : null}
                </div>
                <em>
                  {route.status === "review" ? "查看编辑稿" : "开始路线"}
                  <ArrowRight size={15} />
                </em>
              </Link>
            ))}
          </div>
        ) : (
          <div className="library-empty">
            <MapPin size={24} />
            <span>没有符合当前筛选的推荐路线。</span>
          </div>
        )}
      </div>
    </section>
  );
}

function EditorialRouteDraftDetail({ draft }: { draft: CuratedRouteDraft }) {
  const sources = new Map(draft.sources.map((source) => [source.id, source]));

  return (
    <section className="editorial-route-draft" aria-label="路线编辑稿">
      <div className="editorial-route-draft-topline">
        <Link className="back-link" href={recommendedRoutesUrl()}>
          <ArrowLeft size={16} />
          返回精选路线
        </Link>
        <span>
          <FileCheck2 size={15} />
          编辑审核中 · 未发布
        </span>
      </div>

      <header className="editorial-route-draft-hero">
        <p>{draft.city} · 主题路线内容包</p>
        <h2>{draft.title}</h2>
        <strong>{draft.centralQuestion}</strong>
        <span>{draft.summary}</span>
      </header>

      <div className="editorial-route-draft-grid">
        <section className="editorial-route-arc" aria-labelledby="draft-arc-title">
          <div className="editorial-section-heading">
            <Milestone size={18} />
            <div>
              <p>路线主线</p>
              <h3 id="draft-arc-title">这条路线要怎样讲完</h3>
            </div>
          </div>
          <ol>
            {draft.narrativeArc.map((chapter, index) => (
              <li key={chapter}>
                <span>{index + 1}</span>
                <p>{chapter}</p>
              </li>
            ))}
          </ol>
        </section>

        <aside className="editorial-route-review-note">
          <ShieldAlert size={20} />
          <div>
            <strong>尚不能直接开始路线</strong>
            <p>
              这是给内容审核用的路线底稿。站点、资料与叙事已收拢，但开放、预约、步行和深读仍需逐项确认。
            </p>
          </div>
        </aside>
      </div>

      <section className="editorial-route-stops" aria-labelledby="draft-stops-title">
        <div className="editorial-section-heading">
          <Route size={18} />
          <div>
            <p>体验站点</p>
            <h3 id="draft-stops-title">每一站在主题里承担什么</h3>
          </div>
        </div>
        <div className="editorial-stop-list">
          {draft.stops.map((stop, index) => (
            <article key={stop.id}>
              <span className="editorial-stop-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <div className="editorial-stop-title">
                  <h4>{stop.name}</h4>
                  <span>{journeyRoleLabels[stop.journeyRole]}</span>
                </div>
                <p>{stop.purpose}</p>
                <div className="editorial-stop-sources">
                  {stop.sourceIds.map((sourceId) => {
                    const source = sources.get(sourceId);
                    if (!source) {
                      return null;
                    }

                    return (
                      <a
                        href={source.url}
                        key={source.id}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {source.publisher}
                        <ExternalLink size={13} />
                      </a>
                    );
                  })}
                </div>
                {stop.reviewNote ? (
                  <small>{stop.reviewNote}</small>
                ) : null}
                {stop.deepReadingFocus ? (
                  <small className="editorial-stop-deep-reading">
                    深读线索：{stop.deepReadingFocus}
                    {stop.taskDirection ? ` 任务方向：${stop.taskDirection}` : ""}
                  </small>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {draft.schedule ? (
        <section
          className="editorial-route-schedule"
          aria-labelledby="draft-schedule-title"
        >
          <div className="editorial-section-heading">
            <Clock3 size={18} />
            <div>
              <p>固定时间与服务节点</p>
              <h3 id="draft-schedule-title">当天怎么走</h3>
            </div>
          </div>
          <p className="editorial-route-schedule-intro">
            早餐和午餐也是独立站点，会生成各自的深读与现场任务；它们不替代路线的文化核心站。
          </p>
          <ol>
            {draft.schedule.map((item) => (
              <li key={`${item.time}-${item.title}`}>
                <time>{item.time}</time>
                <div>
                  <span>{item.kind}</span>
                  <h4>{item.title}</h4>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="editorial-route-draft-grid editorial-route-draft-bottom">
        <section className="editorial-route-sources" aria-labelledby="draft-sources-title">
          <div className="editorial-section-heading">
            <BookOpenText size={18} />
            <div>
              <p>资料台账</p>
              <h3 id="draft-sources-title">本稿采用的可追溯资料</h3>
            </div>
          </div>
          <ul>
            {draft.sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} rel="noreferrer" target="_blank">
                  <span>{source.title}</span>
                  <ExternalLink size={14} />
                </a>
                <small>
                  {source.publisher} · {sourceKindLabels[source.kind]} ·
                  核验于 {source.checkedAt}
                </small>
              </li>
            ))}
          </ul>
        </section>

        <section className="editorial-route-review-list" aria-labelledby="draft-review-title">
          <div className="editorial-section-heading">
            <FileCheck2 size={18} />
            <div>
              <p>发布前审核</p>
              <h3 id="draft-review-title">还需要确认什么</h3>
            </div>
          </div>
          <ul>
            {draft.reviewFocus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

const journeyRoleLabels = {
  anchor: "核心站",
  support: "支撑站",
  bridge: "连接站",
  ending: "收束站",
  rest: "服务站",
} as const;

const sourceKindLabels = {
  official: "官方资料",
  authority: "权威资料",
  academic: "学术机构资料",
  cultural: "文化资料（待核验）",
  map: "地图资料",
} as const;

function FilterGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section className="recommendation-filter-group">
      <h3>{label}</h3>
      <div className="filter-chip-row">{children}</div>
    </section>
  );
}
