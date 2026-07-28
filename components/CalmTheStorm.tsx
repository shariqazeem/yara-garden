"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// A small, cathartic regulation game: touch each storm cloud, watch it soften and drift
// away. As the storm clears, the sky warms to gold. Your inner weather, made playable.
const SPOTS = [
  { id: 0, x: 22, y: 26 }, { id: 1, x: 64, y: 22 }, { id: 2, x: 42, y: 40 },
  { id: 3, x: 76, y: 48 }, { id: 4, x: 26, y: 56 }, { id: 5, x: 58, y: 64 },
];

function StormCloud({ x, y, onTap }: { x: number; y: number; onTap: () => void }) {
  return (
    <motion.button
      onClick={onTap} aria-label="soothe this cloud"
      className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1, x: [0, 9, 0], y: [0, -6, 0] }}
      exit={{ opacity: 0, y: -90, scale: 0.5 }}
      whileTap={{ scale: 0.9 }} transition={{ x: { duration: 5 + (x % 5), repeat: Infinity, ease: "easeInOut" }, y: { duration: 4 + (y % 4), repeat: Infinity, ease: "easeInOut" } }}
    >
      <div className="relative" style={{ width: 96, height: 58 }}>
        <div className="absolute rounded-full bg-[#4a5570]" style={{ left: 4, top: 20, width: 54, height: 34 }} />
        <div className="absolute rounded-full bg-[#3c4660]" style={{ left: 30, top: 4, width: 50, height: 44 }} />
        <div className="absolute rounded-full bg-[#525d78]" style={{ left: 50, top: 20, width: 44, height: 34 }} />
        <div className="absolute left-[42%] top-[64%] text-[18px]">⚡</div>
      </div>
    </motion.button>
  );
}

export function CalmTheStorm({ onDone }: { onDone: () => void }) {
  const [clouds, setClouds] = useState(SPOTS.map((s) => ({ ...s, calm: false })));
  const left = clouds.filter((c) => !c.calm);
  const p = 1 - left.length / clouds.length;
  const done = left.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[64] flex flex-col items-center overflow-hidden"
      style={{ background: "linear-gradient(180deg,#FCEFC8,#F6DCA6)" }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: `rgba(38,46,72,${0.52 * (1 - p)})`, transition: "background 0.7s ease" }} />
      {!done && (
        <motion.div className="pointer-events-none absolute inset-0 bg-white" animate={{ opacity: [0, 0, 0.22, 0] }} transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.72, 0.76, 0.82] }} />
      )}

      <div className="relative z-10 mt-14 px-6 text-center">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: done ? "#B98A2E" : "#d4dbeb" }}>calm the storm</div>
        <h2 className="mt-2 text-[22px] font-semibold tracking-tight" style={{ color: done ? "#7a5a20" : "#ffffff" }}>
          {done ? "The storm passed." : "Touch each cloud — let it soften."}
        </h2>
      </div>

      <div className="absolute inset-0">
        <AnimatePresence>
          {left.map((c) => (
            <StormCloud key={c.id} x={c.x} y={c.y} onTap={() => setClouds((cs) => cs.map((z) => (z.id === c.id ? { ...z, calm: true } : z)))} />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mb-16 mt-auto px-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img src="/calm_storm.png" alt="" className="mx-auto mb-5 h-40 w-auto"
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
              transition={{ scale: { duration: 0.6 }, opacity: { duration: 0.6 }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }} />
            <p className="mx-auto max-w-xs text-[16px] leading-relaxed text-[#7a5a20]">You stayed, and it cleared. Storms always pass — and you can weather them.</p>
            <button onClick={onDone} className="mt-6 rounded-full bg-ink px-9 py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98]">Step out calm 🌅</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
