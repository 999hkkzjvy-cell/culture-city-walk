"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Check,
  Clock3,
  EyeOff,
  MapPinned,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  defaultDraft,
  demoRoute,
  getThemeSummary,
  type RouteDraft,
  type Theme,
} from "@/lib/route";
import {
  candidatePlaceTypes,
  generateRouteCandidates,
  getCandidateBandLabel,
  type CandidateFitBand,
  type CandidatePlaceType,
  type RouteCandidate,
} from "@/lib/route-candidates";
import {
  parseIntentWithFallback,
  rankCandidatesWithFallback,
  type AiUsageRecord,
} from "@/lib/ai/route-collaboration";
import {
  calculateRouteKernel,
  formatTime,
  parseTime,
} from "@/lib/route-kernel";
import {
  insertCandidateIntoRoute,
  moveRouteStop,
  removeRouteStop,
  updateStopStayMinutes,
} from "@/lib/route-editing";
import {
  readCandidateState,
  readDraft,
  readRoutePlan,
  saveCandidateState,
  saveDraft,
  saveRoutePlan,
  type StoredCandidateAction,
} from "@/lib/storage";
import { routeUrl } from "@/lib/urls";

const allThemes: Theme[] = ["历史", "文学", "建筑", "音乐", "书店", "美食"];
type CandidateAction = "joined" | "backup" | "ignored";
const candidateBands: CandidateFitBand[] = [
  "very_along",
  "recommended",
  "optional",
];

export function PlanningDesk() {
  const [draft, setDraft] = useState<RouteDraft>(() =>
    typeof window === "undefined" ? defaultDraft : readDraft(),
  );
  const [saved, setSaved] = useState(false);
  const [requestText, setRequestText] = useState(
    "我已有先锋书店和总统府，想补一点历史和文学线索，中午不要太赶。",
  );
  const [candidates, setCandidates] = useState<RouteCandidate[]>([]);
  const [candidateActions, setCandidateActions] = useState<
    Record<string, CandidateAction>
  >(() =>
    typeof window === "undefined"
      ? {}
      : (readCandidateState().actions as Record<string, CandidateAction>),
  );
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsageRecord | null>(null);
  const [previewRoute, setPreviewRoute] = useState(() =>
    typeof window === "undefined" ? demoRoute : readRoutePlan(),
  );
  const [selectedCandidateTypes, setSelectedCandidateTypes] =
    useState<CandidatePlaceType[]>(candidatePlaceTypes);

  const summary = useMemo(() => getThemeSummary(draft.themes), [draft.themes]);
  const baseKernel = useMemo(() => calculateRouteKernel(demoRoute), []);
  const previewKernel = useMemo(
    () => calculateRouteKernel(previewRoute),
    [previewRoute],
  );
  const routeImpactMinutes =
    previewKernel.totalMinutes - baseKernel.totalMinutes;
  const routeImpactMeters =
    previewKernel.totalWalkingMeters - baseKernel.totalWalkingMeters;
  const previewEndTime = getRouteEndTime(previewKernel.stops);
  const visibleCandidates = candidates.filter(
    (candidate) =>
      candidateActions[candidate.id] !== "ignored" &&
      selectedCandidateTypes.includes(candidate.placeType),
  );
  const groupedCandidates = candidateBands.map((band) => ({
    band,
    candidates: visibleCandidates.filter(
      (candidate) => candidate.fitBand === band,
    ),
  }));

  function toggleTheme(theme: Theme) {
    setSaved(false);
    setDraft((current) => {
      const themes = current.themes.includes(theme)
        ? current.themes.filter((item) => item !== theme)
        : [...current.themes, theme];

      return {
        ...current,
        themes,
      };
    });
  }

  function persistDraft() {
    saveDraft(draft);
    saveRoutePlan(previewRoute);
    saveCandidateState({
      routeId: previewRoute.id,
      actions: candidateActions as Record<string, StoredCandidateAction>,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
  }

  function generateSuggestions() {
    const intent = parseIntentWithFallback(requestText, draft);
    const localCandidates = generateRouteCandidates(previewRoute, {
      themes: intent.data.themeFilters,
      acceptedTypes: selectedCandidateTypes,
      maxResults: 5,
    });
    const ranked = rankCandidatesWithFallback(localCandidates, intent.data);

    setCandidates(ranked.data);
    setCandidateActions({});
    persistCandidateActions({});
    setAiWarnings([...intent.warnings, ...ranked.warnings]);
    setAiUsage(ranked.usage);
  }

  function markCandidate(candidateId: string, action: CandidateAction) {
    const nextActions = {
      ...candidateActions,
      [candidateId]: action,
    };

    setCandidateActions(nextActions);
    persistCandidateActions(nextActions);
  }

  function clearCandidateAction(candidateId: string) {
    setCandidateActions((current) => {
      const next = { ...current };
      delete next[candidateId];
      persistCandidateActions(next);
      return next;
    });
  }

  function toggleCandidateInRoute(candidate: RouteCandidate) {
    setSaved(false);

    if (candidateActions[candidate.id] === "joined") {
      setPreviewRoute((current) =>
        persistPreviewRoute(removeRouteStop(current, candidate.id)),
      );
      clearCandidateAction(candidate.id);
      return;
    }

    setPreviewRoute((current) =>
      persistPreviewRoute(insertCandidateIntoRoute(current, candidate)),
    );
    markCandidate(candidate.id, "joined");
  }

  function removePreviewStop(stopId: string) {
    setSaved(false);
    setPreviewRoute((current) =>
      persistPreviewRoute(removeRouteStop(current, stopId)),
    );
    clearCandidateAction(stopId);
  }

  function movePreviewStop(fromIndex: number, toIndex: number) {
    setSaved(false);
    setPreviewRoute((current) =>
      persistPreviewRoute(moveRouteStop(current, fromIndex, toIndex)),
    );
  }

  function changeStayMinutes(stopId: string, stayMinutes: number) {
    setSaved(false);
    setPreviewRoute((current) =>
      persistPreviewRoute(updateStopStayMinutes(current, stopId, stayMinutes)),
    );
  }

  function toggleCandidateType(type: CandidatePlaceType) {
    setSelectedCandidateTypes((current) => {
      if (current.length === 1 && current.includes(type)) {
        return candidatePlaceTypes;
      }

      return current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type];
    });
  }

  function persistPreviewRoute(route: typeof previewRoute) {
    saveRoutePlan(route);
    return route;
  }

  function persistCandidateActions(actions: Record<string, CandidateAction>) {
    saveCandidateState({
      routeId: previewRoute.id,
      actions: actions as Record<string, StoredCandidateAction>,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="plan-shell">
      <div className="conversation">
        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>今天去哪座城市？</p>
            <button className="answer-pill" type="button">
              {draft.city}
              <Pencil size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>有一定要去的地方吗？</p>
            <div className="chip-row">
              {draft.mustVisits.map((place) => (
                <span className="chip selected" key={place}>
                  {place}
                </span>
              ))}
              <button className="chip" type="button">
                + 添加更多
              </button>
            </div>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>更偏向什么？（可多选）</p>
            <div className="chip-grid">
              {allThemes.map((theme) => (
                <button
                  className={
                    draft.themes.includes(theme) ? "chip selected" : "chip"
                  }
                  key={theme}
                  onClick={() => toggleTheme(theme)}
                  type="button"
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>步行距离接受多少？</p>
            <div className="chip-row">
              {["5km以内", "5-10 km", "10-15km", "15km以上"].map((range) => (
                <button
                  className={
                    draft.walkingRangeKm === range ? "chip selected" : "chip"
                  }
                  key={range}
                  onClick={() => {
                    setSaved(false);
                    setDraft((current) => ({
                      ...current,
                      walkingRangeKm: range,
                    }));
                  }}
                  type="button"
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>想要怎样的节奏？</p>
            <div className="chip-row">
              {["轻松漫步", "平衡", "充实紧凑"].map((pace) => (
                <button
                  className={draft.pace === pace ? "chip selected" : "chip"}
                  key={pace}
                  onClick={() => {
                    setSaved(false);
                    setDraft((current) => ({
                      ...current,
                      pace: pace as RouteDraft["pace"],
                    }));
                  }}
                  type="button"
                >
                  {pace}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="chat-row">
          <span className="ai-dot">AI</span>
          <div>
            <p>用一句话补充这次路线目标。</p>
            <textarea
              className="intent-input"
              onChange={(event) => setRequestText(event.target.value)}
              rows={3}
              value={requestText}
            />
            <div className="candidate-toolbar">
              <button
                className="primary-action compact"
                onClick={generateSuggestions}
                type="button"
              >
                生成沿途候选
                <Sparkles size={17} />
              </button>
              <span>高德与 DeepSeek 未配置时使用本地规则。</span>
            </div>
          </div>
        </div>

        <section className="candidate-panel" aria-label="沿途可选点">
          <div className="candidate-panel-heading">
            <div>
              <p>沿途可选点</p>
              <h2>Complete 模式预案</h2>
            </div>
            {aiUsage ? (
              <span>
                {aiUsage.model} · {aiUsage.estimatedCostCny.toFixed(2)} CNY
              </span>
            ) : (
              <span>待生成</span>
            )}
          </div>

          <div className="candidate-type-filter" aria-label="候选点类型筛选">
            {candidatePlaceTypes.map((type) => (
              <button
                className={
                  selectedCandidateTypes.includes(type) ? "selected" : ""
                }
                key={type}
                onClick={() => toggleCandidateType(type)}
                type="button"
              >
                {type}
              </button>
            ))}
          </div>

          {aiWarnings.length > 0 ? (
            <div className="candidate-warning">
              {aiWarnings.map((warning) => (
                <span key={warning}>{warning}</span>
              ))}
            </div>
          ) : null}

          <div className="candidate-list">
            {visibleCandidates.length > 0 ? (
              groupedCandidates.map(({ band, candidates: bandCandidates }) =>
                bandCandidates.length > 0 ? (
                  <section className="candidate-group" key={band}>
                    <h3>
                      {getCandidateBandLabel(band)}
                      <span>{bandCandidates.length}</span>
                    </h3>
                    {bandCandidates.map((candidate) => {
                      const action = candidateActions[candidate.id];

                      return (
                        <article className="candidate-item" key={candidate.id}>
                          <div>
                            <span className="candidate-band">
                              分数 {candidate.score}
                            </span>
                            <h3>{candidate.place.name}</h3>
                            <p>
                              新增步行约 {candidate.detourMinutes} 分钟 · 停留{" "}
                              {candidate.stayMinutes} 分钟 · 插入第{" "}
                              {candidate.insertionIndex + 1} 段后
                            </p>
                          </div>
                          <div className="candidate-tags">
                            {candidate.themes.map((theme) => (
                              <span key={theme}>{theme}</span>
                            ))}
                            <span>{candidate.placeType}</span>
                            {candidate.risks.map((risk) => (
                              <span key={risk}>{risk}</span>
                            ))}
                          </div>
                          <ul>
                            {candidate.reasons.slice(0, 3).map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                          <div className="candidate-actions">
                            <button
                              className={action === "joined" ? "selected" : ""}
                              onClick={() => toggleCandidateInRoute(candidate)}
                              type="button"
                            >
                              {action === "joined" ? (
                                <Check size={15} />
                              ) : (
                                <Plus size={15} />
                              )}
                              {action === "joined" ? "撤销加入" : "加入路线"}
                            </button>
                            <button
                              className={action === "backup" ? "selected" : ""}
                              onClick={() =>
                                markCandidate(candidate.id, "backup")
                              }
                              type="button"
                            >
                              <Bookmark size={15} />
                              设为备用
                            </button>
                            <button
                              onClick={() =>
                                markCandidate(candidate.id, "ignored")
                              }
                              type="button"
                            >
                              <EyeOff size={15} />
                              忽略
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </section>
                ) : null,
              )
            ) : (
              <div className="candidate-empty">
                <MapPinned size={22} />
                <span>先生成候选点，再决定加入、备用或忽略。</span>
              </div>
            )}
          </div>
        </section>

        <div className="plan-actions">
          <button
            className="primary-action"
            onClick={persistDraft}
            type="button"
          >
            {saved ? "草稿已保存" : "保存草稿"}
            {saved ? <Check size={18} /> : <ArrowRight size={18} />}
          </button>
          <Link className="secondary-link" href={routeUrl("demo")}>
            查看生成路线
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <aside className="route-brief">
        <div className="paperclip" aria-hidden="true" />
        <h2>路线摘要</h2>
        <dl>
          <div>
            <dt>城市</dt>
            <dd>{draft.city}</dd>
          </div>
          <div>
            <dt>模式</dt>
            <dd>完善（补全路线）</dd>
          </div>
          <div>
            <dt>时间</dt>
            <dd>一天（约 {draft.durationHours} 小时）</dd>
          </div>
          <div>
            <dt>步行距离</dt>
            <dd>{draft.walkingRangeKm}</dd>
          </div>
          <div>
            <dt>必去地点</dt>
            <dd>{draft.mustVisits.join("、")}</dd>
          </div>
          <div>
            <dt>兴趣偏好</dt>
            <dd>{summary}</dd>
          </div>
          <div>
            <dt>预案结束</dt>
            <dd>
              {previewEndTime} · {routeImpactMinutes >= 0 ? "+" : ""}
              {routeImpactMinutes} 分钟
            </dd>
          </div>
          <div>
            <dt>步行变化</dt>
            <dd>
              {(previewKernel.totalWalkingMeters / 1000).toFixed(1)} km ·{" "}
              {routeImpactMeters >= 0 ? "+" : ""}
              {(routeImpactMeters / 1000).toFixed(1)} km
            </dd>
          </div>
        </dl>

        <div className="route-preview-list" aria-label="路线预案站点">
          {previewKernel.stops.map((stop, index) => (
            <article className="route-preview-stop" key={stop.id}>
              <div>
                <strong>
                  {index + 1}. {stop.name}
                </strong>
                <span>
                  {stop.calculatedTime} · 停留 {stop.stayMinutes} 分钟
                </span>
              </div>
              <div className="route-preview-controls">
                <button
                  aria-label={`上移 ${stop.name}`}
                  disabled={index === 0}
                  onClick={() => movePreviewStop(index, index - 1)}
                  type="button"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  aria-label={`下移 ${stop.name}`}
                  disabled={index === previewKernel.stops.length - 1}
                  onClick={() => movePreviewStop(index, index + 1)}
                  type="button"
                >
                  <ChevronDown size={14} />
                </button>
                <label>
                  <Clock3 size={13} />
                  <input
                    aria-label={`${stop.name} 停留分钟`}
                    max={240}
                    min={5}
                    onChange={(event) =>
                      changeStayMinutes(stop.id, Number(event.target.value))
                    }
                    step={5}
                    type="number"
                    value={stop.stayMinutes}
                  />
                </label>
                <button
                  aria-label={`删除 ${stop.name}`}
                  disabled={previewKernel.stops.length <= 2}
                  onClick={() => removePreviewStop(stop.id)}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="brief-sketch compact">
          <MapPinned size={24} aria-hidden="true" />
          <span>estimated preview</span>
        </div>
      </aside>
    </section>
  );
}

function getRouteEndTime(
  stops: { calculatedTime: string; stayMinutes: number }[],
) {
  const lastStop = stops.at(-1);

  if (!lastStop) {
    return "--:--";
  }

  const lastArrivalMinutes = parseTime(lastStop.calculatedTime);

  return lastArrivalMinutes === null
    ? "--:--"
    : formatTime(lastArrivalMinutes + lastStop.stayMinutes);
}
