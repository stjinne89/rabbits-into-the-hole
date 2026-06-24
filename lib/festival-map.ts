import type { LatLngTuple } from "leaflet";

/**
 * Geo-config for the Down the Rabbit Hole festival site.
 *
 * DTRH is held at Recreatiegebied De Groene Heuvels (Ewijk / Beuningen, NL).
 * These are starting values — fine-tune the overlay corners against the real
 * plattegrond image once it is placed in /public/plattegrond.png.
 */

export const FESTIVAL_NAME = "Down the Rabbit Hole 2026";

/** Map starting view — centred on the calibrated plattegrond overlay. */
export const MAP_CENTER: LatLngTuple = [51.8549, 5.6871];
export const MAP_ZOOM = 15;
export const MAP_MIN_ZOOM = 13;
export const MAP_MAX_ZOOM = 19;

/**
 * The plattegrond is placed as a rotated image overlay defined by three
 * corners: top-left, top-right and bottom-left (bottom-right is derived).
 * Adjust these to line the artwork up with the real terrain.
 */
export const PLATTEGROND_IMAGE = "/plattegrond.png";
export const PLATTEGROND_CORNERS: {
  topLeft: LatLngTuple;
  topRight: LatLngTuple;
  bottomLeft: LatLngTuple;
} = {
  topLeft: [51.861730, 5.684371],
  topRight: [51.853629, 5.705156],
  bottomLeft: [51.849400, 5.671639],
};
export const PLATTEGROND_ENABLED = true;

/** Consider a member "live" only if their last fix is newer than this. */
export const LOCATION_FRESH_MS = 15 * 60 * 1000;
