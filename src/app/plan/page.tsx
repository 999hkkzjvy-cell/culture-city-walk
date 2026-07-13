import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanningDesk } from "@/components/planning-desk";
import { SiteHeader } from "@/components/site-header";

export default function PlanPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-intro compact">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} />
          返回
        </Link>
        <p>与 AI 一起规划你的城市漫游</p>
        <h1>正在整理一条适合今天的路线</h1>
      </section>
      <PlanningDesk />
    </main>
  );
}
