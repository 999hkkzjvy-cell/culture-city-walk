import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecommendedRoutesExplorer } from "@/components/routes/recommended-routes-explorer";
import { SiteHeader } from "@/components/site-header";

export default function RecommendationsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-intro compact">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} />
          返回
        </Link>
        <p>精选主题路线</p>
        <h1>推荐路线</h1>
      </section>
      <RecommendedRoutesExplorer />
    </main>
  );
}
