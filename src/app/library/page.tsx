import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { RouteLibrary } from "@/components/routes/route-library";
import { SiteHeader } from "@/components/site-header";

export default function LibraryPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-intro compact">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} />
          返回
        </Link>
        <p>保存、同步与分享</p>
        <h1>我的路线档案</h1>
      </section>
      <section className="account-layout">
        <AuthPanel />
        <RouteLibrary />
      </section>
    </main>
  );
}
