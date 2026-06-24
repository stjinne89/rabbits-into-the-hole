/**
 * Print SQL for the plattegrond-derived stages. Re-run after recalibrating the
 * overlay corners or editing scripts/stage-positions.ts.
 *   node scripts/stages-from-plattegrond.ts
 */
import { deriveStages } from "./stage-positions.ts";

const rows = deriveStages();
console.log("delete from public.stages;");
console.log("insert into public.stages (name, lat, lon, color, sort_order) values");
console.log(
  rows
    .map(
      (r) =>
        `  ('${r.name.replace(/'/g, "''")}', ${r.lat}, ${r.lon}, '${r.color}', ${r.sort_order})`
    )
    .join(",\n") + ";"
);
