import Link from "next/link";
import { ArrowRight, BookMarked, Map, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const principles = [
  {
    title: "地理优先",
    text: "路线先要真实可走，再去叠加主题、故事和个人偏好。",
    icon: Map,
  },
  {
    title: "主题增强",
    text: "历史、文学、建筑、音乐和书店不是标签，而是阅读城市的不同角度。",
    icon: BookMarked,
  },
  {
    title: "事实可核验",
    text: "地点、时间、步行距离和来源状态会被明确标注，不用漂亮文案掩盖不确定性。",
    icon: ShieldCheck,
  },
];

export default function AboutPage() {
  return (
    <main>
      <SiteHeader />

      <section className="info-hero">
        <p>ABOUT CULTURAL CITYWALK</p>
        <h1>我们想把城市重新变成一本可以慢慢读的书。</h1>
        <div className="info-hero-meta">
          <span>私人城市漫游助手</span>
          <span>路线规划</span>
          <span>文化阅读</span>
        </div>
      </section>

      <section className="info-layout">
        <article className="info-prose">
          <h2>为什么做这个产品</h2>
          <p>
            大多数旅行工具擅长告诉你“去哪儿”，但很少帮你理解“为什么这样走”。
            Cultural Citywalk
            关注一条路线背后的时间、人物、街区和记忆，希望让一次步行不只是打卡，而是一种阅读城市的方法。
          </p>
          <p>
            我们把产品原则定为：地理优先，主题增强，AI 协作，事实可核验。 AI
            可以协助整理偏好、解释取舍和生成讲解，但地点真实性、路网耗时和关键事实必须由地图、数据库和用户确认共同支撑。
          </p>
        </article>

        <aside className="info-note">
          <span>当前状态</span>
          <p>
            产品仍在开发中。现阶段已有路线阅读、保存分享、候选点预案和本地 AI
            fallback；高德真实路线和 DeepSeek API 会在密钥配置后逐步接入。
          </p>
        </aside>
      </section>

      <section className="info-principles" aria-label="产品原则">
        {principles.map((principle) => {
          const Icon = principle.icon;

          return (
            <article key={principle.title}>
              <Icon aria-hidden="true" size={28} strokeWidth={1.6} />
              <h2>{principle.title}</h2>
              <p>{principle.text}</p>
            </article>
          );
        })}
      </section>

      <section className="info-cta">
        <div>
          <p>开始之前，不需要完整计划。</p>
          <h2>带上几个想去的地方，剩下的路线可以慢慢补齐。</h2>
        </div>
        <Link href="/plan/">
          开始规划
          <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
