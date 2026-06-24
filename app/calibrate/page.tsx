"use client";

import dynamic from "next/dynamic";

// Imperative Leaflet tool — client-only.
const CalibrateView = dynamic(() => import("@/components/Map/CalibrateView"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center bg-zinc-900 text-zinc-400">
      Kalibratie laden…
    </div>
  ),
});

export default function CalibratePage() {
  return <CalibrateView />;
}
