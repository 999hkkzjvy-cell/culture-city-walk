import { LoginForm } from "@/components/auth/login-form";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-intro compact">
        <p>账号</p>
        <h1>登录或注册</h1>
      </section>
      <section className="account-layout single narrow">
        <LoginForm />
      </section>
    </main>
  );
}
