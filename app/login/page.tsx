"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      // If email confirmation is disabled a session is returned immediately.
      if (data.session) return router.replace("/");
      setInfo("Check je mail om je account te bevestigen, log daarna in.");
      setMode("signin");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-forest-950 px-4 text-cream">
      <div className="w-full max-w-sm rounded-2xl bg-forest-900 p-8 shadow-xl ring-1 ring-gold/20">
        <div className="text-center">
          <h1 className="font-display text-4xl leading-[0.92]">
            Rabbits
            <br />
            into the Hole
          </h1>
          <p className="mt-3 text-sm normal-case tracking-normal text-cream/70">
            Down the Rabbit Hole 2026 — vind je vrienden op de kaart.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-cream/70">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-forest-800 px-3 py-2 text-sm outline-none ring-1 ring-cream/15 focus:ring-gold"
            />
          </div>
          <div>
            <label className="block text-sm text-cream/70">Wachtwoord</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-forest-800 px-3 py-2 text-sm outline-none ring-1 ring-cream/15 focus:ring-gold"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {info && <p className="text-sm text-emerald-300">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-gold-bright disabled:opacity-50"
          >
            {loading
              ? "Bezig…"
              : mode === "signin"
                ? "Inloggen"
                : "Account aanmaken"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-center text-sm text-cream/60 hover:text-cream"
        >
          {mode === "signin"
            ? "Nog geen account? Aanmelden"
            : "Al een account? Inloggen"}
        </button>
      </div>
    </main>
  );
}
