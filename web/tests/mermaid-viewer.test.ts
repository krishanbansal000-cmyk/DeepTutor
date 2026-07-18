import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const mermaidViewer = readFileSync(
  path.join(process.cwd(), "components/Mermaid.tsx"),
  "utf8",
);
const globalStyles = readFileSync(
  path.join(process.cwd(), "app/globals.css"),
  "utf8",
);

test("diagram viewer provides bounded zoom controls", () => {
  assert.match(mermaidViewer, /Math\.max\(0\.4, value - 0\.2\)/);
  assert.match(mermaidViewer, /Math\.min\(3\.0, value \+ 0\.2\)/);
  assert.match(mermaidViewer, /setZoom\(0\.85\)/);
  assert.match(mermaidViewer, /aria-label=\{t\("Zoom in"\)\}/);
  assert.match(mermaidViewer, /aria-label=\{t\("Zoom out"\)\}/);
});

test("flow diagrams use classroom-readable spacing and typography", () => {
  assert.match(mermaidViewer, /nodeSpacing: 48/);
  assert.match(mermaidViewer, /rankSpacing: 58/);
  assert.match(mermaidViewer, /fontSize: 15/);
  assert.match(mermaidViewer, /htmlLabels: true/);
  assert.match(globalStyles, /\.drona-diagram-canvas svg \.nodeLabel/);
  assert.match(globalStyles, /font-size: 15px !important/);
});
