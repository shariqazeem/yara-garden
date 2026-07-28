"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getMemory, getTalk, saveTalk, getProfile, setProfile, feelingLine, type TalkMsg } from "@/lib/memory";
import { getName } from "@/lib/account";
import { speak, stopSpeaking } from "@/lib/voice";
import type { Character } from "@/lib/characters";

const EASE = [0.16, 1, 0.3, 1] as const;

function Dots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-ink/40"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

export function Dialogue({ character, onClose, onCrisis }: { character: Character; onClose: () => void; onCrisis?: () => void }) {
  const mem = useRef(getMemory());
  const [messages, setMessages] = useState<TalkMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [listening, setListening] = useState(false);
  const [greeting, setGreeting] = useState(""); // Yara's recall-greeting (ephemeral, not saved)
  const [greetLoading, setGreetLoading] = useState(false);
  const [support, setSupport] = useState(false); // shown only if the model senses real distress
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prior = getTalk(character.id);
    if (prior.length) setMessages(prior);

    if (!character.guide) {
      if (!prior.length) {
        const opener = `Hey! It's me, ${character.name} — I'm really glad we're friends now. We're still getting to know each other, so… how's your day actually going?`;
        setMessages([{ role: "assistant", content: opener }]);
        speak(opener, character.gender);
      }
      return;
    }

    // Yara greets you by recalling who you are — generated fresh each visit, never saved to the log
    setGreetLoading(true);
    const m = mem.current;
    fetch("/api/greet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: getName(), profile: getProfile(), intake: m.intake, moods: m.checkins.map((c) => c.mood), feeling: feelingLine(), returning: prior.length > 0 }),
    })
      .then((r) => r.json())
      .then((d) => {
        const g = d.greeting || "Hey — I'm really glad you're here. How are you, truly?";
        setGreeting(g);
        speak(g, character.gender);
      })
      .catch(() => {
        const g = "Hey — I'm really glad you're here. How are you, truly?";
        setGreeting(g);
        speak(g, character.gender);
      })
      .finally(() => setGreetLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  useEffect(() => {
    saveTalk(character.id, messages);
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages, character.id]);

  async function send(textArg?: string) {
    const content = (textArg ?? input).trim();
    if (!content || thinking) return;
    const next: TalkMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setThinking(true);
    const started = Date.now();
    try {
      const res = await fetch("/api/talk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // give the model continuity with the greeting it just spoke (without saving it to the log)
          messages: greeting && character.guide ? [{ role: "assistant", content: greeting }, ...next] : next,
          // only Yara (your guide/healer) holds your intake; friends know you only through
          // what you share with them directly.
          context: character.guide
            ? { intake: mem.current.intake, moods: mem.current.checkins.map((c) => c.mood), profile: getProfile(), feeling: feelingLine() }
            : { intake: "", moods: [] },
          character: { name: character.name, persona: character.persona },
        }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? "I'm here.";
      if (data.crisis) setSupport(true);
      // a gentle "being-with-you" beat — Yara never answers like an instant machine
      const beat = Math.min(1700, Math.max(750, reply.length * 11));
      const elapsed = Date.now() - started;
      if (elapsed < beat) await new Promise((r) => setTimeout(r, beat - elapsed));
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (!muted) speak(reply, character.gender);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I'm right here with you." }]);
    } finally {
      setThinking(false);
    }
  }

  // when leaving Yara, distill what was shared into her living memory
  function handleClose() {
    if (character.guide) {
      const convo = messages.filter((m) => m.content);
      if (convo.length > 1) {
        fetch("/api/remember", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile: getProfile(), messages: convo }),
        })
          .then((r) => r.json())
          .then((d) => { if (d.profile) setProfile(d.profile); })
          .catch(() => {});
      }
    }
    onClose();
  }

  function listen() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported in this browser yet — you can type instead.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;   // show the words as you speak them
    rec.continuous = false;
    setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      setInput(txt);             // write what you said into the box — you can edit, then send
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  }

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.5, ease: EASE }}
      className="glass fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[78dvh] w-full max-w-lg flex-col rounded-t-[28px] border-t border-hair shadow-float"
    >
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-8 place-items-center rounded-full text-[13px] font-semibold text-white"
            style={{ background: character.color }}
          >
            {character.name[0]}
          </span>
          <span className="text-[15px] font-semibold tracking-tight">{character.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setMuted((m) => !m);
              if (!muted) stopSpeaking();
            }}
            className={`text-[12px] font-medium transition ${muted ? "text-ink/35" : "text-ink"}`}
          >
            {muted ? "Muted" : "Speaking"}
          </button>
          <button onClick={handleClose} className="text-[14px] text-ink/40 transition hover:text-ink">
            Leave
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-3">
        <div className="flex flex-col gap-2.5">
          {greeting && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}
              className="max-w-[88%] self-start rounded-3xl bg-mist px-4 py-2.5 text-[15px] leading-relaxed text-ink">
              {greeting}
            </motion.div>
          )}
          {greetLoading && !greeting && (
            <div className="self-start rounded-3xl bg-mist px-4 py-3.5"><Dots /></div>
          )}
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className={`max-w-[88%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed ${
                m.role === "user" ? "self-end bg-ink text-white" : "self-start bg-mist text-ink"
              }`}
            >
              {m.content}
            </motion.div>
          ))}
          {thinking && (
            <div className="self-start rounded-3xl bg-mist px-4 py-3.5">
              <Dots />
            </div>
          )}
          {support && onCrisis && (
            <button onClick={onCrisis} className="self-start rounded-2xl border border-accent/30 bg-accent/[0.05] px-4 py-2.5 text-left text-[13.5px] font-medium leading-relaxed text-ink/80 transition active:scale-[0.98]">
              You're not alone — there are people who can be right here with you 🤍 <span className="text-accent">Reach out →</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pb-6 pt-1">
        <div className="flex items-end gap-2">
          <button
            onClick={listen}
            aria-label="Speak"
            className={`grid size-10 shrink-0 place-items-center rounded-full border text-[14px] transition ${
              listening ? "border-ink bg-ink text-white" : "border-hair text-ink/55 hover:bg-mist"
            }`}
          >
            {listening ? "●" : "🎙"}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={`Talk to ${character.name}…`}
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-3xl border border-hair bg-white/70 px-4 py-2.5 text-[15px] text-ink outline-none transition focus:border-ink/40"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white transition active:scale-95 disabled:opacity-30"
          >
            ↑
          </button>
        </div>
      </div>
    </motion.div>
  );
}
