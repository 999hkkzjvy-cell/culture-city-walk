import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JourneyArchiveBrowser } from "@/components/routes/journey-archive-browser";
import { SiteHeader } from "@/components/site-header";
import { libraryUrl } from "@/lib/urls";

export default function JourneysPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-intro compact">
        <Link className="back-link" href={libraryUrl()}>
          <ArrowLeft size={16} />
          返回路线档案
        </Link>
        <p>现场记录与完成回看</p>
        <h1>行程存档</h1>
      </section>
      <JourneyArchiveBrowser />
    </main>
  );
}
