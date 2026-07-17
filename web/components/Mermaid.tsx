"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { subscribeToThemeChanges } from "@/lib/theme";

interface MermaidProps {
  chart: string;
  className?: string;
}

let mermaidLoader: Promise<(typeof import("mermaid"))["default"]> | null = null;

// Read a CSS custom property from :root. We re-derive these on every render
// so the diagram colors track the active theme rather than freezing to the
// first-render palette.
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function themeVariablesFromCss() {
  // Mermaid expects opaque colors; we pull from the theme's --foreground /
  // --card / --border / --primary tokens so diagrams blend with the chat
  // surface in every theme (light, dark, snow, glass).
  return {
    primaryColor: cssVar("--card", "#ffffff"),
    primaryTextColor: cssVar("--foreground", "#1f1d1b"),
    primaryBorderColor: cssVar("--border", "#dbd4c8"),
    lineColor: cssVar("--muted-foreground", "#6b655f"),
    secondaryColor: cssVar("--muted", "#ece7dd"),
    tertiaryColor: cssVar("--background", "#faf9f6"),
    textColor: cssVar("--foreground", "#1f1d1b"),
    mainBkg: cssVar("--card", "#ffffff"),
  };
}

async function loadMermaid() {
  if (!mermaidLoader) {
    mermaidLoader = import("mermaid").then((module) => module.default);
  }
  return mermaidLoader;
}

// Mermaid treats parentheses in a bare subgraph title as syntax. Give those
// titles an explicit id + quoted label so natural model output such as
// `subgraph Compiled (C)` remains renderable.
function normalizeSubgraphTitles(source: string): string {
  let index = 0;
  return source.replace(
    /^(\s*)subgraph\s+(.+?[()]+.*?)\s*$/gm,
    (line, indent: string, title: string) => {
      if (/^[A-Za-z_][\w-]*\s*\[/.test(title)) return line;
      index += 1;
      const safeTitle = title.trim().replaceAll('"', "'");
      return `${indent}subgraph drona_subgraph_${index}["${safeTitle}"]`;
    },
  );
}

// Re-applied on every render so theme changes pick up. mermaid.initialize()
// is idempotent and cheap; the heavy work is the dynamic import which the
// loader above only runs once.
function applyMermaidTheme(mermaid: (typeof import("mermaid"))["default"]) {
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "strict",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    flowchart: {
      useMaxWidth: true,
      htmlLabels: false,
      curve: "basis",
      nodeSpacing: 48,
      rankSpacing: 58,
      padding: 16,
    },
    fontSize: 17,
    themeVariables: themeVariablesFromCss(),
  });
}

function cleanupMermaidOrphans(id: string) {
  try {
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  } catch {
    /* ignore */
  }
}

let mermaidIdCounter = 0;

const DEBOUNCE_MS = 600;

export const Mermaid: React.FC<MermaidProps> = ({ chart, className = "" }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [stable, setStable] = useState(false);
  const [id] = useState(() => `mermaid-${++mermaidIdCounter}`);
  const [themeToken, setThemeToken] = useState(0);
  const [zoom, setZoom] = useState(1);
  const lastChartRef = useRef(chart);

  useEffect(() => {
    lastChartRef.current = chart;
    setStable(false);

    const timer = window.setTimeout(() => {
      if (lastChartRef.current === chart) setStable(true);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [chart]);

  // Bump a token whenever the app's theme changes so the render effect below
  // re-runs with fresh theme variables. Without this the diagram would keep
  // its initial palette across light/dark/glass/snow switches.
  useEffect(() => {
    return subscribeToThemeChanges(() => setThemeToken((t) => t + 1));
  }, []);

  useEffect(() => {
    if (!stable) return;

    let cancelled = false;
    const renderChart = async () => {
      if (!chart.trim() || !containerRef.current) return;

      try {
        const mermaid = await loadMermaid();
        applyMermaidTheme(mermaid);
        cleanupMermaidOrphans(id);
        const { svg: renderedSvg } = await mermaid.render(
          id,
          normalizeSubgraphTitles(chart.trim()),
        );
        if (!cancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        cleanupMermaidOrphans(id);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("Failed to render diagram"),
          );
        }
      }
    };

    void renderChart();
    return () => {
      cancelled = true;
    };
  }, [stable, chart, id, t, themeToken]);

  if (error) {
    return (
      <div
        className={`my-4 p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}
      >
        <p className="text-red-600 text-sm font-medium mb-2">
          {t("Diagram rendering error")}
        </p>
        <pre className="text-xs text-red-500 whitespace-pre-wrap">{error}</pre>
        <details className="mt-2">
          <summary className="text-xs text-[var(--muted-foreground)] cursor-pointer">
            {t("Show source")}
          </summary>
          <pre className="mt-2 p-2 bg-[var(--muted)] rounded text-xs overflow-x-auto text-[var(--foreground)]">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  if (!stable && !svg) {
    return (
      <div
        className={`my-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 px-4 py-3 text-sm text-[var(--muted-foreground)] ${className}`}
      >
        {t("Rendering diagram...")}
      </div>
    );
  }

  return (
    <section
      className={`my-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm ${className}`}
      aria-label={t("Visual explanation")}
    >
      <header className="flex min-h-11 items-center gap-2 border-b border-[var(--border)] bg-[var(--muted)]/35 px-3 sm:px-4">
        <span className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--muted-foreground)]">
          {t("Visual explanation")}
        </span>
        <span className="ml-auto text-[11px] font-medium tabular-nums text-[var(--muted-foreground)]">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(0.7, value - 0.2))}
          disabled={zoom <= 0.7}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] disabled:opacity-35"
          aria-label={t("Zoom out")}
          title={t("Zoom out")}
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          disabled={zoom === 1}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] disabled:opacity-35"
          aria-label={t("Fit")}
          title={t("Fit")}
        >
          <RotateCcw size={15} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((value) => Math.min(2.6, value + 0.2))}
          disabled={zoom >= 2.6}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] disabled:opacity-35"
          aria-label={t("Zoom in")}
          title={t("Zoom in")}
        >
          <ZoomIn size={16} />
        </button>
      </header>
      <div
        ref={containerRef}
        className="drona-diagram-viewport max-h-[68vh] overflow-auto bg-[var(--background)]/55 p-3 sm:p-5"
      >
        <div
          className="drona-diagram-canvas mx-auto min-w-0 transition-[width] duration-150 ease-out"
          style={{ width: `${zoom * 100}%` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </section>
  );
};

export default Mermaid;
