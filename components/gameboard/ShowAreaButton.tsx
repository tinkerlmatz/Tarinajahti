"use client";

import { useState } from "react";
import MapModal from "@/components/MapModal";

export default function ShowAreaButton({
  boundary,
  title,
}: {
  boundary: unknown | null;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  if (!boundary) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gold/60 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
      >
        Näytä alue kartalla
      </button>
      {open && (
        <MapModal
          boundary={boundary}
          title={title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
