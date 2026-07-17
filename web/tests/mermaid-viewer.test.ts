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
  assert.match(mermaidViewer, /Math\.max\(0\.7, value - 0\.2\)/);
  assert.match(mermaidViewer, /Math\.min\(2\.6, value \+ 0\.2\)/);
  assert.match(mermaidViewer, /setZoom\(1\)/);
  assert.match(mermaidViewer, /aria-label=\{t\("Zoom in"\)\}/);
  assert.match(mermaidViewer, /aria-label=\{t\("Zoom out"\)\}/);
});

test("flow diagrams use classroom-readable spacing and typography", () => {
  assert.match(mermaidViewer, /nodeSpacing: 48/);
  assert.match(mermaidViewer, /rankSpacing: 58/);
  assert.match(mermaidViewer, /fontSize: 17/);
  assert.match(globalStyles, /\.drona-diagram-canvas svg \.nodeLabel/);
  assert.match(globalStyles, /font-size: 17px !important/);
});
