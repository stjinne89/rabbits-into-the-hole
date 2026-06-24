/**
 * Single source of truth for stage positions, read off the plattegrond as
 * image fractions (fx = x/width, fy = y/height, origin top-left) and mapped to
 * GPS via the calibrated overlay corners. Markers are placed on the actual
 * area (where an arrow points), not on the text label.
 */
import { PLATTEGROND_CORNERS } from "../lib/festival-map.ts";

export const STAGE_POSITIONS: {
  name: string;
  color: string;
  fx: number;
  fy: number;
}[] = [
  // Names match the Clashfinder stage names so imported acts attach correctly.
  // Bossa Nova lives in the Eden area; Radiate VI in the Het Bos blob.
  // Idyllische Veldje is an art/chill area (no acts) kept as a landmark.
  { name: "Bossa Nova", color: "#22c55e", fx: 0.56, fy: 0.421 },
  { name: "REX", color: "#a3a3a3", fx: 0.627, fy: 0.416 },
  { name: "Radiate VI", color: "#15803d", fx: 0.765, fy: 0.424 },
  { name: "Holding", color: "#ef4444", fx: 0.675, fy: 0.44 },
  { name: "Idyllische Veldje", color: "#a855f7", fx: 0.805, fy: 0.447 },
  { name: "The Croque Madame", color: "#ec4899", fx: 0.846, fy: 0.471 },
  { name: "Fuzzy Lop", color: "#eab308", fx: 0.747, fy: 0.483 },
  { name: "Teddy Widder", color: "#f59e0b", fx: 0.528, fy: 0.52 },
  { name: "The Bizarre", color: "#dc2626", fx: 0.833, fy: 0.525 },
  { name: "Hotot", color: "#f97316", fx: 0.948, fy: 0.599 },
];

const { topLeft: TL, topRight: TR, bottomLeft: BL } = PLATTEGROND_CORNERS;

export function deriveStages() {
  return STAGE_POSITIONS.map((s, i) => ({
    name: s.name,
    lat: +(TL[0] + s.fx * (TR[0] - TL[0]) + s.fy * (BL[0] - TL[0])).toFixed(6),
    lon: +(TL[1] + s.fx * (TR[1] - TL[1]) + s.fy * (BL[1] - TL[1])).toFixed(6),
    color: s.color,
    sort_order: i + 1,
  }));
}
