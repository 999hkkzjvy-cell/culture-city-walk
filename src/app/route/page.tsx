import { RouteReader } from "@/components/routes/route-reader";
import { SiteHeader } from "@/components/site-header";

export default function RoutePage() {
  return (
    <main>
      <SiteHeader />
      <RouteReader />
    </main>
  );
}
