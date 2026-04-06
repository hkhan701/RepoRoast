"use client"

import { useState, useEffect, useRef } from "react";
import { Skull } from "lucide-react"
import { GithubIcon } from "@/components/lucide-animated-icons/github";

export function Footer() {
  const skullRef = useRef<SVGSVGElement | null>(null)

  const handleSkullClick = () => {
    skullRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(3px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 280, easing: "ease-in-out" }
    )
  }

  // game of life canvas animation
  const footerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridRef = useRef<number[][] | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isAnimating] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const cellSize = 8;
    let cols: number, rows: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const parent = footerRef.current;
      if (!parent) return;
      const w = parent.offsetWidth;
      const h = parent.offsetHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      cols = Math.floor(w / cellSize);
      rows = Math.floor(h / cellSize);

      // Initialize with sparse random pattern for elegance
      gridRef.current = Array(rows)
        .fill(null)
        .map(() =>
          Array(cols)
            .fill(null)
            .map(() => (Math.random() < 0.15 ? 1 : 0)),
        );
    };

    resize();
    window.addEventListener("resize", resize);

    const countNeighbors = (grid: number[][], x: number, y: number): number => {
      let count = 0;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue;
          const row = (y + i + rows) % rows;
          const col = (x + j + cols) % cols;
          count += grid[row][col];
        }
      }
      return count;
    };

    const update = () => {
      if (!isAnimating || !gridRef.current) return;

      const grid = gridRef.current;
      const next = Array(rows)
        .fill(null)
        .map(() => Array(cols).fill(0));

      // Only update cells that could possibly change (optimization)
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const neighbors = countNeighbors(grid, x, y);
          const cell = grid[y][x];

          if (cell === 1 && (neighbors === 2 || neighbors === 3)) {
            next[y][x] = 1;
          } else if (cell === 0 && neighbors === 3) {
            next[y][x] = 1;
          }
        }
      }

      gridRef.current = next;
    };

    const draw = () => {
      if (!gridRef.current) return;

      // Clear with black background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grid = gridRef.current;

      // Draw cells with fade effect
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y][x] === 1) {
            const opacity = 0.15;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fillRect(
              x * cellSize,
              y * cellSize,
              cellSize - 1,
              cellSize - 1,
            );
          }
        }
      }
    };

    let lastUpdate = 0;
    const updateInterval = 75; // ms between updates

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdate > updateInterval) {
        update();
        lastUpdate = timestamp;
      }
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating]);

  return (
    <footer ref={footerRef} className="relative overflow-hidden bg-ink text-primary-foreground py-10 sm:py-12 px-4 sm:px-6">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: isAnimating ? 0.7 : 0, transition: "opacity 0.5s" }}
      />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSkullClick}
              aria-label="Shake skull"
              className="w-8 h-8 border-2 border-primary-foreground bg-yellow flex items-center justify-center cursor-pointer"
            >
              <Skull ref={skullRef} className="w-5 h-5 text-ink" />
            </button>
            <span className="text-sm font-bold uppercase tracking-widest text-primary-foreground">
              Roast My Repo
            </span>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t-2 border-primary-foreground/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-primary-foreground/60">
            {"no feelings are considered."}
          </p>
          <a
            href="https://github.com/hkhan701"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
          >
            <GithubIcon />
            made by hassan
          </a>
        </div>
      </div>
    </footer>
  )
}
