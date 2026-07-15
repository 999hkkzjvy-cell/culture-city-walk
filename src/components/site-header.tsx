import Link from "next/link";
import { AuthNav } from "@/components/auth/auth-nav";
import { libraryUrl, recommendedRoutesUrl } from "@/lib/urls";

const navItems = [
  { label: "首页", href: "/" },
  { label: "开始规划", href: "/plan/" },
  { label: "我的路线", href: libraryUrl() },
  { label: "推荐路线", href: recommendedRoutesUrl() },
  { label: "关于我们", href: "/about/" },
  { label: "如何使用", href: "/guide/" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link aria-label="Cultural Citywalk 首页" className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">
          ✦
        </span>
        <span>
          <strong>CULTURAL CITYWALK</strong>
          <small>每一座城市都有很多种读法</small>
        </span>
      </Link>

      <nav aria-label="主导航" className="main-nav">
        {navItems.map((item) => (
          <Link href={item.href} key={item.label}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <AuthNav />
      </div>
    </header>
  );
}
