"use client";

import { motion } from "framer-motion";
import type { Milestone } from "@/lib/milestones";

export function MilestoneCard({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      className="glass fixed inset-0 z-[65] flex items-center justify-center px-6"
    >
      {[...Array(10)].map((_, i) => (
        <motion.div key={i} className="pointer-events-none absolute text-[15px]" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 95}%` }}
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: [0, -22] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.2, ease: "easeOut" }}>✨</motion.div>
      ))}
      <motion.div initial={{ scale: 0.82, y: 14 }} animate={{ scale: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
        className="relative w-full max-w-sm rounded-[28px] border border-hair bg-white p-8 text-center shadow-float">
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">a milestone</div>
        <motion.div className="mt-4 text-[54px] leading-none" animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          {milestone.emoji}
        </motion.div>
        <h2 className="mt-3 text-[23px] font-semibold tracking-tight">{milestone.title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/60">{milestone.sub}</p>
        <button onClick={onClose} className="mt-7 w-full rounded-full bg-ink py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98]">
          Keep going 🌿
        </button>
      </motion.div>
    </motion.div>
  );
}
