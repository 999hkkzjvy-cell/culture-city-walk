import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { recommendedRoutes } from "@/lib/recommended-routes";
import { assetPath } from "@/lib/site";
import { routeUrl } from "@/lib/urls";

const modes = [
  {
    title: "AI 帮我发现",
    text: "我只有时间和兴趣，剩下交给 AI。",
    href: "/plan/",
    artifact: "compass",
  },
  {
    title: "我已有几个目标",
    text: "告诉 AI 必去的地方，补全顺路路线。",
    href: "/plan/",
    artifact: "pins",
  },
  {
    title: "我已有路线",
    text: "导入或粘贴路线，帮我优化体验。",
    href: routeUrl("demo"),
    artifact: "notebook",
  },
];

export default function Home() {
  const heroImage = assetPath("/images/city-archive-hero.png");

  return (
    <main>
      <SiteHeader />

      <section className="hero">
        <div className="hero-copy">
          <span className="archive-stamp">THE CITY WITH AI</span>
          <h1>细读一座城</h1>
          <p>AI 与你一起，探索城市中的故事与连接。</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="带有档案质感的中国城市江岸历史建筑"
          className="hero-image"
          src={heroImage}
        />
      </section>

      <section aria-label="规划模式" className="mode-panel">
        {modes.map((mode) => (
          <Link className="mode-card" href={mode.href} key={mode.title}>
            <span
              aria-hidden="true"
              className={`mode-art mode-art-${mode.artifact}`}
            >
              <i />
              <b />
              <em />
            </span>
            <span>
              <strong>{mode.title}</strong>
              <small>{mode.text}</small>
            </span>
            <ArrowRight aria-hidden="true" size={22} />
          </Link>
        ))}
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>南京城市伴游</h2>
          <Link href="/recommendations/">
            查看全部
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="theme-grid">
          {recommendedRoutes.map((theme, index) => (
            <Link className="theme-card" href={theme.href} key={theme.title}>
              <div
                className={`theme-image theme-image-${index + 1}`}
                style={
                  { "--theme-image": `url("${heroImage}")` } as CSSProperties
                }
              />
              <p>{theme.city}</p>
              <h3>{theme.title}</h3>
              <span>{theme.centralQuestion}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="quote-band">
        <blockquote>每一条路线，都是重新阅读一座城市的方式。</blockquote>
        <p>Cultural Citywalk</p>
      </section>

      <footer className="site-footer">
        <nav aria-label="页脚导航">
          <Link href="/about/">关于我们</Link>
          <Link href="/guide/">如何使用</Link>
          <Link href="/plan/">开始规划</Link>
        </nav>
        <form>
          <label htmlFor="newsletter">订阅灵感周报</label>
          <div>
            <input id="newsletter" placeholder="输入你的邮箱" type="email" />
            <button aria-label="提交订阅" type="submit">
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </footer>
    </main>
  );
}
