"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Breathe } from "./Breathe";
import { complete, dailyPath, pathFromIds, MISSIONS, getProgress, type Mission, type Progress } from "@/lib/missions";
import { getMemory, feelingLine } from "@/lib/memory";
import { addStrength, dimForCategory } from "@/lib/strengths";

const EASE = [0.16, 1, 0.3, 1] as const;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white px-7 text-center"
    >
      {children}
    </motion.div>
  );
}

function TimerRun({ mission, onDone }: { mission: Mission; onDone: () => void }) {
  const total = mission.seconds ?? 20;
  const [left, setLeft] = useState(total);
  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);
  return (
    <Shell>
      <div className="relative grid size-44 place-items-center">
        <motion.div
          className="absolute inset-0 rounded-full border border-ink/15"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="text-[40px] font-semibold tabular-nums">{left}</span>
      </div>
      <h3 className="mt-8 text-[22px] font-semibold tracking-[-0.03em]">{mission.title}</h3>
      <p className="mt-1 text-[15px] text-ink/45">{mission.sub}</p>
    </Shell>
  );
}

function ReflectRun({ mission, onDone }: { mission: Mission; onDone: () => void }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [reflection, setReflection] = useState("");

  async function submit() {
    if (!val.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: mission.prompt, input: val.trim() }),
      });
      const data = await res.json();
      setReflection(data.reflection ?? "I'm really glad you did that.");
    } catch {
      setReflection("I'm really glad you did that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="w-full max-w-md">
        {!reflection ? (
          <>
            <h3 className="text-[24px] font-semibold leading-snug tracking-[-0.03em]">{mission.prompt}</h3>
            <textarea
              value={val}
              onChange={(e) => setVal(e.target.value)}
              rows={3}
              autoFocus
              placeholder="However it comes out is okay."
              className="mt-7 w-full resize-none border-0 border-b border-hair bg-transparent pb-2 text-center text-[18px] text-ink outline-none transition-colors placeholder:text-ink/20 focus:border-ink"
            />
            <button
              onClick={submit}
              disabled={!val.trim() || busy}
              className="mt-9 rounded-full bg-ink px-8 py-3.5 text-[15px] font-medium text-white transition active:scale-[0.98] disabled:opacity-30"
            >
              {busy ? "…" : "Share with Yara"}
            </button>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <div className="mx-auto mb-5 size-2 rounded-full bg-[#E98A7C]" />
            <p className="text-[20px] font-medium leading-relaxed tracking-[-0.02em] text-ink">{reflection}</p>
            <button
              onClick={onDone}
              className="mt-9 rounded-full bg-ink px-8 py-3.5 text-[15px] font-medium text-white transition active:scale-[0.98]"
            >
              Thank you
            </button>
          </motion.div>
        )}
      </div>
    </Shell>
  );
}

function TapRun({ mission, onDone }: { mission: Mission; onDone: () => void }) {
  return (
    <Shell>
      <h3 className="text-[26px] font-semibold tracking-[-0.03em]">{mission.title}</h3>
      <p className="mt-2 text-[16px] text-ink/45">{mission.sub}</p>
      <button
        onClick={onDone}
        className="mt-10 rounded-full bg-ink px-9 py-4 text-[16px] font-medium text-white transition active:scale-[0.98]"
      >
        Done
      </button>
    </Shell>
  );
}

function MissionRun({ mission, onDone }: { mission: Mission; onDone: () => void }) {
  if (mission.type === "breathe")
    return (
      <Shell>
        <Breathe onDone={onDone} />
      </Shell>
    );
  if (mission.type === "timer") return <TimerRun mission={mission} onDone={onDone} />;
  if (mission.type === "reflect") return <ReflectRun mission={mission} onDone={onDone} />;
  return <TapRun mission={mission} onDone={onDone} />;
}

export function Missions({ onClose }: { onClose: () => void }) {
  const [path, setPath] = useState<Mission[]>(dailyPath);
  const [note, setNote] = useState("");
  const [prog, setProg] = useState<Progress>({ light: 0, streak: 0, doneToday: [] });
  const [active, setActive] = useState<Mission | null>(null);
  const [gained, setGained] = useState(0);

  useEffect(() => {
    setProg(getProgress());
    const mem = getMemory();
    fetch("/api/path", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        intake: mem.intake,
        moods: mem.checkins.map((c) => c.mood),
        feeling: feelingLine(),
        missions: MISSIONS.map((m) => ({ id: m.id, title: m.title, sub: m.sub, category: m.category })),
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.ids) && d.ids.length) setPath(pathFromIds(d.ids));
        if (d.note) setNote(d.note);
      })
      .catch(() => {});
  }, []);

  function finish(m: Mission) {
    setProg(complete(m.id));
    addStrength(dimForCategory(m.category));
    setGained(m.light);
    setActive(null);
    setTimeout(() => setGained(0), 1600);
  }

  const allDone = path.every((m) => prog.doneToday.includes(m.id));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-6 pb-3 pt-6">
        <button onClick={onClose} className="text-[15px] text-ink/40 transition hover:text-ink">
          Close
        </button>
        <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-ink/70">
          <span className="rounded-full bg-mist px-3 py-1">✦ {prog.light}</span>
          <span className="rounded-full bg-mist px-3 py-1">{prog.streak}-day streak</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-6">
        <h2 className="text-[30px] font-semibold tracking-[-0.04em]">Today’s path</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/45">
          {note || "Small, kind steps. Do any that feel right — there’s no failing here."}
        </p>

        <div className="mt-6 flex flex-col gap-3 pb-12">
          {path.map((m) => {
            const isDone = prog.doneToday.includes(m.id);
            return (
              <button
                key={m.id}
                disabled={isDone}
                onClick={() => setActive(m)}
                className={`flex items-center justify-between rounded-3xl border p-5 text-left transition ${
                  isDone ? "border-hair bg-mist/50 opacity-70" : "border-hair hover:bg-mist active:scale-[0.99]"
                }`}
              >
                <div>
                  <div className="text-[16px] font-semibold">{m.title}</div>
                  <div className="mt-0.5 text-[13px] text-ink/45">{m.sub}</div>
                </div>
                <span className="shrink-0 text-[13px] font-medium text-ink/40">
                  {isDone ? "✓" : `✦ ${m.light}`}
                </span>
              </button>
            );
          })}

          {allDone && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-center text-[15px] font-medium text-ink/70"
            >
              You walked the whole path today. That matters. 🤍
            </motion.p>
          )}
        </div>
      </div>

      {/* light-gained toast */}
      <AnimatePresence>
        {gained > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-white shadow-float"
          >
            ✦ +{gained} light
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && <MissionRun key={active.id} mission={active} onDone={() => finish(active)} />}
      </AnimatePresence>
    </motion.div>
  );
}
