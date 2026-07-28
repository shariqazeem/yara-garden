"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getName } from "@/lib/account";
import { getMemory, getProfile, setProfile, setIntake } from "@/lib/memory";
import { getReminder, enableReminders, disableReminders, supported as remindersSupported } from "@/lib/reminders";
import {
  signup as cloudSignup,
  login as cloudLogin,
  logout as cloudLogout,
  verifyOtp as cloudVerifyOtp,
  loginWithGoogle,
  isLoggedIn,
  cloudUser,
} from "@/lib/cloud";
import { getStats, moodEmoji, skyEmoji } from "@/lib/stats";
import { getStrengths, STRENGTH_DIMS } from "@/lib/strengths";

const EASE = [0.16, 1, 0.3, 1] as const;
type View = "home" | "account" | "activity" | "remind" | "portrait" | "memory";

export function AccountPanel({ onClose, onOpenCrisis }: { onClose: () => void; onOpenCrisis: () => void }) {
  const name = getName() || "friend";
  const [view, setView] = useState<View>("home");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [msg, setMsg] = useState("");
  const [portrait, setPortrait] = useState("");
  const [busy, setBusy] = useState(false);
  const [rem, setRem] = useState(getReminder());
  const [forgotten, setForgotten] = useState(false);
  const [otp, setOtp] = useState("");
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const loggedIn = isLoggedIn();

  async function doSignup() {
    if (busy) return;
    setBusy(true); setMsg("");
    const r = await cloudSignup(u, p);
    setBusy(false);
    if (r.error) setMsg(r.error);
    else if (r.needsOtp) {
      setAwaitingOtp(true);
      setMsg("I sent a code to your email. Pop it in below and your world is saved forever 🌿");
    }
  }
  async function doVerify() {
    if (busy) return;
    setBusy(true); setMsg("");
    const r = await cloudVerifyOtp(u, otp, p);
    setBusy(false);
    if (r.error) setMsg(r.error);
    else { setMsg("Saved forever 🌿 Carrying your world up…"); setTimeout(() => window.location.reload(), 900); }
  }
  async function doLogin() {
    if (busy) return;
    setBusy(true); setMsg("");
    const r = await cloudLogin(u, p);
    setBusy(false);
    if (r.error) setMsg(r.error);
    else { setMsg("Welcome back — restoring your world…"); setTimeout(() => window.location.reload(), 800); }
  }
  function doLogout() { cloudLogout(); window.location.reload(); }

  function loadPortrait() {
    setView("portrait"); setBusy(true);
    const m = getMemory();
    const talk = Object.values(m.talks ?? {}).flat().slice(-14).map((x) => `${x.role}: ${x.content}`).join("\n");
    fetch("/api/portrait", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, intake: m.intake, moods: m.checkins.map((c) => c.mood), talk, profile: m.profile }),
    })
      .then((r) => r.json())
      .then((d) => setPortrait(d.portrait ?? ""))
      .catch(() => setPortrait("The water's quiet today — but what I see is someone who keeps trying."))
      .finally(() => setBusy(false));
  }
  async function toggleRemind() {
    if (rem.enabled) { disableReminders(); setRem({ ...rem, enabled: false }); setMsg("Reminders off."); }
    else {
      const res = await enableReminders(rem.time);
      if (res === "ok") { setRem({ ...rem, enabled: true }); setMsg(`I'll gently nudge you around ${rem.time} 🌿`); }
      else if (res === "denied") setMsg("Notifications are blocked — enable them in your browser settings.");
      else setMsg("This browser doesn't support reminders.");
    }
  }

  // Yara's living memory is the person's to see and to release.
  function forget() {
    setProfile(""); setIntake("");
    setForgotten(true); setMsg("");
  }

  const field = (label: string, val: string, set: (s: string) => void, type = "text") => (
    <input value={val} onChange={(e) => set(e.target.value)} type={type} placeholder={label} autoCapitalize="none"
      className="w-full rounded-2xl border border-hair bg-white/70 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-ink/40" />
  );
  const row = (title: string, sub: string, onClick: () => void, accent = false) => (
    <button onClick={onClick} className={`rounded-2xl border p-4 text-left transition hover:bg-mist ${accent ? "border-accent/30 bg-accent/[0.04]" : "border-hair"}`}>
      <div className="text-[15px] font-semibold">{title}</div>
      <div className="mt-0.5 text-[13px] text-ink/45">{sub}</div>
    </button>
  );

  return (
    <motion.div
      initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.5, ease: EASE }}
      onPointerDown={(e) => e.stopPropagation()}
      className="glass fixed inset-x-0 bottom-0 z-[60] mx-auto max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border-t border-hair px-6 pb-8 pt-5 shadow-float"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-full bg-ink text-[14px] font-semibold text-white">{name[0]?.toUpperCase()}</span>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">{name}</div>
            <div className="text-[11px] font-medium text-ink/40">{loggedIn ? `saved as ${cloudUser()}` : "your journey"}</div>
          </div>
        </div>
        <button onClick={view === "home" ? onClose : () => { setView("home"); setMsg(""); }} className="text-[14px] text-ink/45 transition hover:text-ink">
          {view === "home" ? "Close" : "Back"}
        </button>
      </div>

      {view === "home" && (
        <div className="mt-6 flex flex-col gap-2.5">
          {row("How Yara sees you ✨", "A gentle portrait of who you are", loadPortrait)}
          {row("Your activity 📊", "Your light, blooms, moods and more", () => setView("activity"))}
          {row("What Yara remembers 🕊️", "See what she holds — and let it go anytime", () => { setView("memory"); setForgotten(false); setMsg(""); })}
          {row(loggedIn ? "Account — saved ✓" : "Save forever — create an account", loggedIn ? `Signed in as ${cloudUser()} · syncs automatically` : "Google or email — comes back on any device", () => { setView("account"); setMsg(""); })}
          {row("Daily reminder", rem.enabled ? `On · around ${rem.time}` : "A soft nudge to return", () => { setView("remind"); setMsg(""); })}
          <button onClick={onOpenCrisis} className="mt-1 self-center text-[11.5px] text-ink/30 transition hover:text-ink/55">
            Feeling unsafe right now? Reach someone who can help →
          </button>
        </div>
      )}

      {view === "account" && (
        <div className="mt-6 flex flex-col gap-3">
          {loggedIn ? (
            <>
              <div className="rounded-2xl bg-mist px-4 py-4 text-[14px] leading-relaxed text-ink/70">
                You're signed in as <span className="font-semibold text-ink">{cloudUser()}</span>. Everything — your talks with Yara, your friends, your light — saves automatically and follows you anywhere.
              </div>
              <button onClick={doLogout} className="rounded-full border border-hair py-3 text-[14px] font-medium text-ink/60 transition hover:bg-mist">Log out</button>
            </>
          ) : (
            <>
              <div className="flex rounded-full bg-mist p-1 text-[13px] font-medium">
                <button onClick={() => { setMode("signup"); setMsg(""); }} className={`flex-1 rounded-full py-2 transition ${mode === "signup" ? "bg-white shadow-sm" : "text-ink/50"}`}>Create account</button>
                <button onClick={() => { setMode("login"); setMsg(""); }} className={`flex-1 rounded-full py-2 transition ${mode === "login" ? "bg-white shadow-sm" : "text-ink/50"}`}>Log in</button>
              </div>
              {/* One tap, nothing to remember. */}
              <button
                onClick={loginWithGoogle}
                className="flex items-center justify-center gap-2.5 rounded-full border border-hair bg-white py-3 text-[14px] font-medium text-ink/75 transition hover:bg-mist active:scale-[0.98]"
              >
                <span className="text-[15px]">🔵</span> Continue with Google
              </button>
              <div className="flex items-center gap-3 text-[11px] text-ink/25">
                <span className="h-px flex-1 bg-hair" /> or with an email <span className="h-px flex-1 bg-hair" />
              </div>

              {field("Email", u, setU)}
              {field("Password", p, setP, "password")}

              {awaitingOtp && mode === "signup" && field("The code from your email", otp, setOtp)}

              <button
                onClick={awaitingOtp && mode === "signup" ? doVerify : mode === "signup" ? doSignup : doLogin}
                disabled={busy}
                className="rounded-full bg-ink py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
              >
                {busy ? "…" : awaitingOtp && mode === "signup" ? "Confirm the code 🌿" : mode === "signup" ? "Create my account 🌿" : "Log in"}
              </button>
              {msg && <p className="text-center text-[13px] leading-relaxed text-ink/60">{msg}</p>}
              <p className="text-center text-[11px] leading-relaxed text-ink/30">
                Your talks stay private to you. Nobody else can read them, not even from the database.
              </p>
            </>
          )}
          {msg && loggedIn && <p className="text-center text-[13px] text-ink/60">{msg}</p>}
        </div>
      )}

      {view === "activity" && <Activity />}

      {view === "remind" && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-hair px-4 py-3">
            <span className="text-[14px] font-medium">Remind me each day</span>
            <input type="time" value={rem.time} onChange={(e) => setRem({ ...rem, time: e.target.value })} className="rounded-lg border border-hair bg-white px-2 py-1 text-[14px] text-ink outline-none" />
          </div>
          <button onClick={toggleRemind} className="rounded-full bg-ink py-3.5 text-[15px] font-semibold text-white transition active:scale-[0.98]">
            {rem.enabled ? "Turn reminders off" : "Turn reminders on"}
          </button>
          {msg && <p className="text-center text-[13px] leading-relaxed text-ink/55">{msg}</p>}
          <p className="text-center text-[11px] leading-relaxed text-ink/30">
            {remindersSupported() ? "Nudges arrive while the app is open at your time. Background reminders come with the installed app." : "This browser doesn't support notifications."}
          </p>
        </div>
      )}

      {view === "portrait" && (
        <div className="mt-6 min-h-[120px]">
          {busy ? (
            <div className="flex justify-center gap-1.5 py-8">
              {[0, 1, 2].map((i) => (<motion.span key={i} className="size-2 rounded-full bg-[#E98A7C]" animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />))}
            </div>
          ) : (
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[16px] leading-relaxed text-ink/85">{portrait}</motion.p>
          )}
        </div>
      )}

      {view === "memory" && (
        <div className="mt-6 flex flex-col gap-4">
          {(() => {
            const prof = forgotten ? "" : getProfile().trim();
            return prof ? (
              <>
                <p className="text-[13px] leading-relaxed text-ink/50">This is what Yara holds about you — in her own words, only so she can remember you with care:</p>
                <div className="rounded-2xl border border-hair bg-mist/60 px-4 py-4 text-[14.5px] leading-relaxed text-ink/80">{prof}</div>
                <button onClick={forget} className="rounded-full border border-hair py-3 text-[13.5px] font-medium text-ink/55 transition hover:bg-mist active:scale-[0.98]">Gently let it go</button>
                <p className="text-center text-[11px] leading-relaxed text-ink/35">It lives on your device (and your account, if you saved one). Yara never keeps medical details. It's yours — let it go anytime, and she'll simply come to know you again.</p>
              </>
            ) : (
              <div className="rounded-2xl bg-mist px-4 py-5 text-center text-[14px] leading-relaxed text-ink/65">
                {forgotten ? "Let go. 🕊️  Yara will come to know you again, gently, whenever you're ready." : "Yara doesn't hold anything yet — she'll come to know you, gently, as you talk."}
              </div>
            );
          })()}
        </div>
      )}
    </motion.div>
  );
}

function Activity() {
  const s = getStats();
  const tile = (big: string, label: string) => (
    <div className="rounded-2xl border border-hair px-4 py-4 text-center">
      <div className="text-[24px] font-semibold tracking-tight">{big}</div>
      <div className="mt-0.5 text-[12px] text-ink/45">{label}</div>
    </div>
  );
  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2.5">
        {tile(`✦ ${s.light}`, "light")}
        {tile(`${Math.floor(s.light / 8)}`, "blooms")}
        {tile(`${s.daysActive}`, "days here")}
        {tile(`${s.friends}`, "friends")}
        {tile(`${s.talks}`, "things shared")}
        {tile(`${s.doneToday}`, "today's path")}
      </div>
      <div className="rounded-2xl border border-hair px-4 py-4">
        <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink/35">recent check-ins</div>
        {s.recentMoods.length ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[22px]">
            {s.recentMoods.map((m, i) => (<span key={i} title={m.mood}>{moodEmoji(m.mood)}</span>))}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-ink/45">No check-ins yet — your first one starts the story.</p>
        )}
      </div>
      {s.recentSkies.length > 0 && (
        <div className="rounded-2xl border border-hair px-4 py-4">
          <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink/35">your sky, day by day</div>
          <div className="mt-3 flex flex-wrap gap-2 text-[20px]">
            {s.recentSkies.map((f, i) => (<span key={i} title={f.date}>{skyEmoji(f.sky)}</span>))}
          </div>
        </div>
      )}
      {(() => {
        const str = getStrengths();
        const denom = Math.max(8, ...STRENGTH_DIMS.map((d) => str[d.key]));
        return (
          <div className="rounded-2xl border border-hair px-4 py-4">
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink/35">your strengths, growing</div>
            <div className="mt-3 flex flex-col gap-2.5">
              {STRENGTH_DIMS.map((d) => (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="w-[80px] text-[12.5px] text-ink/55">{d.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (str[d.key] / denom) * 100)}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      <p className="text-center text-[11.5px] leading-relaxed text-ink/35">Every small thing you do here is real progress. Come back tomorrow and watch it grow. 🌿</p>
    </div>
  );
}
