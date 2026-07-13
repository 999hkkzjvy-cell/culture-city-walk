import Link from "next/link";
import { Bell, Bookmark, Menu, Search } from "lucide-react";

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
        <Link href="/">探索城市</Link>
        <Link href="/plan/">我的路线</Link>
        <Link href="/route/?id=demo">收藏</Link>
        <Link href="/">主题</Link>
        <Link href="/">关于我们</Link>
      </nav>

      <div className="header-actions">
        <label className="search-box">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">搜索城市、主题或地点</span>
          <input placeholder="搜索城市、主题或地点" />
        </label>
        <button aria-label="通知" className="icon-button" type="button">
          <Bell size={18} />
        </button>
        <button aria-label="收藏" className="icon-button" type="button">
          <Bookmark size={18} />
        </button>
      </div>

      <button aria-label="打开菜单" className="mobile-menu" type="button">
        <Menu size={24} />
      </button>
    </header>
  );
}
