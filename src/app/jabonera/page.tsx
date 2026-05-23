"use client";

import { useState } from "react";

export default function JaboneraPage() {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const { generateSoapDish } = await import("@/gcode/models/soap-dish");
      const gcode = generateSoapDish();
      const blob = new Blob([gcode], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "paraprint-jabonera-80x80x30-bambu-a1.gcode";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Jabonera</h1>
        <p className="mt-3 text-muted-foreground">
          80 × 80 × 30 mm · Paredes 1.2 mm · Layer 0.2 mm
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Bambu A1 · PLA · 220°C · Cama 65°C</p>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="mt-8 w-full rounded-lg bg-foreground px-6 py-3 text-base font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {loading ? "Generando..." : "Descargar G-code"}
        </button>

        <p className="mt-4 text-xs text-muted-foreground">
          El archivo se genera en tu navegador. Probalo primero en BambuStudio antes de imprimir.
        </p>
      </div>
    </main>
  );
}
