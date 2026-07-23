"use client";

import Link from "next/link";
import { ArrowRight, BookOpenText, MapPin, Route, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { Theme } from "@/lib/route";
import {
  recommendationDurations,
  recommendationPaces,
  recommendationThemes,
  recommendedRoutes,
  type RouteDuration,
  type RoutePace,
} from "@/lib/recommended-routes";

export function RecommendedRoutesExplorer() {
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
