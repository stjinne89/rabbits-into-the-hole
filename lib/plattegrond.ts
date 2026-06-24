import { PLATTEGROND_CORNERS } from "./festival-map";

/**
 * The plattegrond is shown upright as the map itself (Leaflet CRS.Simple).
 * Real GPS coordinates (OwnTracks members, stages) are projected onto the
 * image by inverting the calibration: the three corners define
 *   P(fx,fy) = TL + fx·(TR−TL) + fy·(BL−TL)
 * so we solve the 2×2 system for (fx, fy) given a lat/lng.
 */

/** Pixel size of /public/plattegrond.png (image coordinate space). */
export const PLATTEGROND_SIZE = { w: 3500, h: 3500 };

const { topLeft: TL, topRight: TR, bottomLeft: BL } = PLATTEGROND_CORNERS;
const u: [number, number] = [TR[0] - TL[0], TR[1] - TL[1]];
const v: [number, number] = [BL[0] - TL[0], BL[1] - TL[1]];
const det = u[0] * v[1] - v[0] * u[1];

/** GPS → image fraction (fx, fy from the top-left). */
export function gpsToFraction(lat: number, lon: number) {
  const dLat = lat - TL[0];
  const dLng = lon - TL[1];
  const fx = (dLat * v[1] - v[0] * dLng) / det;
  const fy = (u[0] * dLng - dLat * u[1]) / det;
  return { fx, fy };
}

/**
 * GPS → Leaflet CRS.Simple LatLng on the upright image.
 * The image spans bounds [[0,0],[h,w]] with y pointing up, so pixel-y is
 * flipped: latlng = [h − fy·h, fx·w].
 */
export function gpsToImageLatLng(lat: number, lon: number): [number, number] {
  const { fx, fy } = gpsToFraction(lat, lon);
  return [PLATTEGROND_SIZE.h - fy * PLATTEGROND_SIZE.h, fx * PLATTEGROND_SIZE.w];
}

/** Full-image bounds for CRS.Simple. */
export const IMAGE_BOUNDS: [[number, number], [number, number]] = [
  [0, 0],
  [PLATTEGROND_SIZE.h, PLATTEGROND_SIZE.w],
];
