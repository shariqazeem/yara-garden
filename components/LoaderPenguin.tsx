"use client";

import { useId } from "react";
import { motion } from "framer-motion";

/**
 * A small penguin for the opening scene.
 *
 * Drawn rather than sprited, because the scene needs things the flat forward-facing art
 * can't do: a body that turns to face the way it is going, a real waddle, and a back view
 * for walking away into the distance.
 *
 * Two decisions make it work at the size it's actually used (about 40px, roughly a lantern
 * on the far bank):
 *
 *  - **Head and body are separate blobs.** A single egg turns into an unreadable dark
 *    smudge when it's tiny. The notch between two overlapping shapes reads as a neck, so
 *    the silhouette still says "penguin" at a glance.
 *  - **A rim light along the back edge.** The sun in the dawn painting sits behind the
 *    scene, so the same silhouette is drawn once more underneath, nudged toward the light.
 *    The sliver of warm cream that peeks out is what stops it looking pasted on top of the
 *    background and makes it sit inside the painting.
 */

export type View = "side" | "away";

export function LoaderPenguin({
  view,
  walking,
  flip,
  link,
}: {
  view: View;
  walking: boolean;
  flip: boolean;
  /** Which flipper reaches out to the other penguin, when they walk away together. */
  link?: "left" | "right" | null;
}) {
  // Gradients need ids unique to each penguin on the page.
  const uid = useId().replace(/:/g, "");
  const body = `pgB-${uid}`;
  const belly = `pgC-${uid}`;
  const beak = `pgK-${uid}`;

  // One waddle cycle. Penguins don't stride, they rock their weight over each foot.
  const CYCLE = 0.62;
  const step = walking ? { y: [0, -2.4, 0], x: [0, 2, 0] } : { y: 0, x: 0 };
  const stepT = (delay: number) =>
    walking
      ? { duration: CYCLE, repeat: Infinity, ease: "easeInOut" as const, delay }
      : { duration: 0.3 };

  return (
    <motion.div
      className="relative w-full"
      style={{ transformOrigin: "50% 100%" }}
      // scaleX has to go through framer, not an inline `transform`. Framer owns the
      // transform property to animate `rotate`, so an inline transform is silently
      // overwritten — which is why the right-hand penguin never turned to face the left.
      animate={{
        rotate: walking ? [-5.5, 5.5, -5.5] : 0,
        scaleX: flip ? -1 : 1,
      }}
      transition={{
        rotate: walking
          ? { duration: CYCLE, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.4, ease: "easeOut" },
        scaleX: { duration: 0.35, ease: "easeOut" },
      }}
    >
      <svg viewBox="0 0 80 100" className="w-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id={body} cx="36%" cy="24%" r="82%">
            <stop offset="0%" stopColor="#6a5f74" />
            <stop offset="52%" stopColor="#4a4054" />
            <stop offset="100%" stopColor="#332b3d" />
          </radialGradient>
          <radialGradient id={belly} cx="42%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#fffdf7" />
            <stop offset="68%" stopColor="#f8ebd4" />
            <stop offset="100%" stopColor="#e9d5b8" />
          </radialGradient>
          <linearGradient id={beak} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f7bd76" />
            <stop offset="100%" stopColor="#dc8f4c" />
          </linearGradient>
        </defs>

        {/* feet, stepping half a cycle apart */}
        <motion.g animate={step} transition={stepT(0)}>
          <ellipse cx="33" cy="93" rx="8.5" ry="4.2" fill="#d8894a" />
        </motion.g>
        <motion.g animate={step} transition={stepT(CYCLE / 2)}>
          <ellipse cx="47" cy="93.5" rx="8.5" ry="4.2" fill="#e8a35c" />
        </motion.g>

        {view === "side" && (
          <motion.g
            animate={walking ? { rotate: [8, -12, 8] } : { rotate: -3 }}
            transition={
              walking
                ? { duration: CYCLE, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.4 }
            }
            style={{ transformOrigin: "24px 48px" }}
          >
            <ellipse cx="23" cy="62" rx="7" ry="16" fill="#2c2436" />
          </motion.g>
        )}

        {/* rim light — the same silhouette nudged toward the sun, sitting behind */}
        <g fill="rgba(255,206,150,0.75)">
          <ellipse cx="37.6" cy="62.6" rx="25" ry="30" />
          <ellipse cx={view === "side" ? 40.6 : 38.6} cy="29.6" rx="20.5" ry="19.5" />
        </g>

        <ellipse cx="40" cy="64" rx="25" ry="30" fill={`url(#${body})`} />
        <ellipse cx={view === "side" ? 43 : 40} cy="31" rx="20.5" ry="19.5" fill={`url(#${body})`} />

        {view === "side" ? (
          <>
            <ellipse cx="48" cy="68" rx="17.5" ry="24" fill={`url(#${belly})`} />
            <ellipse cx="50" cy="38" rx="11" ry="11" fill={`url(#${belly})`} />
            <path d="M62 32 L77 38 L62 44 Z" fill={`url(#${beak})`} />
            <circle cx="57" cy="28" r="3.6" fill="#241d28" />
            <circle cx="58.3" cy="26.8" r="1.25" fill="#fffaf0" opacity="0.95" />
            <ellipse cx="53" cy="36" rx="4.4" ry="2.8" fill="#e79a8f" opacity="0.32" />
          </>
        ) : (
          <>
            {/* walking away: the back of a penguin — no face, flippers at its sides.
                The one nearest the other penguin swings out to meet theirs, so the pair
                reads as holding on to each other rather than just walking in step.
                (Positive rotation swings a below-pivot shape to the left.) */}
            <motion.g
              animate={{ rotate: link === "left" ? 24 : 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ transformOrigin: "22px 53px" }}
            >
              <ellipse cx="22" cy="66" rx="6.5" ry="15" fill="#2c2436" />
            </motion.g>
            <motion.g
              animate={{ rotate: link === "right" ? -24 : 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ transformOrigin: "58px 53px" }}
            >
              <ellipse cx="58" cy="66" rx="6.5" ry="15" fill="#2c2436" />
            </motion.g>
            <ellipse cx="40" cy="60" rx="14" ry="20" fill="#54495f" opacity="0.5" />
          </>
        )}
      </svg>
    </motion.div>
  );
}
