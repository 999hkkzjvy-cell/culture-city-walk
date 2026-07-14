import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProfileCenter } from "@/components/auth/profile-center";
import { SiteHeader } from "@/components/site-header";

export default function ProfilePage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-intro compact">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} />
          返回
        </Link>
        <p>账号</p>
        <h1>个人中心</h1>
      </section>
      <section className="account-layout single">
        <ProfileCenter />
      </section>
    </main>
  );
}
