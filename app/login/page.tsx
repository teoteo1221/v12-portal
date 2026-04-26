import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-v12-bg px-4 py-10">
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 h-[380px] w-[380px] rounded-full bg-v12-navy/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full bg-v12-orange/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 dot-bg"
      />

      <Suspense
        fallback={
          <div className="text-sm text-v12-muted">Cargando…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
