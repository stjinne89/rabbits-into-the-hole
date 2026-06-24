import type { Act, Stage } from "@/lib/database.types";

export type StageStatus = {
  stage: Stage;
  current: Act | null;
  next: Act | null;
};

/**
 * For each stage, determine the act playing at `now` and the next upcoming act.
 * `acts` may contain acts for any stage; they are grouped here.
 */
export function computeStageStatuses(
  stages: Stage[],
  acts: Act[],
  now: Date
): StageStatus[] {
  const t = now.getTime();
  const byStage = new Map<number, Act[]>();
  for (const act of acts) {
    const list = byStage.get(act.stage_id) ?? [];
    list.push(act);
    byStage.set(act.stage_id, list);
  }

  return stages.map((stage) => {
    const list = (byStage.get(stage.id) ?? []).sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    let current: Act | null = null;
    let next: Act | null = null;
    for (const act of list) {
      const start = new Date(act.start_time).getTime();
      const end = new Date(act.end_time).getTime();
      if (start <= t && t < end) current = act;
      else if (start > t && next == null) next = act;
    }
    return { stage, current, next };
  });
}
