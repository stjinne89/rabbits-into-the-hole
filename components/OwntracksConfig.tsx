"use client";

import { useState } from "react";

type Creds = { username: string; secret: string };

function Field({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-cream/50">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-forest-950 px-3 py-2 text-sm text-gold-bright ring-1 ring-cream/15">
          {value}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="rounded-lg bg-forest-800 px-3 py-2 text-xs ring-1 ring-cream/15 hover:bg-forest-700"
        >
          {copied ? "✓" : "Kopieer"}
        </button>
      </div>
    </div>
  );
}

export default function OwntracksConfig({
  hasDevice,
  endpoint,
}: {
  hasDevice: boolean;
  endpoint: string;
}) {
  const [creds, setCreds] = useState<Creds | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/owntracks/credentials", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      setError("Genereren mislukt. Probeer opnieuw.");
      return;
    }
    setCreds(await res.json());
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-forest-800 p-4 text-sm text-cream/80 ring-1 ring-cream/15">
        <p className="font-medium text-cream">Zo koppel je OwnTracks</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-cream/70">
          <li>Installeer de OwnTracks-app (iOS / Android).</li>
          <li>
            Ga naar Settings → Connection en kies <b>Mode: HTTP</b>.
          </li>
          <li>
            Vul de <b>URL</b>, <b>Username</b> en <b>Password</b> hieronder in.
          </li>
          <li>Zet locatiedeling aan — je verschijnt vanzelf op de kaart.</li>
        </ol>
      </div>

      <Field label="URL (endpoint)" value={endpoint} />

      {creds ? (
        <div className="space-y-4 rounded-xl bg-emerald-950/40 p-4 ring-1 ring-emerald-500/30">
          <p className="text-sm text-emerald-300">
            Bewaar je wachtwoord nu — het wordt later niet meer getoond.
          </p>
          <Field label="Username" value={creds.username} />
          <Field label="Password" value={creds.secret} />
        </div>
      ) : (
        <p className="text-sm text-cream/70">
          {hasDevice
            ? "Je hebt al credentials. Genereer nieuwe als je ze kwijt bent (de oude vervallen dan)."
            : "Genereer credentials om je telefoon te koppelen."}
        </p>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        onClick={generate}
        disabled={loading}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-forest-950 transition hover:bg-gold-bright disabled:opacity-50"
      >
        {loading
          ? "Bezig…"
          : hasDevice || creds
            ? "Nieuwe credentials genereren"
            : "Credentials genereren"}
      </button>
    </div>
  );
}
