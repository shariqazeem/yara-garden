"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialogue } from "@/components/Dialogue";
import { MeetCard } from "@/components/MeetCard";
import { IntakeChat } from "@/components/IntakeChat";
import { Reflection } from "@/components/Reflection";
import { SetYourSky } from "@/components/SetYourSky";
import { Missions } from "@/components/Missions";
import { getProgress, addLight, type Progress } from "@/lib/missions";
import { CHARACTERS, CHAR_BY_ID, type Character } from "@/lib/characters";
import { getFriends, addFriend } from "@/lib/social";
import { getMemory, getTodayFeeling, setIntake, addCheckin, setTodayFeeling } from "@/lib/memory";
import { Loader } from "@/components/Loader";
import { Arrival, type Answers } from "@/components/Arrival";
import { LeaveNote } from "@/components/LeaveNote";
import { AccountPanel } from "@/components/AccountPanel";
import { SitMoment } from "@/components/SitMoment";
import { getName, setName, getGender, setGender, type Gender } from "@/lib/account";
import { CrisisResources } from "@/components/CrisisResources";
import { MoveMoment } from "@/components/MoveMoment";
import { startAmbient, chime, setMuted, isMuted } from "@/lib/sound";
import { schedule as scheduleReminder } from "@/lib/reminders";
import { syncUp, syncDown, refreshSession, restoreAnonymous } from "@/lib/cloud";
import { MilestoneCard } from "@/components/MilestoneCard";
import { nextMilestone, type Milestone } from "@/lib/milestones";
import { CalmTheStorm } from "@/components/CalmTheStorm";
import { addStrength } from "@/lib/strengths";
import { installApiBridge } from "@/lib/base44";
import { GardenNotes } from "@/components/GardenNotes";
import { useSharedGarden, OtherVisitors, SharedGardenToggle } from "@/components/SharedGarden";

// Route the app's original /api/* calls to Base44 backend functions. Installed at module
// load so it is in place before any component fetches. See lib/base44.ts.
installApiBridge();

// ── a bigger, zoned, living world ───────────────────────────────────────────
const W = 1500;
const H = 1150;
const SPAWN = { x: 750, y: 1055 };
const TALK_RANGE = 118;
const FOUNTAIN = { x: 750, y: 540 };
const WAYPOINT = { x: 884, y: 624 }; // Today's path lantern, by the plaza
const POND = { x: 250, y: 330 }; // Still Pond — quiet NW
const GREEN = { x: 1240, y: 612 }; // The Green — movement, E
const HUSH = { x: 1050, y: 400 }; // The Hush — a calm glade (the regulation mini-game)
const YARA_SPOT = { x: 252, y: 408 }; // Yasira's chick — at the Still Pond's edge, in her own little garden
const ROAD_VX = FOUNTAIN.x - 36; // vertical road left edge
const ROAD_HY = FOUNTAIN.y - 36; // horizontal road top edge
const ZMIN = 1.2;
const ZMAX = 2.7;

// soft ground-tints that give each zone its own feeling
const ZONES = [
  { x: 250, y: 330, r: 230, color: "rgba(150,200,225,0.28)" },  // Still Pond · cool (NW)
  { x: 360, y: 770, r: 250, color: "rgba(233,168,156,0.17)" },  // Yara's Grove · warm (SW)
  { x: 280, y: 1030, r: 195, color: "rgba(240,212,150,0.22)" }, // The Hearth · amber (SW corner)
  { x: 750, y: 540, r: 215, color: "rgba(226,194,212,0.15)" },  // Fountain Plaza · soft (center)
  { x: 1050, y: 400, r: 205, color: "rgba(196,186,224,0.20)" }, // The Hush · calm lavender (N)
  { x: 1240, y: 612, r: 225, color: "rgba(154,206,134,0.24)" }, // The Green · lush (E)
  { x: 992, y: 905, r: 215, color: "rgba(255,200,124,0.19)" },  // Lantern Grove · golden (SE)
];

const PROPS = [
  // — Yara's Grove (SW): entered through the rose arch, framed and open —
  { src: "/arch.png", x: 576, y: 702, w: 152 },            // the gateway you walk through into the grove
  { src: "/tree.png", x: 156, y: 676, w: 122 },             // west frame
  { src: "/tree.png", x: 150, y: 892, w: 116 },             // southwest frame
  { src: "/bush.png", x: 250, y: 782, w: 66 },
  { src: "/bush.png", x: 492, y: 792, w: 62 },
  // — The Hearth (SW corner): Yara's cottage + your blooming garden —
  { src: "/newyarahouse.png", x: 202, y: 1024, w: 204 },
  { src: "/tree.png", x: 556, y: 1018, w: 116 },
  { src: "/bush.png", x: 458, y: 980, w: 60 },
  // — The Still Pond (NW): quiet, cool —
  { src: "/tree.png", x: 132, y: 244, w: 126 },
  { src: "/tree.png", x: 132, y: 476, w: 116 },
  { src: "/tree.png", x: 432, y: 250, w: 116 },
  { src: "/bush.png", x: 372, y: 446, w: 64 },
  { src: "/flower.png", x: 196, y: 432, w: 54 },
  { src: "/flower.png", x: 346, y: 372, w: 50 },
  // — Yasira's quiet nook: her penguin's own little garden in front of the pond —
  { src: "/flower.png", x: 178, y: 396, w: 46 },
  { src: "/flower.png", x: 332, y: 400, w: 44 },
  { src: "/flower.png", x: 212, y: 460, w: 42 },
  { src: "/flower.png", x: 300, y: 452, w: 44 },
  // — Fountain Plaza (center): where the paths meet —
  { src: "/lamp.png", x: 648, y: 706, w: 56 },
  { src: "/lamp.png", x: 852, y: 706, w: 56 },
  { src: "/lamp.png", x: FOUNTAIN.x, y: 384, w: 56 },
  { src: "/flower.png", x: 632, y: 642, w: 52 },
  { src: "/flower.png", x: 866, y: 470, w: 52 },
  // — The Hush + Juno (N): a calm glade —
  { src: "/house.png", x: 1186, y: 246, w: 150 },           // Juno's cottage
  { src: "/tree.png", x: 1058, y: 206, w: 124 },
  { src: "/tree.png", x: 1380, y: 286, w: 126 },
  { src: "/bush.png", x: 974, y: 372, w: 62 },
  // — The Green (E): open and lush —
  { src: "/tree.png", x: 1392, y: 548, w: 122 },
  { src: "/tree.png", x: 1366, y: 742, w: 122 },
  { src: "/bush.png", x: 1306, y: 556, w: 64 },
  { src: "/flower.png", x: 1190, y: 690, w: 54 },
  // — Lantern Grove (SE): the wishing tree —
  { src: "/tree.png", x: 992, y: 892, w: 170 },             // the wishing tree (tap to wish)
  { src: "/bush.png", x: 882, y: 952, w: 62 },
  { src: "/bush.png", x: 1100, y: 962, w: 60 },
  { src: "/flower.png", x: 1080, y: 1010, w: 52 },
  // — path lanterns —
  { src: "/lamp.png", x: 320, y: ROAD_HY + 36, w: 56 },
  { src: "/lamp.png", x: 1140, y: ROAD_HY + 36, w: 56 },
];
const LAMPS = PROPS.filter((p) => p.src.includes("lamp")).map((p) => ({ x: p.x, y: p.y - p.w * 0.55 }));

const KIDS = [ // gathered around the story circle (≈372,852), facing Yara
  { src: "/kid1.png", x: 296, y: 828, w: 74, d: 0.0 },
  { src: "/kid2.png", x: 446, y: 836, w: 74, d: 0.5 },
  { src: "/kid3.png", x: 372, y: 900, w: 68, d: 0.9 },
  { src: "/kid4.png", x: 462, y: 800, w: 66, d: 1.3 },
];
const CHICKS = [
  { src: "/chick_yellow.png", x: 322, y: 800, w: 44, d: 0.0 },
  { src: "/chick_green.png", x: 420, y: 804, w: 44, d: 0.45 },
  { src: "/chick_yellow.png", x: 346, y: 878, w: 42, d: 0.9 },
];
const PETALS = [{ x: 300, y: 200 }, { x: 820, y: 150 }, { x: 1200, y: 380 }, { x: 560, y: 560 }, { x: 980, y: 720 }, { x: 200, y: 880 }];
const FLORA = [ // blooms scattered through the open meadow so no corner feels bare
  { x: 660, y: 318, w: 44 }, { x: 540, y: 360, w: 42 }, { x: 770, y: 760, w: 44 },
  { x: 636, y: 980, w: 44 }, { x: 884, y: 648, w: 42 }, { x: 1052, y: 540, w: 44 },
  { x: 1180, y: 300, w: 42 }, { x: 1300, y: 198, w: 44 }, { x: 1422, y: 430, w: 42 },
  { x: 1300, y: 980, w: 46 }, { x: 1432, y: 880, w: 44 }, { x: 700, y: 470, w: 40 },
];
const CLOUD_SHADOWS = [ // soft shadows of clouds passing overhead — drifting depth
  { x: 250, y: 380, w: 380, dur: 64, drift: 520 },
  { x: 1050, y: 820, w: 440, dur: 78, drift: -620 },
  { x: 720, y: 180, w: 320, dur: 58, drift: 470 },
  { x: 1300, y: 480, w: 360, dur: 70, drift: -500 },
];
const GROVE_LANTERNS = [ // floating lanterns ringing the wishing tree
  { x: 902, y: 884 }, { x: 1082, y: 884 }, { x: 940, y: 952 }, { x: 1044, y: 958 }, { x: 992, y: 826 },
];
const LEAVES = [ // a few leaves drifting on the breeze
  { x: 400, dur: 15, hue: 20, delay: 0 }, { x: 900, dur: 18, hue: 60, delay: 4 },
  { x: 1250, dur: 16, hue: 35, delay: 8 }, { x: 650, dur: 20, hue: 8, delay: 12 },
  { x: 1100, dur: 17, hue: 50, delay: 6 },
];
const WISHES = [
  "Your wish drifts up to the lanterns ✨",
  "Held — and gently let go.",
  "The light remembers you.",
  "Somewhere, a warmth answers.",
  "Make it soft. Make it true.",
];
// your garden (the Hearth) — blooms one flower for ~every 8 light you earn
const GARDEN_SPOTS = [ // your blooms grow around the Hearth cottage
  { x: 300, y: 1004 }, { x: 364, y: 1052 }, { x: 252, y: 1082 }, { x: 332, y: 976 },
  { x: 410, y: 1030 }, { x: 196, y: 1006 }, { x: 380, y: 1090 },
  { x: 452, y: 1078 }, { x: 158, y: 1058 }, { x: 286, y: 1110 }, { x: 424, y: 962 }, { x: 484, y: 1036 },
];
const BLOOM_COLORS = ["#E9B7C8", "#F0D08A", "#B7C8E9", "#C8E9B7", "#D6B7E9"];
const SIGNS = [
  { x: 350, y: 644, label: "Yara's Grove" },
  { x: 384, y: 958, label: "The Hearth" },
  { x: 644, y: 424, label: "Fountain Plaza" },
  { x: 1050, y: 312, label: "The Hush" },
  { x: 1240, y: 514, label: "The Green" },
  { x: 992, y: 794, label: "Lantern Grove" },
];
const CLOUDS = [
  { x: 240, y: 110, s: 1.1, dur: 64, drift: 130 },
  { x: 820, y: 70, s: 1.4, dur: 82, drift: 160 },
  { x: 1240, y: 170, s: 1.0, dur: 72, drift: 120 },
  { x: 1020, y: 430, s: 0.8, dur: 92, drift: 100 },
];
const DISCOVERIES = [
  { id: "d1", x: 1410, y: 180, note: "A hidden firefly ✨ — even in the dark, something in you glows." },
  { id: "d2", x: 150, y: 1090, note: "A four-leaf clover 🍀 — luck tends to find the ones who wander." },
  { id: "d3", x: 1400, y: 1080, note: "A smooth river stone 🪨 — you are steadier than you feel." },
  { id: "d4", x: 470, y: 250, note: "A sleeping butterfly 🦋 — rest isn't giving up. It's how you go on." },
  { id: "d5", x: 1180, y: 430, note: "A wish-seed dandelion 🌼 — go on, make one. You're allowed to want things." },
  { id: "d6", x: 250, y: 650, note: "A warm stone in the sun ☀️ — small comforts count. Take them." },
  { id: "d7", x: 1070, y: 930, note: "A tiny mushroom ring 🍄 — you found a secret. Yara knew you would." },
];

// little welcomes the world gives a returning heart
const RETURN_LINES = [
  "While you were away, the lanterns stayed lit for you 🏮",
  "The garden kept growing — and kept your place 🌱",
  "You came back. Yara was hoping you would 🤍",
  "A new bloom opened by the pond while you were gone 🌸",
];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const todayStr = () => new Date().toISOString().slice(0, 10);
const ARROWS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
const arrowFor = (dx: number, dy: number) => ARROWS[Math.round((((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360) / 45) % 8];

function timeTint(hour: number): { overlay: string; night: boolean; mist: boolean } {
  const mist = (hour >= 5 && hour < 8) || (hour >= 18 && hour < 23); // soft fog at dawn/dusk/night
  if (hour >= 5 && hour < 7) return { overlay: "linear-gradient(180deg, rgba(255,168,118,0.22), rgba(255,205,160,0.10))", night: false, mist }; // dawn
  if (hour >= 7 && hour < 11) return { overlay: "rgba(255,247,214,0.07)", night: false, mist }; // bright morning
  if (hour >= 11 && hour < 16) return { overlay: "transparent", night: false, mist }; // midday
  if (hour >= 16 && hour < 19) return { overlay: "linear-gradient(180deg, rgba(255,182,92,0.18), rgba(255,140,82,0.11))", night: false, mist }; // golden hour
  if (hour >= 19 && hour < 21) return { overlay: "linear-gradient(180deg, rgba(156,104,164,0.15), rgba(98,82,150,0.14))", night: false, mist }; // dusk
  return { overlay: "linear-gradient(180deg, rgba(36,48,104,0.26), rgba(26,36,86,0.32))", night: true, mist }; // night
}

type Npc = { id: string; x: number; y: number; tx: number; ty: number; pause: number; face: number };

function useViewport() {
  const [vp, setVp] = useState({ w: 390, h: 780 });
  useEffect(() => {
    const u = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    u();
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);
  return vp;
}

// The world re-renders on every animation frame because the player is React state, so the
// scenery has to opt out or 37 static trees and lamps get reconciled 60 times a second for
// nothing. Their props are module-level constants, so memo skips them permanently.
const Prop = memo(function Prop({ src, x, y, w }: { src: string; x: number; y: number; w: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" draggable={false} className="pointer-events-none absolute select-none"
      style={{ left: x - w / 2, top: y - w * 0.9, width: w, height: w, objectFit: "contain", zIndex: Math.round(y) }} />
  );
});

const ZoneTint = memo(function ZoneTint({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return <div className="pointer-events-none absolute rounded-full" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, background: `radial-gradient(circle, ${color}, transparent 68%)`, zIndex: 1 }} />;
});

function Cloud({ x, y, s, dur, drift }: { x: number; y: number; s: number; dur: number; drift: number }) {
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: x, top: y, zIndex: 9200 }}
      animate={{ x: [0, drift, 0] }} transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}>
      <div className="relative" style={{ width: 120 * s, height: 50 * s, opacity: 0.5 }}>
        <div className="absolute rounded-full bg-white" style={{ left: 0, top: 14 * s, width: 70 * s, height: 34 * s }} />
        <div className="absolute rounded-full bg-white" style={{ left: 34 * s, top: 0, width: 58 * s, height: 50 * s }} />
        <div className="absolute rounded-full bg-white" style={{ left: 62 * s, top: 14 * s, width: 60 * s, height: 34 * s }} />
      </div>
    </motion.div>
  );
}

function Discovery({ x, y, near, onTap }: { x: number; y: number; near: boolean; onTap: () => void }) {
  return (
    <motion.div className="absolute cursor-pointer" style={{ left: x - 16, top: y - 16, width: 32, height: 32, zIndex: Math.round(y) + 2 }}
      onPointerDown={(e) => e.stopPropagation()} onClick={onTap}
      animate={{ y: [0, -6, 0], rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
      <div className="grid size-full place-items-center text-[20px]" style={{ filter: `drop-shadow(0 0 ${near ? 9 : 4}px rgba(244,206,107,${near ? 0.95 : 0.5}))` }}>✨</div>
    </motion.div>
  );
}

const PLAY_EMOJI = ["♪", "✨", "❤", "🌸", "☺", "🎈", "⭐", "!"];
const PLAY_WORDS = ["hehe!", "look!", "yay!", "again!", "wheee", "tag!"];
const BUTTERFLIES = [
  { x: 470, y: 560, hue: 0, dur: 13 }, { x: 980, y: 700, hue: 60, dur: 16 },
  { x: 250, y: 480, hue: 300, dur: 14 }, { x: 1180, y: 430, hue: 190, dur: 17 },
  { x: 640, y: 900, hue: 30, dur: 15 },
];
const FIREFLIES = [
  { x: 320, y: 760 }, { x: 760, y: 560 }, { x: 1080, y: 820 }, { x: 540, y: 640 },
  { x: 240, y: 900 }, { x: 900, y: 400 }, { x: 1240, y: 660 },
];
const SPARKLES = [
  { x: 400, y: 700 }, { x: 820, y: 500 }, { x: 1100, y: 760 }, { x: 300, y: 560 },
  { x: 640, y: 920 }, { x: 1180, y: 520 }, { x: 520, y: 340 }, { x: 940, y: 860 },
];

// little play/thought bubbles that pop above the children and souls — the "they're alive" touch
function LifeBubble({ x, y, seed, words = true }: { x: number; y: number; seed: number; words?: boolean }) {
  const [b, setB] = useState<{ id: number; txt: string; word: boolean } | null>(null);
  useEffect(() => {
    let alive = true; let timer: ReturnType<typeof setTimeout>; let n = 0;
    const cycle = () => {
      if (!alive) return;
      const word = words && Math.random() < 0.28;
      const txt = word ? PLAY_WORDS[Math.floor(Math.random() * PLAY_WORDS.length)] : PLAY_EMOJI[Math.floor(Math.random() * PLAY_EMOJI.length)];
      setB({ id: ++n, txt, word });
      timer = setTimeout(() => { if (!alive) return; setB(null); timer = setTimeout(cycle, 3200 + Math.random() * 6500); }, 2200);
    };
    timer = setTimeout(cycle, 1400 + seed * 800 + Math.random() * 4200);
    return () => { alive = false; clearTimeout(timer); };
  }, [seed, words]);
  return (
    <AnimatePresence>
      {b && (
        <motion.div key={b.id} className="pointer-events-none absolute" style={{ left: x, top: y, zIndex: 100001 }}
          initial={{ opacity: 0, y: 4, scale: 0.6, x: "-50%" }} animate={{ opacity: 1, y: -12, scale: 1, x: "-50%" }} exit={{ opacity: 0, y: -28, scale: 0.8, x: "-50%" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          {b.word
            ? <span className="whitespace-nowrap rounded-full bg-white/90 px-2 py-[3px] text-[9px] font-bold text-ink shadow-sm">{b.txt}</span>
            : <span className="text-[17px] drop-shadow-sm">{b.txt}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Butterfly({ x, y, hue, dur }: { x: number; y: number; hue: number; dur: number }) {
  return (
    <motion.div className="pointer-events-none absolute select-none" style={{ left: x, top: y, zIndex: 9500, filter: `hue-rotate(${hue}deg)` }}
      animate={{ x: [0, 46, -24, 34, 0], y: [0, -34, -12, -44, 0] }} transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}>
      <motion.div className="text-[14px]" animate={{ rotate: [-10, 10, -10], scaleX: [1, 0.66, 1] }} transition={{ duration: 0.34, repeat: Infinity, ease: "easeInOut" }}>🦋</motion.div>
    </motion.div>
  );
}

function KidSprite({ src, x, y, w, delay }: { src: string; x: number; y: number; w: number; delay: number }) {
  return (
    <>
      <div className="absolute rounded-[50%] bg-black/12 blur-[1px]" style={{ left: x - w * 0.18, top: y - 5, width: w * 0.36, height: w * 0.12, zIndex: Math.round(y) }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src={src} alt="" draggable={false} className="pointer-events-none absolute select-none"
        style={{ left: x - w / 2, top: y - w * 0.92, width: w, height: w, objectFit: "contain", zIndex: Math.round(y) + 1 }}
        animate={{ y: [0, -3, 0] }} transition={{ duration: 2.6, repeat: Infinity, delay, ease: "easeInOut" }} />
      <LifeBubble x={x} y={y - w * 0.96} seed={delay} />
    </>
  );
}

function CatSprite({ x, y, facing, onTap, src }: { x: number; y: number; facing: number; onTap: () => void; src: string }) {
  const w = 46; // the boy's companion — a little chick (chuzzi) that hops along beside him
  return (
    <>
      <div className="absolute rounded-[50%] bg-black/12 blur-[1px]" style={{ left: x - 9, top: y - 4, width: 18, height: 7, zIndex: Math.round(y) }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src={src} alt="" draggable={false} onPointerDown={(e) => e.stopPropagation()} onClick={onTap} className="absolute cursor-pointer select-none"
        style={{ left: x - w / 2, top: y - w * 0.9, width: w, height: w, objectFit: "contain", scaleX: facing, zIndex: Math.round(y) + 1 }}
        animate={{ y: [0, -5, 0] }} transition={{ duration: 0.62, repeat: Infinity, ease: "easeInOut" }} />
    </>
  );
}

function Chick({ src, x, y, w, d, onTap }: { src: string; x: number; y: number; w: number; d: number; onTap: () => void }) {
  return (
    <>
      <div className="absolute rounded-[50%] bg-black/12 blur-[1px]" style={{ left: x - w * 0.16, top: y - 3, width: w * 0.32, height: w * 0.1, zIndex: Math.round(y) }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img src={src} alt="" draggable={false} onPointerDown={(e) => e.stopPropagation()} onClick={onTap} className="absolute cursor-pointer select-none"
        style={{ left: x - w / 2, top: y - w * 0.9, width: w, height: w, objectFit: "contain", zIndex: Math.round(y) + 1 }}
        animate={{ y: [0, -7, 0] }} transition={{ duration: 1.3, repeat: Infinity, delay: d, ease: "easeInOut" }} />
    </>
  );
}

function YaraChick({ x, y, onTap }: { x: number; y: number; onTap: () => void }) {
  const w = 64, h = 88; // Yasira's chick — standing in her joyful pose (aspect ~0.73)
  return (
    <>
      <div className="absolute rounded-[50%] bg-black/16 blur-[1px]" style={{ left: x - w * 0.24, top: y - 2, width: w * 0.48, height: w * 0.14, zIndex: Math.round(y) }} />
      {/* a soft warm glow — she's special */}
      <motion.div className="pointer-events-none absolute rounded-full" style={{ left: x - h * 0.5, top: y - h, width: h, height: h, background: "radial-gradient(circle, rgba(255,206,168,0.24), transparent 66%)", zIndex: Math.round(y) }}
        animate={{ opacity: [0.55, 0.85, 0.55] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/chick_yara.png" alt="" draggable={false} onPointerDown={(e) => e.stopPropagation()} onClick={onTap} className="absolute cursor-pointer select-none"
        style={{ left: x - w / 2, top: y - h * 0.94, width: w, height: h, objectFit: "contain", zIndex: Math.round(y) + 1 }} />
    </>
  );
}

function Bloom({ x, y, i }: { x: number; y: number; i: number }) {
  const c = BLOOM_COLORS[i % BLOOM_COLORS.length];
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: x - 7, top: y - 18, width: 14, height: 20, zIndex: Math.round(y) }}
      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      <div className="absolute bottom-0 left-1/2 h-3.5 w-[2px] -translate-x-1/2 rounded bg-[#7CB36A]" />
      <div className="absolute left-1/2 top-1.5 -translate-x-1/2">
        {[0, 72, 144, 216, 288].map((a) => (
          <div key={a} className="absolute size-[7px] rounded-full" style={{ background: c, transform: `rotate(${a}deg) translateY(-4px)`, transformOrigin: "center" }} />
        ))}
        <div className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F4D06B]" />
      </div>
    </motion.div>
  );
}

function Signpost({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div className="pointer-events-none absolute" style={{ left: x - 34, top: y - 30, width: 68, height: 36, zIndex: Math.round(y) }}>
      <div className="absolute bottom-0 left-1/2 h-5 w-[3px] -translate-x-1/2 rounded bg-[#9A7B57]" />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#cdab78] bg-[#EBD8B4] px-2 py-1 text-[9px] font-bold text-[#7A5A30] shadow-sm">{label}</div>
    </div>
  );
}

function Pond({ x, y, glow }: { x: number; y: number; glow: boolean }) {
  const w = 156, h = 125;
  return (
    <div className="absolute" style={{ left: x - w / 2, top: y - h * 0.82, width: w, height: h, zIndex: Math.round(y) }}>
      {glow && <div className="absolute left-1/2 top-1/2 size-20 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(circle,rgba(127,196,216,0.55),transparent 70%)" }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/pond.png" alt="" draggable={false} className="pointer-events-none absolute left-0 top-0 select-none" style={{ width: w, height: h, objectFit: "contain" }} />
      {/* drifting surface shimmer */}
      <motion.div className="absolute left-[34%] top-[38%] h-2 w-9 rounded-full bg-white/45 blur-[2px]" animate={{ opacity: [0.25, 0.55, 0.25], x: [0, 6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute left-[52%] top-[56%] h-1.5 w-6 rounded-full bg-white/35 blur-[2px]" animate={{ opacity: [0.12, 0.4, 0.12], x: [0, -5, 0] }} transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
      {/* slow expanding ripple rings on the still water */}
      {[0, 2].map((d, i) => (
        <motion.div key={i} className="absolute left-1/2 top-[54%] rounded-[50%] border border-white/35" style={{ x: "-50%", y: "-50%" }}
          initial={{ width: 8, height: 5, opacity: 0 }} animate={{ width: 70, height: 32, opacity: [0, 0.45, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: "easeOut", delay: d }} />
      ))}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink shadow-sm">🪞 Still Pond</div>
    </div>
  );
}

function Fountain({ x, y }: { x: number; y: number }) {
  const w = 138;
  return (
    <div className="absolute" style={{ left: x - w / 2, top: y + 18 - w * 0.9, width: w, height: w, zIndex: Math.round(y + 18) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/fountain.png" alt="" draggable={false} className="pointer-events-none absolute inset-0 select-none" style={{ width: w, height: w, objectFit: "contain" }} />
      {/* arcing water droplets from the spout */}
      {Array.from({ length: 8 }).map((_, i) => {
        const dir = (i % 2 ? 1 : -1) * (4 + (i % 4) * 5);
        return (
          <motion.div key={i} className="pointer-events-none absolute rounded-full bg-white/75" style={{ left: "50%", top: "36%", width: 3.5, height: 3.5, marginLeft: -1.75 }}
            animate={{ x: [0, dir], y: [0, -16, 16], opacity: [0, 1, 0] }}
            transition={{ duration: 1.3 + (i % 3) * 0.25, repeat: Infinity, ease: "easeOut", delay: i * 0.16 }} />
        );
      })}
      {/* basin shimmer + ripples */}
      <motion.div className="pointer-events-none absolute left-1/2 top-[64%] h-2 w-12 -translate-x-1/2 rounded-full bg-white/40 blur-[2px]" animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
      {[0, 1.4].map((d, i) => (
        <motion.div key={`r${i}`} className="pointer-events-none absolute left-1/2 top-[66%] rounded-[50%] border border-white/40" style={{ x: "-50%", y: "-50%" }}
          initial={{ width: 6, height: 4, opacity: 0 }} animate={{ width: 50, height: 22, opacity: [0, 0.5, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut", delay: d }} />
      ))}
    </div>
  );
}

function Lantern({ x, y, i, night }: { x: number; y: number; i: number; night: boolean }) {
  return (
    <motion.div className="pointer-events-none absolute" style={{ left: x - 8, top: y - 26, width: 16, zIndex: Math.round(y) }}
      animate={{ y: [0, -9, 0] }} transition={{ duration: 3.2 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}>
      <div className="absolute left-1/2 top-0 h-2.5 w-[1.5px] -translate-x-1/2 rounded bg-[#9A7B57]" />
      <div className="absolute left-1/2 top-2 size-3.5 -translate-x-1/2 rounded-[3px]" style={{ background: "linear-gradient(180deg,#F8CE78,#E89B4A)", boxShadow: night ? "0 0 16px 6px rgba(246,200,112,0.85)" : "0 0 9px 3px rgba(246,200,112,0.45)" }} />
      <motion.div className="absolute left-1/2 top-2 size-3.5 -translate-x-1/2 rounded-full" style={{ background: "rgba(255,235,160,0.7)", filter: "blur(3px)" }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }} />
    </motion.div>
  );
}

function Soul({ npc, char, glow, isFriend, moving, seed }: { npc: Npc; char: Character; glow: boolean; isFriend: boolean; moving: boolean; seed: number }) {
  const S = 92;
  const { x, y, face } = npc;
  return (
    <>
      <div className="absolute rounded-[50%] bg-black/15 blur-[1px]" style={{ left: x - 18, top: y - 6, width: 36, height: 12, zIndex: Math.round(y) }} />
      <div className="absolute flex items-center gap-1 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink shadow-sm"
        style={{ left: x, top: y - S - 2, transform: "translateX(-50%)", zIndex: 100000 }}>
        {char.guide && <span className="text-[8px]">✦</span>}
        {char.name}
        {isFriend && !char.guide && <span className="text-good">·</span>}
      </div>
      <motion.div className="absolute" style={{ left: x - S / 2, top: y - S + 10, width: S, height: S, zIndex: Math.round(y) + 1 }}
        animate={{ y: moving ? [0, -5, 0] : [0, -3, 0] }} transition={{ duration: moving ? 0.5 : 2.8, repeat: Infinity, ease: "easeInOut" }}>
        {(glow || char.guide) && <div className="absolute inset-3 rounded-full" style={{ background: char.color, opacity: glow ? 0.22 : 0.13, filter: "blur(12px)" }} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={char.sprite} alt="" draggable={false} className="pointer-events-none absolute left-0 top-0 select-none"
          style={{ width: S, height: S, objectFit: "contain", transform: `scaleX(${face})` }} />
      </motion.div>
      {!char.guide && <LifeBubble x={x + 14} y={y - S + 2} seed={seed} />}
    </>
  );
}

function RainOverlay({ heavy }: { heavy: boolean }) {
  const n = heavy ? 50 : 32;
  return (
    <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
      {Array.from({ length: n }).map((_, i) => (
        <motion.div key={i} className="absolute w-px bg-white/45" style={{ left: `${(i * 41) % 100}%`, height: heavy ? 22 : 16, top: 0 }}
          animate={{ y: ["-6vh", "106vh"] }} transition={{ duration: 0.6 + (i % 5) * 0.12, repeat: Infinity, delay: (i % 10) * 0.12, ease: "linear" }} />
      ))}
    </div>
  );
}

export default function Village() {
  const vp = useViewport();
  const [scale, setScale] = useState(1.7);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // manual drag-pan offset (0 = camera follows player)
  const [muted, setMutedState] = useState(false);
  const soundStarted = useRef(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleId = useRef(0);
  const wishId = useRef(0);
  const [player, setPlayer] = useState(SPAWN);
  const playerRef = useRef(SPAWN);
  const targetRef = useRef(SPAWN);
  const panReturn = useRef(false); // when true, the camera eases its drag-pan offset back to the player
  const [cat, setCat] = useState({ x: SPAWN.x - 32, y: SPAWN.y + 10 });
  const [npcs, setNpcs] = useState<Npc[]>(() =>
    CHARACTERS.map((c, i) => ({
      id: c.id, x: c.x, y: c.y,
      tx: clamp(c.x + (i % 2 ? 65 : -65), 70, W - 70),
      ty: clamp(c.y + 45, 130, H - 60),
      pause: 0, face: 1,
    }))
  );
  const [moved, setMoved] = useState(false);
  const [friends, setFriends] = useState<string[]>([]);
  const [hasIntake, setHasIntake] = useState(true);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [activeChar, setActiveChar] = useState<Character | null>(null);
  const [meetChar, setMeetChar] = useState<Character | null>(null);
  const [showMissions, setShowMissions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [arrivalOpen, setArrivalOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [gender, setGenderState] = useState<Gender>("boy");
  const [moodCheckOpen, setMoodCheckOpen] = useState(false);
  const [reflectOpen, setReflectOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [sitChar, setSitChar] = useState<Character | null>(null);
  const [greenOpen, setGreenOpen] = useState(false);
  const [hushOpen, setHushOpen] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; e: string }[]>([]);
  const heartId = useRef(0);
  const returnRef = useRef(0); // ms since last visit (0 = first visit this device)
  const visitedRef = useRef(false); // guard the lastVisit read/write against StrictMode double-invoke
  const [toast, setToast] = useState("");
  const [progress, setProgress] = useState<Progress>({ light: 0, streak: 0, doneToday: [] });
  const [tod, setTod] = useState(() => timeTint(12));
  const [collected, setCollected] = useState<string[]>([]);
  const [sky, setSky] = useState("clear"); // today's inner weather — set by the player
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  const busy = !!activeChar || !!meetChar || showMissions || arrivalOpen || accountOpen || intakeOpen || moodCheckOpen || reflectOpen || noteOpen || crisisOpen || !!sitChar || greenOpen || hushOpen || !!milestone;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  useEffect(() => {
    const hi = !!getMemory().intake?.trim();
    setProgress(getProgress());
    setFriends(getFriends());
    setHasIntake(hi);
    setPlayerName(getName() || "");
    setGenderState(getGender());
    setMutedState(isMuted());
    setTod(timeTint(new Date().getHours()));
    setSky(getTodayFeeling()?.sky || "clear");
    try { setCollected(JSON.parse(window.localStorage.getItem("psiddx.discoveries.v1") || "[]")); } catch { /* */ }
    if (!visitedRef.current) {
      visitedRef.current = true;
      const lastV = Number(window.localStorage.getItem("psiddx.lastVisit") || 0);
      returnRef.current = lastV ? Date.now() - lastV : 0;
      try { window.localStorage.setItem("psiddx.lastVisit", String(Date.now())); } catch { /* */ }
    }
    // first-touch (new + returning) is handled by the Arrival cinematic -> finishArrival
    scheduleReminder();
    const t = setInterval(() => setTod(timeTint(new Date().getHours())), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let raf = 0;
    // The souls drift at half a pixel per frame, so stepping them every third frame is
    // invisible — but it stops rebuilding the whole npc array (and re-rendering every
    // Soul) sixty times a second, which is what actually made the world feel heavy on
    // large desktop windows.
    let frame = 0;
    const tick = () => {
      frame++;
      if (!busyRef.current) {
        setPlayer((p) => {
          const t = targetRef.current;
          const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
          if (d < 0.5) { playerRef.current = p; return p; }
          const s = Math.min(d, 4.6);
          const np = { x: p.x + (dx / d) * s, y: p.y + (dy / d) * s };
          playerRef.current = np;
          return np;
        });
        if (frame % 3 === 0) {
          setNpcs((list) => list.map((n) => {
            if (n.id === "sol") return n;
            if (n.pause > 0) return { ...n, pause: n.pause - 3 };
            const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
            if (d < 2) {
              const home = CHAR_BY_ID[n.id];
              const ang = Math.random() * Math.PI * 2, r = 30 + Math.random() * 95;
              return { ...n, pause: 110 + Math.floor(Math.random() * 220), tx: clamp(home.x + Math.cos(ang) * r, 70, W - 70), ty: clamp(home.y + Math.sin(ang) * r, 130, H - 60) };
            }
            const s = Math.min(d, 1.5);
            return { ...n, x: n.x + (dx / d) * s, y: n.y + (dy / d) * s, face: dx >= 0 ? 1 : -1 };
          }));
        }
      }
      setCat((c) => {
        const t = { x: playerRef.current.x - 30, y: playerRef.current.y + 12 };
        const dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy);
        if (d < 2) return c;
        const s = Math.min(d, 4.2);
        return { x: c.x + (dx / d) * s, y: c.y + (dy / d) * s };
      });
      if (panReturn.current) {
        setPan((pn) => {
          const nx = Math.abs(pn.x) < 0.6 ? 0 : pn.x * 0.82;
          const ny = Math.abs(pn.y) < 0.6 ? 0 : pn.y * 0.82;
          if (nx === 0 && ny === 0) panReturn.current = false;
          return { x: nx, y: ny };
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Ask Base44 who this is, once, on boot. Anonymous visitors simply stay anonymous —
  // the whole world still works on-device without an account.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let alive = true;
    refreshSession().then(async (email) => {
      if (!alive) return;
      if (!email) {
        // No account: Yara still keeps their memory in the database, found by a hashed
        // device id. Only restores when this browser has nothing of its own.
        await restoreAnonymous();
        return;
      }
      // They're already signed in from a previous visit: bring their world back down.
      await syncDown();
      setSignedIn(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    // Runs for everyone now, not just signed-in people — an anonymous visitor's memory is
    // persisted through the `memory` backend function instead of the entity API.
    const id = setInterval(syncUp, 20000);
    const onHide = () => { if (document.visibilityState === "hidden") syncUp(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", syncUp);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", syncUp); };
  }, [signedIn]);

  // The shared garden. Off unless this person opens the gate themselves.
  const shared = useSharedGarden({ x: player.x, y: player.y, name: playerName, avatar: gender });

  // celebrate real growth — friends, streaks, light, treasures found
  useEffect(() => {
    if (busyRef.current && !milestone) return;
    const m = nextMilestone({ light: progress.light, streak: progress.streak, friends: friends.length, discoveries: collected.length });
    if (m) setMilestone(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, friends, collected]);

  const maxCamX = Math.max(0, W * scale - vp.w);
  const maxCamY = Math.max(0, H * scale - vp.h);
  const camX = clamp(player.x * scale - vp.w / 2 - pan.x, 0, maxCamX);
  const camY = clamp(player.y * scale - vp.h / 2 - pan.y, 0, maxCamY);

  const nearest = npcs.reduce<{ npc: Npc; char: Character; d: number } | null>((acc, n) => {
    const d = Math.hypot(player.x - n.x, player.y - n.y);
    return d < TALK_RANGE && (!acc || d < acc.d) ? { npc: n, char: CHAR_BY_ID[n.id], d } : acc;
  }, null);
  const nearWaypoint = Math.hypot(player.x - WAYPOINT.x, player.y - WAYPOINT.y) < TALK_RANGE && !nearest;
  const nearPond = Math.hypot(player.x - POND.x, player.y - POND.y) < TALK_RANGE && !nearest;
  const nearGreen = Math.hypot(player.x - GREEN.x, player.y - GREEN.y) < TALK_RANGE && !nearest && !nearPond;
  const nearHush = Math.hypot(player.x - HUSH.x, player.y - HUSH.y) < TALK_RANGE && !nearest && !nearPond && !nearGreen;
  const facing = targetRef.current.x >= player.x ? 1 : -1;
  const catFacing = player.x >= cat.x ? 1 : -1;
  const moving = !busy && Math.hypot(targetRef.current.x - player.x, targetRef.current.y - player.y) > 1.5;
  const companionSrc = gender === "girl" ? "/penguin.png" : "/chick_companion.png"; // chuzzi walks with the boy
  const playerSrc = gender === "girl" ? "/player_girl.png" : "/player.png";
  const isFriendOrGuide = (c: Character) => c.guide || friends.includes(c.id);

  let objective: { label: string; tx: number; ty: number } | null = null;
  if (!hasIntake) {
    const y = npcs.find((n) => n.id === "sol");
    objective = { label: "Meet Yara", tx: y?.x ?? 360, ty: y?.y ?? 740 };
  } else if (friends.length === 0) {
    const j = npcs.find((n) => n.id !== "sol" && !friends.includes(n.id));
    if (j) objective = { label: `Say hi to ${CHAR_BY_ID[j.id].name}`, tx: j.x, ty: j.y };
  } else if (progress.doneToday.length === 0) {
    objective = { label: "Walk Today’s path", tx: WAYPOINT.x, ty: WAYPOINT.y };
  } else {
    objective = { label: "Look into the Still Pond", tx: POND.x, ty: POND.y };
  }

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);

  function clampPan(px: number, py: number) {
    // keep the panned camera within world bounds (camX = base - pan must stay in [0, maxCam])
    const baseX = playerRef.current.x * scale - vp.w / 2;
    const baseY = playerRef.current.y * scale - vp.h / 2;
    return { x: clamp(px, baseX - maxCamX, baseX), y: clamp(py, baseY - maxCamY, baseY) };
  }
  function onPointerDown(e: React.PointerEvent) {
    if (!soundStarted.current && !muted) { soundStarted.current = true; startAmbient(); }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
      down.current = null;
      return;
    }
    down.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setScale(clamp(pinch.current.scale * (d / pinch.current.dist), ZMIN, ZMAX));
      return;
    }
    // single-pointer drag -> pan the world (mouse drag or one-finger touch) without walking
    if (down.current && !busy && Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 8) {
      panReturn.current = false; // an active drag overrides any camera-return in progress
      setPan((p) => clampPan(p.x + (e.clientX - prev.x), p.y + (e.clientY - prev.y)));
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    const wasPinch = pointers.current.size >= 2;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (wasPinch || pointers.current.size > 0) return;
    const di = down.current; down.current = null;
    if (!di || busy) return;
    if (Math.hypot(e.clientX - di.x, e.clientY - di.y) > 14) return; // a drag/pan, not a tap -> keep the panned view
    const tx = clamp((e.clientX + camX) / scale, 24, W - 24);
    const ty = clamp((e.clientY + camY) / scale, 70, H - 16);
    targetRef.current = { x: tx, y: ty };
    const rid = rippleId.current++;
    setRipples((r) => [...r.slice(-4), { id: rid, x: tx, y: ty }]);
    setTimeout(() => setRipples((r) => r.filter((z) => z.id !== rid)), 700);
    bloom(tx, ty); // a little life blooms where you step
    panReturn.current = true; // a tap to walk glides the camera smoothly back to the player (no snap)
    setMoved(true);
  }
  const zoom = (dir: number) => setScale((s) => clamp(s + dir * 0.35, ZMIN, ZMAX));
  const freeze = () => { targetRef.current = { ...playerRef.current }; };

  function openTalk(c: Character) {
    freeze();
    if (c.guide && !hasIntake) setIntakeOpen(true);
    else setActiveChar(c);
  }
  function openMeet(c: Character) { freeze(); setMeetChar(c); }
  function openSit(c: Character) { freeze(); setSitChar(c); }
  function befriend(c: Character) {
    setFriends(addFriend(c.id));
    addStrength("connection");
    setMeetChar(null);
    flash(`You and ${c.name} are friends now 🌿`);
  }
  function finishIntake() {
    setIntakeOpen(false);
    setHasIntake(!!getMemory().intake?.trim());
    flash("Yara will remember that 🤍");
    if (window.localStorage.getItem("psiddx.mood.date") !== todayStr()) setMoodCheckOpen(true);
  }
  function finishArrival(name: string, g: Gender, ans: Answers) {
    setName(name); setPlayerName(name);
    setGender(g); setGenderState(g);
    const { feeling, spark, care } = ans;
    if (feeling || spark || care) {
      // a new arrival — plant Yara's first understanding from the gentle quiz
      const parts = ["I've just arrived in this place."];
      if (spark) parts.push(`I came ${spark}.`);
      if (feeling) parts.push(`Right now I feel ${feeling.word}.`);
      if (care) parts.push(`When things get heavy, ${care} helps me most.`);
      setIntake(parts.join(" "));
      if (feeling) { addCheckin(feeling.mood); setTodayFeeling(feeling.sky, [feeling.word]); setSky(feeling.sky); }
      window.localStorage.setItem("psiddx.mood.date", todayStr());
      setHasIntake(true);
    } else if (!!getMemory().intake?.trim() && window.localStorage.getItem("psiddx.mood.date") !== todayStr()) {
      setMoodCheckOpen(true); // returning — the daily sky check-in
    }
    setArrivalOpen(false);
    // returning after a while — the world quietly welcomes you back
    if (returnRef.current > 12 * 3600 * 1000) {
      setTimeout(() => {
        flash(RETURN_LINES[Math.floor(Date.now() / 86400000) % RETURN_LINES.length]);
        bloom(playerRef.current.x, playerRef.current.y - 40);
        setProgress(addLight(3));
      }, 900);
    }
  }
  function collect(d: { id: string; note: string }) {
    if (collected.includes(d.id)) return;
    const next = [...collected, d.id];
    setCollected(next);
    try { window.localStorage.setItem("psiddx.discoveries.v1", JSON.stringify(next)); } catch { /* */ }
    setProgress(addLight(10));
    chime(4);
    flash(d.note);
  }
  function react(x: number, y: number) {
    chime();
    const id = heartId.current++;
    const e = ["♥", "✿", "♪", "✨"][id % 4];
    setHearts((h) => [...h.slice(-10), { id, x, y, e }]);
    setTimeout(() => setHearts((h) => h.filter((z) => z.id !== id)), 1100);
  }
  function bloom(x: number, y: number) {
    const petals = ["✿", "🌸", "✨", "🍃"];
    for (let k = 0; k < 2; k++) {
      const id = heartId.current++;
      setHearts((h) => [...h.slice(-12), { id, x: x + (k ? 11 : -11), y: y - 4, e: petals[id % petals.length] }]);
      setTimeout(() => setHearts((h) => h.filter((z) => z.id !== id)), 1200);
    }
  }
  function wish() {
    flash(WISHES[wishId.current % WISHES.length]);
    wishId.current++;
    ["✨", "🌟", "⭐"].forEach((e, k) => {
      const id = heartId.current++;
      setHearts((h) => [...h.slice(-10), { id, x: 992 + (k - 1) * 22, y: 845, e }]);
      setTimeout(() => setHearts((h) => h.filter((z) => z.id !== id)), 1400);
    });
    chime(0);
    setProgress(addLight(2));
  }

  const toggleSound = () => {
    const m = !muted;
    setMutedState(m);
    setMuted(m);
    if (!m && !soundStarted.current) { soundStarted.current = true; startAmbient(); }
  };
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  const roadBg = { backgroundImage: "url(/path.png)", backgroundSize: "150px", backgroundRepeat: "repeat" as const };
  const openDiscoveries = DISCOVERIES.filter((d) => !collected.includes(d.id));

  return (
    <main
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onWheel={(e) => setScale((s) => clamp(s - e.deltaY * 0.0015, ZMIN, ZMAX))}
      className="relative h-[100dvh] w-screen touch-none select-none overflow-hidden" style={{ background: "#cfe4c0" }}
    >
      {loading && <Loader onDone={() => setLoading(false)} />}

      {/* The world stays calm and unscored — your growth shows in the garden's blooms, never a
          HUD of points or a streak you could "break" (invite, don't extract). Your journey is
          still there to look back on, quietly, in "your journey" (top-right). */}

      <button onPointerDown={stop} onClick={() => setAccountOpen(true)} aria-label="Your journey"
        className="glass absolute right-5 top-6 z-10 grid size-10 place-items-center rounded-full border border-hair text-[13px] font-semibold text-ink/70 shadow-card active:scale-95">
        {(playerName || "·")[0]?.toUpperCase()}
      </button>

      {!busy && (
        <button onPointerDown={stop} onClick={() => setNoteOpen(true)} aria-label="Leave a note"
          className="glass absolute bottom-6 left-5 z-10 flex items-center gap-1.5 rounded-full border border-hair px-3.5 py-2 text-[12px] font-medium text-ink/65 shadow-card transition hover:text-ink active:scale-95">
          🕊️ <span>leave a note</span>
        </button>
      )}

      {!busy && (
        <SharedGardenToggle
          joined={shared.joined}
          count={shared.others.length}
          onToggle={() => shared.setJoined(!shared.joined)}
        />
      )}

      <div className="absolute right-5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
        <button onPointerDown={stop} onClick={toggleSound} aria-label="sound" className="glass grid size-11 place-items-center rounded-full border border-hair text-[15px] shadow-card active:scale-95">{muted ? "🔇" : "🔊"}</button>
        <button onPointerDown={stop} onClick={() => zoom(1)} className="glass grid size-11 place-items-center rounded-full border border-hair text-[20px] font-light text-ink/70 shadow-card active:scale-95">+</button>
        <button onPointerDown={stop} onClick={() => zoom(-1)} className="glass grid size-11 place-items-center rounded-full border border-hair text-[22px] font-light text-ink/70 shadow-card active:scale-95">−</button>
      </div>

      <div
        className="absolute left-0 top-0"
        // translate3d + will-change keeps the camera on the GPU. Without it Safari
        // re-rasterises the whole world on the main thread as the camera follows you,
        // which is why a big desktop window crawled while a phone stayed smooth.
        style={{ width: W, height: H, transform: `translate3d(${-camX}px, ${-camY}px, 0) scale(${scale})`, transformOrigin: "0 0", willChange: "transform", backgroundImage: "url(/ground.png)", backgroundSize: "300px", backgroundRepeat: "repeat" }}
      >
        {ZONES.map((z, i) => <ZoneTint key={i} {...z} />)}

        {/* Lanterns holding notes left by other people, live from Base44. */}
        <GardenNotes worldW={W} worldH={H} />

        {/* Other people walking this same garden right now, if the gate is open. */}
        {shared.joined && <OtherVisitors visitors={shared.others} />}

        <div className="absolute" style={{ left: ROAD_VX, top: 0, width: 72, height: H, ...roadBg }} />
        <div className="absolute" style={{ left: 0, top: ROAD_HY, width: W, height: 72, ...roadBg }} />
        <div className="absolute rounded-full" style={{ left: FOUNTAIN.x - 150, top: FOUNTAIN.y - 150, width: 300, height: 300, ...roadBg }} />

        {/* the story circle in Yara's grove — where the little ones gather to learn from her */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/story_circle.png" alt="" draggable={false} className="pointer-events-none absolute select-none"
          style={{ left: 272, top: 782, width: 200, height: 144, objectFit: "contain", zIndex: 3, opacity: 0.97 }} />
        {PROPS.map((p, i) => <Prop key={i} {...p} />)}
        {FLORA.map((f, i) => (
          <motion.img key={`fl${i}`} src="/flower.png" alt="" draggable={false} className="pointer-events-none absolute select-none"
            style={{ left: f.x - f.w / 2, top: f.y - f.w * 0.9, width: f.w, height: f.w, objectFit: "contain", transformOrigin: "bottom center", zIndex: Math.round(f.y) }}
            animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 3.6 + i * 0.2, repeat: Infinity, ease: "easeInOut" }} />
        ))}
        <Fountain x={FOUNTAIN.x} y={FOUNTAIN.y} />
        {GROVE_LANTERNS.map((l, i) => <Lantern key={`ln${i}`} {...l} i={i} night={tod.night} />)}
        {/* the wishing tree — tap it to send up a wish */}
        <button onPointerDown={stop} onClick={wish} aria-label="make a wish at the wishing tree"
          className="absolute cursor-pointer" style={{ left: 992 - 72, top: 892 - 168, width: 144, height: 168, zIndex: Math.round(892) + 2, background: "transparent" }} />
        <motion.div className="pointer-events-none absolute select-none text-[15px]" style={{ left: 992, top: 892 - 196, zIndex: Math.round(892) + 2 }}
          initial={{ x: "-50%" }} animate={{ x: "-50%", y: [0, -6, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>✨</motion.div>
        {GROVE_LANTERNS.map((l, i) => (
          <motion.div key={`ws${i}`} className="pointer-events-none absolute rounded-full" style={{ left: l.x, top: l.y - 6, width: 3, height: 3, background: "rgba(255,225,150,0.9)", boxShadow: "0 0 5px 2px rgba(255,210,130,0.6)", zIndex: 9100 }}
            animate={{ y: [0, -28, 0], opacity: [0, 1, 0] }} transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: "easeInOut" }} />
        ))}
        {LEAVES.map((l, i) => (
          <motion.div key={`lf${i}`} className="pointer-events-none absolute select-none text-[13px]" style={{ left: l.x, top: -40, zIndex: 9300, filter: `hue-rotate(${l.hue}deg)` }}
            animate={{ y: [0, H + 80], x: [0, 60, -40, 50, 0], rotate: [0, 200, 360] }} transition={{ duration: l.dur, repeat: Infinity, ease: "linear", delay: l.delay }}>🍃</motion.div>
        ))}

        {PETALS.map((p, i) => (
          <motion.div key={i} className="absolute size-1.5 rounded-full bg-[#E9B7C8]" style={{ left: p.x, top: p.y, zIndex: 9000 }}
            animate={{ y: [0, 26, 0], x: [0, 12, 0], opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }} />
        ))}

        {CLOUDS.map((c, i) => <Cloud key={i} {...c} />)}

        {/* a soft shaft of daylight warms the world */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 72% at 50% -8%, rgba(255,251,232,0.40), transparent 58%)", zIndex: 2 }} />
        {/* shadows of clouds drifting overhead */}
        {CLOUD_SHADOWS.map((c, i) => (
          <motion.div key={`cs${i}`} className="pointer-events-none absolute rounded-[50%]" style={{ left: c.x, top: c.y, width: c.w, height: c.w * 0.5, background: "radial-gradient(ellipse, rgba(60,72,60,0.06), transparent 72%)", zIndex: 2 }}
            animate={{ x: [0, c.drift, 0] }} transition={{ duration: c.dur, repeat: Infinity, ease: "easeInOut" }} />
        ))}
        {/* living world — butterflies by day, fireflies by night, drifting sparkles always */}
        {BUTTERFLIES.map((b, i) => <Butterfly key={`bf${i}`} {...b} />)}
        {SPARKLES.map((s, i) => (
          <motion.div key={`sp${i}`} className="pointer-events-none absolute rounded-full" style={{ left: s.x, top: s.y, width: 4, height: 4, background: "rgba(255,240,190,0.9)", boxShadow: "0 0 6px 2px rgba(255,230,160,0.5)", zIndex: 9100 }}
            animate={{ y: [0, -24, 0], opacity: [0, 0.9, 0], scale: [0.5, 1, 0.5] }} transition={{ duration: 5 + i * 0.7, repeat: Infinity, ease: "easeInOut" }} />
        ))}
        {tod.night && FIREFLIES.map((f, i) => (
          <motion.div key={`ff${i}`} className="pointer-events-none absolute rounded-full" style={{ left: f.x, top: f.y, width: 5, height: 5, background: "#FCE68A", boxShadow: "0 0 9px 3px rgba(252,230,138,0.75)", zIndex: 9400 }}
            animate={{ x: [0, 22, -12, 16, 0], y: [0, -16, -26, -9, 0], opacity: [0.15, 1, 0.4, 1, 0.15] }} transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }} />
        ))}
        {ripples.map((r) => (
          <motion.div key={r.id} className="pointer-events-none absolute rounded-full border-[2.5px] border-white/75" style={{ left: r.x, top: r.y, zIndex: Math.round(r.y) }}
            initial={{ width: 10, height: 10, x: -5, y: -5, opacity: 0.75 }} animate={{ width: 52, height: 52, x: -26, y: -26, opacity: 0 }} transition={{ duration: 0.62, ease: "easeOut" }} />
        ))}

        <div className="absolute" style={{ left: WAYPOINT.x - 16, top: WAYPOINT.y - 42, width: 32, height: 42, zIndex: Math.round(WAYPOINT.y) }}>
          <div className="absolute bottom-0 left-1/2 h-2.5 w-7 -translate-x-1/2 rounded-[50%] bg-black/12 blur-[1px]" />
          <div className="absolute bottom-2 left-1/2 h-8 w-[3px] -translate-x-1/2 rounded bg-[#9A8F7E]" />
          <motion.div className="absolute left-1/2 top-0 size-5 -translate-x-1/2 rounded-full bg-[#F4C66B]" style={{ boxShadow: "0 0 16px 5px rgba(244,198,107,0.55)" }} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink shadow-sm">Today’s path</div>
        </div>

        <Pond x={POND.x} y={POND.y} glow={nearPond} />
        <YaraChick x={YARA_SPOT.x} y={YARA_SPOT.y} onTap={() => react(YARA_SPOT.x, YARA_SPOT.y - 36)} />
        {KIDS.map((kk, i) => <KidSprite key={i} {...kk} delay={kk.d} />)}
        {CHICKS.map((ch, i) => <Chick key={i} {...ch} onTap={() => react(ch.x, ch.y - 22)} />)}
        {GARDEN_SPOTS.slice(0, Math.min(GARDEN_SPOTS.length, Math.floor(progress.light / 8))).map((g, i) => <Bloom key={i} x={g.x} y={g.y} i={i} />)}

        {SIGNS.map((s, i) => <Signpost key={i} {...s} />)}
        <div className="absolute" style={{ left: GREEN.x - 20, top: GREEN.y - 26, width: 40, height: 32, zIndex: Math.round(GREEN.y) }}>
          <div className="absolute bottom-0 left-1/2 h-3 w-9 -translate-x-1/2 rounded-[50%] bg-black/10 blur-[1px]" />
          <motion.div className="absolute bottom-1 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-[#CDEBB0] text-[15px]"
            style={{ boxShadow: nearGreen ? "0 0 14px 4px rgba(150,200,110,0.6)" : "none" }}
            animate={{ y: [0, -3, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>🤸</motion.div>
        </div>
        <div className="absolute" style={{ left: HUSH.x - 20, top: HUSH.y - 26, width: 40, height: 32, zIndex: Math.round(HUSH.y) }}>
          <div className="absolute bottom-0 left-1/2 h-3 w-9 -translate-x-1/2 rounded-[50%] bg-black/10 blur-[1px]" />
          <motion.div className="absolute bottom-1 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full bg-[#CFE0F0] text-[15px]"
            style={{ boxShadow: nearHush ? "0 0 14px 4px rgba(150,180,220,0.6)" : "none" }}
            animate={{ rotate: [0, 360] }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }}>🌀</motion.div>
        </div>

        {openDiscoveries.map((d) => (
          <Discovery key={d.id} x={d.x} y={d.y} near={Math.hypot(player.x - d.x, player.y - d.y) < 140} onTap={() => collect(d)} />
        ))}

        {npcs.map((n, i) => (
          <Soul key={n.id} npc={n} char={CHAR_BY_ID[n.id]} glow={nearest?.npc.id === n.id} isFriend={friends.includes(n.id)} moving={n.id !== "sol" && n.pause === 0 && Math.hypot(n.tx - n.x, n.ty - n.y) > 2} seed={i + 1} />
        ))}

        <CatSprite x={cat.x} y={cat.y} facing={catFacing} src={companionSrc} onTap={() => react(cat.x, cat.y - 30)} />
        <div>
          <div className="absolute rounded-[50%] bg-black/15 blur-[1px]" style={{ left: player.x - 18, top: player.y - 6, width: 36, height: 12, zIndex: Math.round(player.y) }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img src={playerSrc} alt="" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/player.png"; }} className="pointer-events-none absolute select-none"
            style={{ left: player.x - 46, top: player.y - 82, width: 92, height: 92, objectFit: "contain", scaleX: facing, zIndex: Math.round(player.y) + 1 }}
            animate={moving ? { y: [0, -5, 0] } : { y: 0 }}
            transition={moving ? { duration: 0.46, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }} />
        </div>

        {hearts.map((h) => (
          <motion.div key={h.id} className="pointer-events-none absolute select-none text-[20px] font-bold" style={{ left: h.x, top: h.y, zIndex: 99999, color: "#E98A7C" }}
            initial={{ opacity: 1, y: 0, scale: 0.6 }} animate={{ opacity: 0, y: -42, scale: 1.25 }} transition={{ duration: 1.1, ease: "easeOut" }}>
            {h.e}
          </motion.div>
        ))}

        {/* lamps glow at night */}
        {tod.night && LAMPS.map((l, i) => (
          <motion.div key={i} className="pointer-events-none absolute rounded-full" style={{ left: l.x - 26, top: l.y - 26, width: 52, height: 52, background: "radial-gradient(circle,rgba(255,210,120,0.6),transparent 70%)", zIndex: Math.round(l.y) + 2 }}
            animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
        ))}
      </div>

      {/* daytime god-rays — soft slanted light shafts */}
      {!tod.night && (
        <motion.div className="pointer-events-none absolute inset-0 z-[4]" style={{ background: "linear-gradient(108deg, transparent 28%, rgba(255,250,224,0.10) 40%, transparent 48%, rgba(255,250,224,0.07) 60%, transparent 70%)", mixBlendMode: "screen" }}
          animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      )}
      {/* premium depth — a soft vignette focuses the eye on the world */}
      <div className="pointer-events-none absolute inset-0 z-[5]" style={{ background: "radial-gradient(130% 120% at 50% 42%, transparent 62%, rgba(60,46,30,0.10) 100%)" }} />
      {/* dawn / dusk / night mist settling low over the grass */}
      {tod.mist && (
        <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-2/5" style={{ background: "linear-gradient(0deg, rgba(250,244,234,0.13), rgba(250,244,234,0.04) 55%, transparent)" }}
          animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      )}
      {/* day/night atmosphere over the world (below the UI) */}
      <div className="pointer-events-none absolute inset-0 z-[6]" style={{ background: tod.overlay, transition: "background 2s ease" }} />
      {tod.night && (
        <div className="pointer-events-none absolute inset-0 z-[6]">
          {[[40, 60], [120, 120], [220, 70], [300, 150], [70, 200], [340, 90]].map(([l, t], i) => (
            <motion.div key={i} className="absolute size-[3px] rounded-full bg-white" style={{ left: `${l}px`, top: `${t}px` }}
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: "easeInOut" }} />
          ))}
        </div>
      )}
      {(sky === "rainy" || sky === "stormy") && <RainOverlay heavy={sky === "stormy"} />}
      {sky === "golden" && <div className="pointer-events-none absolute inset-0 z-[6]" style={{ background: "radial-gradient(120% 80% at 50% 0%, rgba(255,210,120,0.20), transparent 62%)" }} />}

      <AnimatePresence>
        {objective && !busy && !nearest && (
          <motion.div key={objective.label} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="glass pointer-events-none absolute left-1/2 top-7 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-hair px-4 py-2 text-[13.5px] font-semibold text-ink shadow-card">
            <span className="text-accent">✦</span>
            {objective.label}
            <motion.span className="text-ink/45" animate={{ x: [0, 3, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
              {arrowFor(objective.tx - player.x, objective.ty - player.y)}
            </motion.span>
          </motion.div>
        )}
        {!objective && !moved && !busy && (
          <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass pointer-events-none absolute left-1/2 top-7 -translate-x-1/2 rounded-full border border-hair px-4 py-2 text-[13px] font-medium text-ink/70">
            Tap to walk · pinch to zoom · explore
          </motion.div>
        )}
        {toast && (
          <motion.div key="toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass absolute left-1/2 top-7 z-30 mx-auto max-w-[80%] -translate-x-1/2 rounded-2xl border border-hair px-5 py-2.5 text-center text-[13.5px] font-semibold text-ink shadow-float">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {nearest && !busy && (
          isFriendOrGuide(nearest.char) ? (
            <motion.div key={"acts-" + nearest.char.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2.5">
              <button onPointerDown={stop} onClick={() => openTalk(nearest.char)}
                className="rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-white shadow-float active:scale-95">
                Talk to {nearest.char.name}
              </button>
              <button onPointerDown={stop} onClick={() => openSit(nearest.char)}
                className="rounded-full border border-ink/15 bg-white px-5 py-3.5 text-[15px] font-medium text-ink shadow-float active:scale-95">
                Sit 🌾
              </button>
            </motion.div>
          ) : (
            <motion.button key={"meet-" + nearest.char.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onPointerDown={stop} onClick={() => openMeet(nearest.char)}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-ink/15 bg-white px-7 py-3.5 text-[15px] font-medium text-ink shadow-float">
              Meet {nearest.char.name} 👋
            </motion.button>
          )
        )}
        {nearWaypoint && !busy && (
          <motion.button key="path" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onPointerDown={stop} onClick={() => setShowMissions(true)}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-ink px-7 py-3.5 text-[15px] font-medium text-white shadow-float">
            Today’s path
          </motion.button>
        )}
        {nearPond && !busy && (
          <motion.button key="pond" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onPointerDown={stop} onClick={() => setReflectOpen(true)}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-ink/15 bg-white px-7 py-3.5 text-[15px] font-medium text-ink shadow-float">
            Look into the pond 🪞
          </motion.button>
        )}
        {nearGreen && !busy && (
          <motion.button key="green-btn" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onPointerDown={stop} onClick={() => { freeze(); setGreenOpen(true); }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-ink/15 bg-white px-7 py-3.5 text-[15px] font-medium text-ink shadow-float">
            Move &amp; stretch 🤸
          </motion.button>
        )}
        {nearHush && !busy && (
          <motion.button key="hush-btn" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onPointerDown={stop} onClick={() => { freeze(); setHushOpen(true); }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full border border-ink/15 bg-white px-7 py-3.5 text-[15px] font-medium text-ink shadow-float">
            Calm your storm 🌀
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {arrivalOpen && <Arrival key="arrival" returning={!!playerName} knownName={playerName || undefined} onDone={finishArrival} />}
        {moodCheckOpen && <SetYourSky key="sky" onDone={(s) => { window.localStorage.setItem("psiddx.mood.date", todayStr()); setSky(s); setMoodCheckOpen(false); }} />}
        {reflectOpen && <Reflection key="reflect" onClose={() => setReflectOpen(false)} />}
        {noteOpen && <LeaveNote key="note" onClose={() => setNoteOpen(false)} />}
        {intakeOpen && <IntakeChat key="intake" onDone={finishIntake} />}
        {meetChar && <MeetCard key="meet" character={meetChar} onBefriend={() => befriend(meetChar)} onClose={() => setMeetChar(null)} />}
        {activeChar && <Dialogue key={activeChar.id} character={activeChar} onClose={() => setActiveChar(null)} onCrisis={() => { setActiveChar(null); setCrisisOpen(true); }} />}
        {showMissions && <Missions key="missions" onClose={() => { setShowMissions(false); setProgress(getProgress()); }} />}
        {accountOpen && <AccountPanel key="account" onClose={() => { setAccountOpen(false); setProgress(getProgress()); setFriends(getFriends()); }} onOpenCrisis={() => { setAccountOpen(false); setCrisisOpen(true); }} />}
        {crisisOpen && <CrisisResources key="crisis" onClose={() => setCrisisOpen(false)} />}
        {sitChar && <SitMoment key="sit" character={sitChar} onDone={() => { setProgress(addLight(6)); addStrength("connection"); setSitChar(null); flash("A quiet moment together 🤍"); }} />}
        {greenOpen && <MoveMoment key="green" onDone={() => { setProgress(addLight(8)); addStrength("energy"); setGreenOpen(false); flash("Your body thanks you 🌿"); }} />}
        {hushOpen && <CalmTheStorm key="hush" onDone={() => { setProgress(addLight(10)); addStrength("calm", 2); setHushOpen(false); flash("The storm passed 🕊️"); }} />}
        {milestone && <MilestoneCard key="milestone" milestone={milestone} onClose={() => { setMilestone(null); const m = nextMilestone({ light: progress.light, streak: progress.streak, friends: friends.length, discoveries: collected.length }); if (m) setTimeout(() => setMilestone(m), 350); }} />}
      </AnimatePresence>
    </main>
  );
}
