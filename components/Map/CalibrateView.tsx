"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_MAX_ZOOM,
  PLATTEGROND_IMAGE,
} from "@/lib/festival-map";

type Corner = "topLeft" | "topRight" | "bottomLeft";
type Corners = Record<Corner, [number, number]>;

const HANDLE_COLORS: Record<Corner, string> = {
  topLeft: "#ef4444",
  topRight: "#22c55e",
  bottomLeft: "#3b82f6",
};

function handleIcon(label: string, color: string) {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700">${label}</div>`,
  });
}

export default function CalibrateView() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [corners, setCorners] = useState<Corners | null>(null);
  const [opacity, setOpacity] = useState(0.6);
  const overlayRef = useRef<L.Layer | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    let map: L.Map | null = null;
    let cancelled = false;

    (async () => {
      (globalThis as unknown as { L: typeof L }).L = L;
      await import("leaflet-imageoverlay-rotated");
      if (cancelled || !mapRef.current) return;

      map = L.map(mapRef.current).setView(MAP_CENTER, MAP_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: MAP_MAX_ZOOM,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      // Initial corners: centre the image with its true aspect ratio.
      // Load the image to read its aspect ratio. Use `onload` (not
      // `img.decode()`, which can hang in some browsers) with a timeout so
      // init never stalls.
      const img = new Image();
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        img.onload = done;
        img.onerror = done;
        img.src = PLATTEGROND_IMAGE;
        if (img.complete) done();
        setTimeout(done, 2000);
      });
      if (cancelled) return;
      const aspect = img.naturalWidth / img.naturalHeight || 1;

      const lonSpan = 0.03;
      const metersPerDegLon = Math.cos((MAP_CENTER[0] * Math.PI) / 180) * 111320;
      const latSpan = (lonSpan * metersPerDegLon) / 111320 / aspect;
      const [cLat, cLon] = MAP_CENTER;
      const init: Corners = {
        topLeft: [cLat + latSpan / 2, cLon - lonSpan / 2],
        topRight: [cLat + latSpan / 2, cLon + lonSpan / 2],
        bottomLeft: [cLat - latSpan / 2, cLon - lonSpan / 2],
      };

      const overlay = (
        L.imageOverlay as unknown as {
          rotated: (
            url: string,
            tl: [number, number],
            tr: [number, number],
            bl: [number, number],
            opts: L.ImageOverlayOptions
          ) => L.Layer & {
            reposition: (
              tl: L.LatLng,
              tr: L.LatLng,
              bl: L.LatLng
            ) => void;
          };
        }
      ).rotated(
        PLATTEGROND_IMAGE,
        init.topLeft,
        init.topRight,
        init.bottomLeft,
        { opacity }
      );
      overlay.addTo(map);
      overlayRef.current = overlay;

      const markers: Record<Corner, L.Marker> = {} as Record<Corner, L.Marker>;
      let moveMarker: L.Marker | null = null;
      let movePrev: L.LatLng | null = null;

      const corners3 = () =>
        [
          markers.topLeft.getLatLng(),
          markers.topRight.getLatLng(),
          markers.bottomLeft.getLatLng(),
        ] as const;

      const centroid = () => {
        const [tl, tr, bl] = corners3();
        return L.latLng(
          (tl.lat + tr.lat + bl.lat) / 3,
          (tl.lng + tr.lng + bl.lng) / 3
        );
      };

      const repositionOverlay = () => {
        const [tl, tr, bl] = corners3();
        (
          overlayRef.current as unknown as {
            reposition: (tl: L.LatLng, tr: L.LatLng, bl: L.LatLng) => void;
          }
        ).reposition(tl, tr, bl);
      };

      const syncState = () => {
        const [tl, tr, bl] = corners3();
        setCorners({
          topLeft: [tl.lat, tl.lng],
          topRight: [tr.lat, tr.lng],
          bottomLeft: [bl.lat, bl.lng],
        });
      };

      // Corner handles: rotate / scale / skew.
      (Object.keys(init) as Corner[]).forEach((key) => {
        const m = L.marker(init[key], {
          draggable: true,
          icon: handleIcon(
            key === "topLeft" ? "TL" : key === "topRight" ? "TR" : "BL",
            HANDLE_COLORS[key]
          ),
        }).addTo(map!);
        m.on("drag dragend", () => {
          repositionOverlay();
          syncState();
          // Keep the move handle centred under the new shape.
          if (moveMarker) {
            moveMarker.setLatLng(centroid());
            movePrev = moveMarker.getLatLng();
          }
        });
        markers[key] = m;
      });

      // Centre handle: drag the whole plattegrond at once.
      movePrev = centroid();
      moveMarker = L.marker(movePrev, {
        draggable: true,
        zIndexOffset: 500,
        icon: handleIcon("✥", "#7c3aed"),
      }).addTo(map);
      moveMarker.on("drag", () => {
        const now = moveMarker!.getLatLng();
        const dLat = now.lat - movePrev!.lat;
        const dLng = now.lng - movePrev!.lng;
        movePrev = now;
        (["topLeft", "topRight", "bottomLeft"] as Corner[]).forEach((k) => {
          const ll = markers[k].getLatLng();
          markers[k].setLatLng([ll.lat + dLat, ll.lng + dLng]);
        });
        repositionOverlay();
        syncState();
      });

      setCorners(init);
      // Insurance against a 0-size container at init time.
      setTimeout(() => map?.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live opacity updates.
  useEffect(() => {
    const ov = overlayRef.current as unknown as {
      setOpacity?: (o: number) => void;
    } | null;
    ov?.setOpacity?.(opacity);
  }, [opacity]);

  const snippet = corners
    ? `export const PLATTEGROND_CORNERS: {
  topLeft: LatLngTuple;
  topRight: LatLngTuple;
  bottomLeft: LatLngTuple;
} = {
  topLeft: [${corners.topLeft[0].toFixed(6)}, ${corners.topLeft[1].toFixed(6)}],
  topRight: [${corners.topRight[0].toFixed(6)}, ${corners.topRight[1].toFixed(6)}],
  bottomLeft: [${corners.bottomLeft[0].toFixed(6)}, ${corners.bottomLeft[1].toFixed(6)}],
};
export const PLATTEGROND_ENABLED = true;`
    : "";

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <div ref={mapRef} className="h-[55vh] w-full lg:h-full lg:flex-1" />
      <aside className="w-full space-y-4 overflow-y-auto bg-zinc-950 p-4 text-zinc-100 lg:h-full lg:w-[420px]">
        <div>
          <h1 className="text-lg font-bold">Plattegrond kalibreren</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Sleep het paarse <b>✥</b>-handvat om de hele plattegrond te
            verplaatsen, en de hoekpunten (TL/TR/BL) om te draaien/schalen — tot
            de plattegrond op de echte kaart past. Gebruik <b>Het Meer</b> en de
            wegen als ijkpunten. Kopieer daarna de code naar{" "}
            <code className="text-violet-300">lib/festival-map.ts</code>.
          </p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400">
            Transparantie: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="mt-1 w-full"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium">festival-map.ts</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold hover:bg-violet-500"
            >
              {copied ? "Gekopieerd ✓" : "Kopieer"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-black p-3 text-xs text-emerald-300 ring-1 ring-white/10">
            {snippet || "Kaart laden…"}
          </pre>
        </div>

        <a
          href="/map"
          className="inline-block rounded-lg bg-zinc-800 px-4 py-2 text-sm ring-1 ring-white/10 hover:bg-zinc-700"
        >
          ← Terug naar de kaart
        </a>
      </aside>
    </div>
  );
}
