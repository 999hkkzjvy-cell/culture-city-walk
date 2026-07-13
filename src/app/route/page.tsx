import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowLeft, Bookmark, Clock, MapPin, Share2, Sparkles } from "lucide-react";
import { RouteCloudActions } from "@/components/routes/route-cloud-actions";
import { SiteHeader } from "@/components/site-header";
import { calculateRouteTotals, demoRoute } from "@/lib/route";

export default function RoutePage() {
  const totals = calculateRouteTotals(demoRoute.stops);

  return (
    <main>
      <SiteHeader />
      <section className="route-hero">
        <div>
          <Link className="back-link" href="/plan/">
            <ArrowLeft size={16} />
            返回
          </Link>
          <p>{demoRoute.title}</p>
          <h1>{demoRoute.city} · 文学漫游</h1>
          <div className="route-meta">
            <span>
              <MapPin size={16} />
              {demoRoute.distanceKm} km
            </span>
            <span>
              <Clock size={16} />
              预计 {Math.round((totals.stayMinutes + totals.walkingMinutes) / 60)} 小时
            </span>
            <span>
              <Sparkles size={16} />
              {demoRoute.stops.length} 个站点
            </span>
          </div>
          <div className="theme-tabs">
            {demoRoute.themes.map((theme) => (
              <button className={theme === "文学" ? "selected" : ""} key={theme} type="button">
                {theme}
              </button>
            ))}
          </div>
        </div>
        <div className="route-tools">
          <button type="button">
            <Share2 size={17} />
            分享
          </button>
          <button type="button">
            <Bookmark size={17} />
            收藏
          </button>
        </div>
        <div className="postmark" aria-hidden="true">
          NANJING
          <br />
          1935
        </div>
      </section>

      <section className="route-cloud-band">
        <RouteCloudActions />
      </section>

      <section className="reader-layout">
        <aside className="map-pane">
          <button className="map-toggle" type="button">
            查看地图
          </button>
          <div className="paper-map" aria-label="路线地图示意图">
            <ol>
              {demoRoute.stops.map((stop, index) => (
                <li key={stop.id} style={{ "--i": index } as CSSProperties}>
                  <span>{index + 1}</span>
                  {stop.name}
                </li>
              ))}
            </ol>
            <div className="map-legend">
              <span>••• 步行路线</span>
              <span>● 站点</span>
              <span>◎ 地铁站</span>
            </div>
          </div>
        </aside>

        <div className="timeline">
          {demoRoute.stops.map((stop, index) => (
            <article className="stop-card" key={stop.id}>
              <div className="stop-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="stop-body">
                <div className="stop-time">
                  <strong>{stop.time}</strong>
                  {stop.walkingFromPrevious ? (
                    <span>
                      步行 {stop.walkingFromPrevious.minutes} 分钟 ·{" "}
                      {stop.walkingFromPrevious.distanceMeters} m
                    </span>
                  ) : (
                    <span>起点</span>
                  )}
                </div>
                <h2>
                  {stop.name}
                  {stop.mustVisit ? <em>必去</em> : null}
                </h2>
                <p>{stop.note}</p>
                <div className="stop-tags">
                  {stop.themes.map((theme) => (
                    <span key={theme}>{theme}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
