import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MapPinned,
  Route,
  SlidersHorizontal,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { routeUrl } from "@/lib/urls";

const steps = [
  {
    title: "选择规划方式",
    text: "从发现、完善或优化三种入口开始。现在最完整的是“我已有几个目标”的 Complete 模式。",
    icon: SlidersHorizontal,
  },
  {
    title: "输入必去点和偏好",
    text: "告诉系统城市、出行强度、主题偏好和必须去的地点，先形成一条基础路线。",
    icon: MapPinned,
  },
  {
    title: "查看沿途候选点",
    text: "候选点会按顺路程度、类型和主题匹配分组。你可以加入路线、设为备用或忽略。",
    icon: CheckCircle2,
  },
  {
    title: "编辑路线并保存",
    text: "调整站点顺序、停留时间、路途方式和路线长度。登录后可以保存到云端并生成分享链接。",
    icon: Route,
  },
];

const notices = [
  "当前路途时间仍可能是本地估算，页面会标注数据来源。",
  "未核验的历史或文学内容会保留待确认状态。",
  "高德和 AI API 接入后，候选点和讲解会逐步替换为真实 provider 输出。",
];

export default function GuidePage() {
  return (
    <main>
      <SiteHeader />

      <section className="info-hero guide">
        <p>HOW TO USE</p>
        <h1>从几个地点开始，把一段城市步行整理成可走、可读、可分享的路线。</h1>
        <div className="info-hero-meta">
          <span>Complete 模式优先</span>
          <span>本地 fallback 可用</span>
          <span>保存与分享</span>
        </div>
      </section>

      <section className="guide-steps" aria-label="使用步骤">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <article key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Icon aria-hidden="true" size={30} strokeWidth={1.6} />
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </article>
          );
        })}
      </section>

      <section className="guide-panel">
        <article>
          <h2>推荐的一次完整流程</h2>
          <ol>
            <li>进入规划页，保留或修改默认南京示例。</li>
            <li>选择历史、文学、建筑等主题偏好。</li>
            <li>点击“生成沿途候选”，查看不同顺路程度的补点。</li>
            <li>把合适候选加入路线，再调整停留时间、交通方式或站点顺序。</li>
            <li>确认路线后保存草稿，或进入路线阅读页查看时间轴。</li>
          </ol>
        </article>

        <aside>
          <h2>使用时留意</h2>
          <ul>
            {notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="info-cta">
        <div>
          <p>想先看成品效果？</p>
          <h2>打开示例路线，看看路线阅读页如何呈现站点、时间和地图来源。</h2>
        </div>
        <Link href={routeUrl("demo")}>
          查看示例路线
          <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
