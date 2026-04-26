"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <div className="relative z-10 w-full max-w-sm animate-fade-up">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-lg font-black text-white shadow-pop">
          V12
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-v12-ink">
            V12 OS
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-v12-muted">
            El sistema operativo de V12
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-v12-line bg-v12-surface p-6 shadow-pop">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              autoFocus
              required
              autoComplete="email"
              className="input"
              placeholder="tucuenta@v12.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                required
                autoComplete="current-password"
                className="input pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-v12-muted transition hover:bg-v12-bg hover:text-v12-ink"
                aria-label={showPwd ? "Ocultar" : "Mostrar"}
              >
                {showPwd ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg px-3 py-2 text-xs font-semibold text-v12-bad">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full py-2.5 text-[13px]"
          >
            {pending ? (
              "Ingresando…"
            ) : (
              <>
                Entrar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 border-t border-v12-line-soft pt-4 text-center">
          <p className="text-[11px] text-v12-muted">
            ¿Problemas para entrar? Escribile al admin.
          </p>
        </div>
      </div>
    </div>
  );
}
