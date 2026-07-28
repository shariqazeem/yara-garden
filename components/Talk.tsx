"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getMemory, getTalk, saveTalk, type TalkMsg } from "@/lib/memory";
import { speak, stopSpeaking } from "@/lib/voice";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Talk({ onClose }: { onClose: () => void }) {
  const mem = useRef(getMemory());
  const [messages, setMessages] = useState<TalkMsg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prior = getTalk("sol");
    if (prior.length) {
      setMessages(prior);
      return;
    }
    const intake = mem.current.intake?.trim();
    const opener = intake
      ? `Hey — I'm really glad you came back. When we first talked, you said: “${intake.slice(0, 140)}${
          intake.length > 140 ? "…" : ""
        }” How are you feeling right now?`
      : "Hey. I'm really glad you're here. What's on your mind?";
    setMessages([{ role: "assistant", content: opener }]);
  }, []);

  useEffect(() => {
    saveTalk("sol", messages);
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages]);

  async function send(textArg?: string) {
    const content = (textArg ?? input).trim();
    if (!content || thinking) return;
    const next: TalkMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/talk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next,
          context: { intake: mem.current.intake, moods: mem.current.checkins.map((c) => c.mood) },
        }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? "I'm here. Tell me a little more?";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (voiceOut) speak(reply, "female");
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I'm right here with you. Tell me a bit more?" }]);
    } finally {
      setThinking(false);
    }
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
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      setListening(false);
      send(e.results?.[0]?.[0]?.transcript ?? "");
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-white"
    >
      <div className="flex items-center justify-between px-6 pb-3 pt-6">
        <button onClick={onClose} className="text-[15px] text-ink/40 transition hover:text-ink">
          Close
        </button>
        <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
          <span className="size-2 rounded-full bg-ink" /> Sol
        </div>
        <button
          onClick={() => {
            setVoiceOut((v) => !v);
            if (voiceOut) stopSpeaking();
          }}
          className={`text-[13px] font-medium transition ${voiceOut ? "text-ink" : "text-ink/40"}`}
        >
          {voiceOut ? "Voice on" : "Voice off"}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${
                m.role === "user" ? "self-end bg-ink text-white" : "self-start bg-mist text-ink"
              }`}
            >
              {m.content}
            </motion.div>
          ))}
          {thinking && (
            <div className="self-start rounded-3xl bg-mist px-4 py-4">
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
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-7 pt-2">
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <button
            onClick={listen}
            aria-label="Speak"
            className={`grid size-11 shrink-0 place-items-center rounded-full border text-[15px] transition ${
              listening ? "border-ink bg-ink text-white" : "border-hair text-ink/60 hover:bg-mist"
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
            placeholder={listening ? "Listening…" : "Say it your way…"}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-3xl border border-hair bg-white px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition focus:border-ink/40"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-[16px] text-white transition active:scale-95 disabled:opacity-30"
          >
            ↑
          </button>
        </div>
        <p className="mx-auto mt-3 max-w-lg text-center text-[11px] leading-relaxed text-ink/25">
          Sol offers support, not a diagnosis. In crisis, contact local emergency services.
        </p>
      </div>
    </motion.div>
  );
}
