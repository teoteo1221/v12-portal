"use client";

import { Render, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "./puck-config";
import { useEffect } from "react";

interface LandingRendererProps {
  landingId: string;
  data: Data;
}

export function LandingRenderer({ landingId, data }: LandingRendererProps) {
  useEffect(() => {
    // Track view asynchronously — fire and forget
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landing_page_id: landingId,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [landingId]);

  return <Render config={puckConfig} data={data} />;
}
