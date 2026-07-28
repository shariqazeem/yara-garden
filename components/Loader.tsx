"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAME } from "@/lib/brand";
import { LoaderPenguin } from "@/components/LoaderPenguin";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The first thing anyone sees.
 *
 * Not a spinner, and not a static splash: a small wordless scene played inside the dawn
 * painting. Two penguins waddle in from opposite edges, meet in the middle, hold each
 * other for a moment, then turn and walk on together into the distance — and the world
 * opens where they went.
 *
 * It is doing a job beyond being pretty. Yara is a place people come to when they feel
 * alone, and before a single line of copy the app says: *someone comes to meet you, and
 * you don't walk in on your own.*
 *
 * They walk the line just above the progress bar, so the bar reads as the road under
 * them, filling with light ahead of their feet. Small, softly shadowed, and lit from
 * behind by the same sun as the painting — present in the scene rather than pasted on it.
 */

type Phase = "waiting" | "walking" | "meeting" | "hugging" | "leaving";

/**
 * Where each penguin stands at each beat, as a share of the frame.
 *
 * They walk the line just above the progress bar, which reads as the path they're on —
 * the bar fills like a road being lit ahead of them. Higher up the frame they drift into
 * the middle of the picture and stop belonging to it.
 *
 * Walking away still gains real depth, but only a little: far enough to read as leaving,
 * not so far that they fade into something you'd miss.
 */
const GROUND = "22%";

const MARKS = {
  left: {
    waiting: { left: "6%", bottom: GROUND, scale: 1, opacity: 0 },
    walking: { left: "44.2%", bottom: GROUND, scale: 1, opacity: 1 },
    meeting: { left: "45.4%", bottom: GROUND, scale: 1, opacity: 1 },
    hugging: { left: "46.2%", bottom: GROUND, scale: 1, opacity: 1 },
    // Close enough to be touching as they go. They left together; they shouldn't walk
    // away with a gap between them.
    leaving: { left: "48.3%", bottom: "33%", scale: 0.52, opacity: 0.72 },
  },
  right: {
    waiting: { left: "90%", bottom: GROUND, scale: 1, opacity: 0 },
    walking: { left: "51.6%", bottom: GROUND, scale: 1, opacity: 1 },
    meeting: { left: "50.4%", bottom: GROUND, scale: 1, opacity: 1 },
    hugging: { left: "49.6%", bottom: GROUND, scale: 1, opacity: 1 },
    leaving: { left: "50.0%", bottom: "33%", scale: 0.52, opacity: 0.72 },
  },
} as const;

const DUR: Record<Phase, number> = {
  waiting: 0.4,
  walking: 2.5,
  meeting: 0.45,
  hugging: 0.7,
  leaving: 2.3,
};

function Walker({ side, phase }: { side: "left" | "right"; phase: Phase }) {
  const mark = MARKS[side][phase];
  const walking = phase === "walking" || phase === "leaving";
  const leaving = phase === "leaving";
  const hugging = phase === "hugging";

  // Facing: toward the middle on the way in, and away from us on the way out.
  const view = leaving ? "away" : "side";
  const flip = leaving ? false : side === "right";
  // Walking away, each reaches for the one beside them: the left penguin with its right
  // flipper, the right penguin with its left.
  const link = leaving ? (side === "left" ? "right" : "left") : null;

  return (
    <motion.div
      // Deliberately small — about the size of a lantern on that bank, so they belong to
      // the painting instead of sitting on top of it.
      className="absolute w-[40px]"
      style={{ marginLeft: "-20px" }}
      initial={MARKS[side].waiting}
      animate={mark}
      transition={{
        duration: DUR[phase],
        ease: phase === "walking" ? "linear" : leaving ? [0.35, 0, 0.75, 0.9] : EASE,
        opacity: { duration: leaving ? 2.2 : 0.7, ease: "easeOut" },
      }}
    >
      {/* they lean into each other while they hold on */}
      <motion.div
        animate={{ rotate: hugging ? (side === "left" ? 8 : -8) : 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{ transformOrigin: "50% 100%" }}
      >
        <LoaderPenguin view={view} walking={walking} flip={flip} link={link} />
      </motion.div>

      {/*
        A reflection in the water below them. This is the thing that actually seats them in
        the painting: without it two crisp silhouettes sit *on* the picture, and with it the
        scene owns them. Shallow, blurred, and faded out downward, the way the lanterns on
        the far bank fall into this same water.
      */}
      <div
        className="pointer-events-none absolute left-0 w-full"
        style={{
          top: "100%",
          opacity: 0.2,
          filter: "blur(1.1px)",
          maskImage: "linear-gradient(to bottom, #000 0%, transparent 80%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, transparent 80%)",
        }}
      >
        <div style={{ transform: "scaleY(-0.58)", transformOrigin: "50% 0%" }}>
          <LoaderPenguin view={view} walking={walking} flip={flip} link={link} />
        </div>
      </div>

      {/* a soft footing, so they're standing on the bank rather than floating over it */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
        style={{
          bottom: -3,
          width: "78%",
          height: 6,
          background: "radial-gradient(ellipse, rgba(48,28,12,0.5), transparent 72%)",
        }}
        animate={{ opacity: leaving ? 0.3 : 0.44, scaleX: walking ? [1, 0.86, 1] : 1 }}
        transition={
          walking
            ? { scaleX: { duration: 0.62, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.5 } }
            : { duration: 0.5 }
        }
      />
    </motion.div>
  );
}

export function Loader({ onDone, duration = 7500 }: { onDone: () => void; duration?: number }) {
  const [show, setShow] = useState(true);
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    // One beat at a time, so the waddle can stop for the hug and start again after.
    const beats: [number, Phase][] = [
      [600, "walking"],
      [3150, "meeting"],
      [3650, "hugging"],
      [5150, "leaving"],
    ];
    const timers = beats.map(([at, p]) => setTimeout(() => setPhase(p), at));
    timers.push(setTimeout(() => setShow(false), duration));
    return () => timers.forEach(clearTimeout);
  }, [duration]);

  const hugging = phase === "hugging";

  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          key="loader"
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: EASE }}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[100] overflow-hidden"
          style={{ background: "#171210" }}
        >
          {/* dawn art — blooms from dark, slow Ken Burns drift */}
          <motion.img
            src="/yara_dawn.jpg"
            alt=""
            aria-hidden
            initial={{ opacity: 0, scale: 1.0 }}
            animate={{ opacity: 1, scale: 1.1 }}
            transition={{ opacity: { duration: 1.8, ease: EASE }, scale: { duration: 13, ease: "easeOut" } }}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />

          {/* soft top+bottom shade so the type reads on any frame */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(18,13,10,0.55) 0%, rgba(18,13,10,0) 28%, rgba(18,13,10,0) 58%, rgba(18,13,10,0.6) 100%)",
            }}
          />

          {/* the warmth of the moment they meet, felt in the light rather than stated */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{ opacity: hugging ? 1 : 0 }}
            transition={{ duration: 1.2, ease: EASE }}
            style={{
              background:
                "radial-gradient(circle at 48% 74%, rgba(255,214,158,0.34) 0%, rgba(255,214,158,0.1) 22%, transparent 48%)",
            }}
          />

          <Walker side="left" phase={phase} />
          <Walker side="right" phase={phase} />

          {/* two small hearts, only while they're holding on */}
          <AnimatePresence>
            {hugging &&
              [0, 1].map((i) => (
                <motion.span
                  key={i}
                  className="pointer-events-none absolute select-none"
                  style={{ left: `${47.4 + i * 2.6}%`, bottom: "27%", fontSize: 11 + i * 3 }}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 0.9, 0], y: -46 - i * 12, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.7, delay: i * 0.28, ease: "easeOut" }}
                >
                  🤍
                </motion.span>
              ))}
          </AnimatePresence>

          {/* wordmark — settles in, letter-spacing easing from wide to calm */}
          <div className="absolute inset-x-0 top-[15%] flex flex-col items-center px-6 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.2em" }}
              transition={{ duration: 1.7, ease: EASE, delay: 0.45 }}
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                textShadow: "0 2px 30px rgba(0,0,0,0.45), 0 0 60px rgba(255,206,150,0.28)",
              }}
              className="text-[60px] font-light leading-none text-[#fdf3e6]"
            >
              {APP_NAME}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.75, y: 0 }}
              transition={{ duration: 1.4, ease: EASE, delay: 1.4 }}
              className="mt-3 text-[12px] font-light uppercase tracking-[0.34em] text-[#fdf3e6]"
            >
              a gentle world to heal
            </motion.p>
          </div>

          {/* dawn line — fills with light instead of a spinner */}
          <div className="absolute inset-x-0 bottom-[13%] flex justify-center">
            <div className="relative h-[2px] w-48 overflow-hidden rounded-full" style={{ background: "rgba(253,243,230,0.16)" }}>
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: duration / 1000 - 0.3, ease: "easeInOut" }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,200,130,0) 0%, rgba(255,212,156,0.9) 55%, rgba(255,244,222,1) 100%)",
                  boxShadow: "0 0 14px rgba(255,212,156,0.8)",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
