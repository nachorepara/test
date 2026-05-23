import { GcodeBuilder } from "../builder";
import { BAMBU_A1_PROFILE } from "../profiles/bambu-a1";

// Fixed geometry: 80x80x30mm, 1.2mm walls, 0.2mm layers, PLA on Bambu A1
const WIDTH = 80;
const DEPTH = 80;
const HEIGHT = 30;
const WALL = 1.2;
const LAYER_HEIGHT = 0.2;
const HOTEND_TEMP = 220;
const BED_TEMP = 65;
const PRINT_SPEED = 3000;   // mm/min
const TRAVEL_SPEED = 18000;

// Extrusion width ~0.45mm, filament diameter 1.75mm
const FILAMENT_AREA = Math.PI * (1.75 / 2) ** 2;
const LINE_AREA = LAYER_HEIGHT * 0.45;
const E_PER_MM = LINE_AREA / FILAMENT_AREA;

function extrusion(distanceMm: number): number {
  return distanceMm * E_PER_MM;
}

export function generateSoapDish(): string {
  const builder = new GcodeBuilder();
  const totalLayers = Math.round(HEIGHT / LAYER_HEIGHT);

  // Start G-code (verbatim from BambuStudio — do not modify)
  builder.raw(BAMBU_A1_PROFILE.startGcode);
  builder.raw("");

  builder.comment("=== ParaPrint: Jabonera 80x80x30mm ===");
  builder.raw("G90 ; absolute positioning");
  builder.raw("M83 ; relative extrusion");
  builder.raw("G92 E0");
  builder.raw("");

  // Center the object on the bed
  const originX = (BAMBU_A1_PROFILE.bedSize.x - WIDTH) / 2;
  const originY = (BAMBU_A1_PROFILE.bedSize.y - DEPTH) / 2;

  const x0 = originX;
  const y0 = originY;
  const x1 = originX + WIDTH;
  const y1 = originY + DEPTH;

  for (let layer = 0; layer < totalLayers; layer++) {
    const z = (layer + 1) * LAYER_HEIGHT;
    builder.comment(`Layer ${layer + 1}/${totalLayers} Z=${z.toFixed(2)}`);

    // Move to start corner at travel speed
    builder.raw(`G0 X${x0.toFixed(3)} Y${y0.toFixed(3)} Z${z.toFixed(3)} F${TRAVEL_SPEED}`);
    builder.raw("G92 E0");

    // Perimeters (2 walls = 1.2mm / 0.6mm per pass... use 2 passes at 0.45 width + overlap)
    for (let wall = 0; wall < 2; wall++) {
      const offset = wall * 0.45;
      const wx0 = x0 + offset;
      const wy0 = y0 + offset;
      const wx1 = x1 - offset;
      const wy1 = y1 - offset;

      // Move to corner
      builder.raw(`G0 X${wx0.toFixed(3)} Y${wy0.toFixed(3)} F${TRAVEL_SPEED}`);
      builder.raw("G92 E0");

      const bottom = wx1 - wx0;
      const right = wy1 - wy0;
      const top = wx1 - wx0;
      const left = wy1 - wy0;

      // Bottom edge
      builder.raw(
        `G1 X${wx1.toFixed(3)} Y${wy0.toFixed(3)} E${extrusion(bottom).toFixed(5)} F${PRINT_SPEED}`
      );
      // Right edge
      builder.raw(
        `G1 X${wx1.toFixed(3)} Y${wy1.toFixed(3)} E${extrusion(right).toFixed(5)} F${PRINT_SPEED}`
      );
      // Top edge
      builder.raw(
        `G1 X${wx0.toFixed(3)} Y${wy1.toFixed(3)} E${extrusion(top).toFixed(5)} F${PRINT_SPEED}`
      );
      // Left edge
      builder.raw(
        `G1 X${wx0.toFixed(3)} Y${wy0.toFixed(3)} E${extrusion(left).toFixed(5)} F${PRINT_SPEED}`
      );
    }

    // Solid infill for bottom layers (first 3) and top layers (last 3)
    const isBottom = layer < 3;
    const isTop = layer >= totalLayers - 3;
    if (isBottom || isTop) {
      // Rectilinear infill inside the walls
      const infillX0 = x0 + WALL;
      const infillX1 = x1 - WALL;
      const infillY0 = y0 + WALL;
      const infillY1 = y1 - WALL;
      const lineSpacing = 0.45;
      const lines = Math.floor((infillY1 - infillY0) / lineSpacing);

      builder.raw(`G0 X${infillX0.toFixed(3)} Y${infillY0.toFixed(3)} F${TRAVEL_SPEED}`);
      builder.raw("G92 E0");

      for (let i = 0; i <= lines; i++) {
        const y = infillY0 + i * lineSpacing;
        const fromX = i % 2 === 0 ? infillX0 : infillX1;
        const toX = i % 2 === 0 ? infillX1 : infillX0;
        const dist = infillX1 - infillX0;
        builder.raw(`G0 X${fromX.toFixed(3)} Y${y.toFixed(3)} F${TRAVEL_SPEED}`);
        builder.raw(
          `G1 X${toX.toFixed(3)} Y${y.toFixed(3)} E${extrusion(dist).toFixed(5)} F${PRINT_SPEED}`
        );
      }
    }

    builder.raw("");
  }

  // End G-code — replace dynamic variables with concrete values
  const maxZ = totalLayers * LAYER_HEIGHT;
  const endGcode = BAMBU_A1_PROFILE.endGcode
    .replace(/\{max_layer_z \+ 0\.5\}/g, (maxZ + 0.5).toFixed(2))
    .replace(/\{max_layer_z \+ 100\.0\}/g, Math.min(maxZ + 100, 256).toFixed(2))
    .replace(/\{max_layer_z \+ 98\.0\}/g, Math.min(maxZ + 98, 256).toFixed(2));

  builder.raw(endGcode);

  return builder.toString();
}
