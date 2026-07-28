"use client";

import { motion } from "framer-motion";

// Real, verified resources. Lead with the worldwide directories (always accurate), then a
// few of the most established lines. This screen is reachable any time from your journey.
const RESOURCES: { region: string; detail: string; href: string }[] = [
  { region: "Find a helpline in your country", detail: "findahelpline.com — free & confidential, worldwide", href: "https://findahelpline.com" },
  { region: "International directory", detail: "befrienders.org", href: "https://www.befrienders.org" },
  { region: "United States", detail: "988 Suicide & Crisis Lifeline — call or text 988", href: "tel:988" },
  { region: "UK & Ireland", detail: "Samaritans — call 116 123 (free)", href: "tel:116123" },
  { region: "Crisis Text Line", detail: "Text HOME to 741741 (US/Canada)", href: "sms:741741" },
  { region: "Pakistan", detail: "Umang — call 0311 7786264", href: "tel:03117786264" },
];

export function CrisisResources({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[80] flex flex-col bg-white"
    >
      <div className="flex items-center justify-between px-6 pb-3 pt-6">
        <div className="text-[15px] font-semibold tracking-tight">You're not alone</div>
        <button onClick={onClose} className="text-[15px] text-ink/45 transition hover:text-ink">Close</button>
      </div>

      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-6 pb-10">
        <div className="rounded-3xl bg-mist px-5 py-4 text-[14.5px] leading-relaxed text-ink/75">
          If you're in immediate danger or thinking about harming yourself, please contact your local <span className="font-semibold text-ink">emergency services</span> right now. What you're feeling is real, and you deserve someone right there with you.
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          {RESOURCES.map((r) => (
            <a
              key={r.region}
              href={r.href}
              target={r.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl border border-hair p-4 transition hover:bg-mist active:scale-[0.99]"
            >
              <div>
                <div className="text-[15px] font-semibold">{r.region}</div>
                <div className="mt-0.5 text-[13px] leading-snug text-ink/50">{r.detail}</div>
              </div>
              <span className="shrink-0 text-ink/30">→</span>
            </a>
          ))}
        </div>

        <p className="mt-6 text-center text-[13.5px] leading-relaxed text-ink/55">
          If you can, reach out to one person you trust and tell them how you're feeling — even just a text. You don't have to carry this by yourself.
        </p>
      </div>
    </motion.div>
  );
}
