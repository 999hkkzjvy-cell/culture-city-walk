"use client";

import Link from "next/link";
import { ArrowRight, Check, MapPinned, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { defaultDraft, getThemeSummary, type RouteDraft, type Theme } from "@/lib/route";
import { readDraft, saveDraft } from "@/lib/storage";

const allThemes: Theme[] = ["历史", "文学", "建筑", "音乐", "书店", "美食"];

export function PlanningDesk() {
  const [draft, setDraft] = useState<RouteDraft>(() =>
    typeof window === "undefined" ? defaultDraft : readDraft(),
  );
  const [saved, setSaved] = useState(false);

  const summary = useMemo(() => getThemeSummary(draft.themes), [draft.themes]);

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
    setSaved(true);
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
                  className={draft.themes.includes(theme) ? "chip selected" : "chip"}
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
                  className={draft.walkingRangeKm === range ? "chip selected" : "chip"}
                  key={range}
                  onClick={() => {
                    setSaved(false);
                    setDraft((current) => ({ ...current, walkingRangeKm: range }));
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

        <div className="plan-actions">
          <button className="primary-action" onClick={persistDraft} type="button">
            {saved ? "草稿已保存" : "保存草稿"}
            {saved ? <Check size={18} /> : <ArrowRight size={18} />}
          </button>
          <Link className="secondary-link" href="/route/?id=demo">
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
        </dl>
        <div className="brief-sketch">
          <MapPinned size={28} aria-hidden="true" />
          <span>route archive</span>
        </div>
      </aside>
    </section>
  );
}
