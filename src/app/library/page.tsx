import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { LibraryWorkspace } from "@/components/routes/library-workspace";
import { SiteHeader } from "@/components/site-header";
import { journeyArchiveUrl } from "@/lib/urls";

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
        <Link className="secondary-link" href={journeyArchiveUrl()}>
          <CalendarDays size={16} />
          查看行程存档
        </Link>
      </section>
      <LibraryWorkspace />
    </main>
  );
}
