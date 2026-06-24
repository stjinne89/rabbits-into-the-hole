"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map must never render on the server.
const MapClient = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-400">
      Kaart laden…
    </div>
  ),
});

export default MapClient;
