import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SharedRouteReader } from "@/components/routes/shared-route-reader";
import { SiteHeader } from "@/components/site-header";

export default function SharePage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-intro compact">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} />
          返回
        </Link>
        <p>只读分享路线</p>
        <h1>朋友发来的一段城市阅读</h1>
      </section>
      <section className="account-layout single">
        <SharedRouteReader />
      </section>
    </main>
  );
}
