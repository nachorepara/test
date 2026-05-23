export class GcodeBuilder {
  private lines: string[] = [];

  raw(line: string): this {
    this.lines.push(line);
    return this;
  }

  comment(text: string): this {
    this.lines.push(`; ${text}`);
    return this;
  }

  moveTo(x: number, y: number, z: number, feedrate?: number): this {
    const f = feedrate ? ` F${feedrate}` : "";
    this.lines.push(`G0 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)}${f}`);
    return this;
  }

  extrudeTo(x: number, y: number, z: number, e: number, feedrate: number): this {
    this.lines.push(
      `G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)} E${e.toFixed(5)} F${feedrate}`
    );
    return this;
  }

  setHotend(temp: number, wait = true): this {
    this.lines.push(wait ? `M109 S${temp}` : `M104 S${temp}`);
    return this;
  }

  setBed(temp: number, wait = true): this {
    this.lines.push(wait ? `M190 S${temp}` : `M140 S${temp}`);
    return this;
  }

  setFan(pct: number): this {
    const val = Math.round((pct / 100) * 255);
    this.lines.push(`M106 S${val}`);
    return this;
  }

  home(): this {
    this.lines.push("G28");
    return this;
  }

  useAbsolutePositioning(): this {
    this.lines.push("G90");
    return this;
  }

  useRelativeExtrusion(): this {
    this.lines.push("M83");
    return this;
  }

  resetExtruder(): this {
    this.lines.push("G92 E0");
    return this;
  }

  toString(): string {
    return this.lines.join("\n");
  }
}
