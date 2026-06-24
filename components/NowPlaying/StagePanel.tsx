import type { StageStatus } from "@/lib/schedule";
import { formatCountdown, formatTime } from "@/lib/format";

/** Compact now-playing panel for a single stage. Rendered inside map popups. */
export default function StagePanel({
  status,
  now,
}: {
  status: StageStatus;
  now: Date;
}) {
  const { stage, current, next } = status;
  const t = now.getTime();

  return (
    <div className="min-w-[200px] text-forest-950">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: stage.color }}
        />
        <span className="font-display text-lg">{stage.name}</span>
      </div>

      <div className="mt-2">
        {current ? (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-emerald-700">
              Nu
            </p>
            <p className="font-medium">{current.artist_name}</p>
            <p className="text-xs text-forest-900/60">
              tot {formatTime(current.end_time)} · nog{" "}
              {formatCountdown(new Date(current.end_time).getTime() - t)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-forest-900/60">Nu niets op deze stage.</p>
        )}
      </div>

      {next && (
        <div className="mt-2 border-t border-forest-900/15 pt-2">
          <p className="text-[11px] uppercase tracking-wide text-gold">Straks</p>
          <p className="font-medium">{next.artist_name}</p>
          <p className="text-xs text-forest-900/60">
            {formatTime(next.start_time)} · over{" "}
            {formatCountdown(new Date(next.start_time).getTime() - t)}
          </p>
        </div>
      )}
    </div>
  );
}
