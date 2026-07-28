// Curated, clinically-grounded demo cases. Sources: project research.md §4
// (DSM-5-TR / ICD-11 differential logic). These power the demo today; the same
// shape is returned by /api/ddx so we can swap in the live PsiDDx model later.

export type Dx = {
  name: string;
  icd10?: string;
  confidence: number; // 0..1
  rationale: string;
  discriminator?: string; // the single feature separating it from the next dx
};

export type DDxResult = {
  caseId: string;
  presentation: string;
  reasoning: string[];
  differentials: Dx[];
  genericModel: { name: string; note: string };
  redFlags: string[];
  nextSteps: string[];
};

export type SampleCase = {
  id: string;
  title: string;
  chip: string;
  presentation: string;
  result: DDxResult;
};

export const CASES: SampleCase[] = [
  {
    id: "bipolar-vs-mdd",
    title: "The missed high",
    chip: "Bipolar II vs Depression",
    presentation:
      "28F, 3 weeks of low mood, anhedonia, hypersomnia and low energy. " +
      "On careful history: last year she had a ~5-day stretch of needing far less " +
      "sleep, racing thoughts, unusual spending and elevated energy that her family " +
      "clearly noticed. No current elevated mood. Family history of bipolar disorder.",
    result: {
      caseId: "bipolar-vs-mdd",
      presentation: "",
      reasoning: [
        "Current episode meets criteria for a major depressive episode.",
        "Screening for past (hypo)mania — a step generic models routinely skip.",
        "A prior ≥4-day period of decreased sleep need + elevated energy noticed by others = a hypomanic episode.",
        "Hypomania (not mania) + recurrent depression points to the bipolar II spectrum.",
        "This matters: antidepressant monotherapy can destabilize bipolar II.",
      ],
      differentials: [
        {
          name: "Bipolar II disorder",
          icd10: "F31.81",
          confidence: 0.86,
          rationale:
            "Documented prior hypomanic episode (≥4 days, change noticed by others) plus recurrent major depression. Family history supportive.",
          discriminator:
            "Past hypomania is present — the feature that separates bipolar II from unipolar depression.",
        },
        {
          name: "Major depressive disorder",
          icd10: "F33.1",
          confidence: 0.42,
          rationale:
            "Current presentation fits MDD, but the prior hypomanic episode reclassifies this as bipolar spectrum.",
        },
        {
          name: "Cyclothymic disorder",
          icd10: "F34.0",
          confidence: 0.18,
          rationale:
            "Consider if mood instability is chronic and sub-threshold for ≥2 years without a full depressive episode.",
        },
      ],
      genericModel: {
        name: "Major Depressive Disorder",
        note: "A generic model anchors on the current low mood and misses the prior hypomania — the exact error that delays bipolar diagnosis by an average of ~6 years.",
      },
      redFlags: [
        "Antidepressant monotherapy may trigger a switch or rapid cycling — flag before prescribing.",
      ],
      nextSteps: [
        "Administer the MDQ or HCL-32 to confirm hypomania history.",
        "Refer to psychiatry for mood-stabilizer-first management.",
      ],
    },
  },
  {
    id: "bpd-vs-bipolar",
    title: "Hours, not weeks",
    chip: "BPD vs Bipolar",
    presentation:
      "24F with chronic feelings of emptiness, intense fear of abandonment, and " +
      "mood shifts that last hours and are triggered by relationship conflict. " +
      "Recurrent self-harm and an unstable sense of self. No discrete multi-day mood episodes.",
    result: {
      caseId: "bpd-vs-bipolar",
      presentation: "",
      reasoning: [
        "Mood instability is present — but the time course is the key.",
        "Shifts last hours and are reactive to interpersonal triggers, not autonomous multi-day episodes.",
        "Chronic emptiness + abandonment fear + unstable identity are core borderline features.",
        "Bipolar episodes, by contrast, last days–weeks and are largely autonomous.",
      ],
      differentials: [
        {
          name: "Borderline personality disorder",
          icd10: "F60.3",
          confidence: 0.83,
          rationale:
            "Reactive, hours-long mood shifts, chronic emptiness, abandonment fear, identity disturbance and self-harm.",
          discriminator:
            "Mood shifts are interpersonally reactive and last hours — not autonomous, days-long episodes.",
        },
        {
          name: "Bipolar II disorder",
          icd10: "F31.81",
          confidence: 0.34,
          rationale:
            "Worth excluding, but the absence of discrete ≥4-day hypomanic episodes argues against it.",
        },
        {
          name: "Complex PTSD",
          icd10: "6B41",
          confidence: 0.21,
          rationale:
            "Consider if a trauma history with affect dysregulation and negative self-concept is present.",
        },
      ],
      genericModel: {
        name: "Bipolar Disorder",
        note: "Generic models frequently mislabel borderline mood reactivity as bipolar — ~40% of BPD patients are misdiagnosed with bipolar II.",
      },
      redFlags: ["Recurrent self-harm — assess current suicidal ideation (C-SSRS)."],
      nextSteps: [
        "Screen for trauma history to distinguish from complex PTSD.",
        "Consider DBT-oriented referral rather than mood stabilizers alone.",
      ],
    },
  },
  {
    id: "ptsd-vs-mdd",
    title: "Beneath the low mood",
    chip: "PTSD vs Depression",
    presentation:
      "31M veteran, 4 months of low mood, poor sleep and withdrawal. On screening: " +
      "intrusive nightmares and flashbacks of an IED blast, active avoidance of reminders, " +
      "hypervigilance and an exaggerated startle response.",
    result: {
      caseId: "ptsd-vs-mdd",
      presentation: "",
      reasoning: [
        "Depressive symptoms are real but may be secondary.",
        "There is an identifiable Criterion-A trauma.",
        "Intrusions (nightmares/flashbacks) + active avoidance + hyperarousal define PTSD.",
        "These three clusters are not part of major depression.",
      ],
      differentials: [
        {
          name: "Post-traumatic stress disorder",
          icd10: "F43.10",
          confidence: 0.82,
          rationale:
            "Criterion-A trauma with intrusion, avoidance and hyperarousal clusters for >1 month.",
          discriminator:
            "Trauma-linked intrusions + avoidance — absent in primary depression.",
        },
        {
          name: "Major depressive disorder",
          icd10: "F32.1",
          confidence: 0.45,
          rationale:
            "Commonly comorbid (~50%); treat alongside, but the trauma syndrome is primary here.",
        },
      ],
      genericModel: {
        name: "Major Depressive Disorder",
        note: "Without trauma screening, the intrusion/avoidance picture is missed and PTSD goes untreated.",
      },
      redFlags: ["Screen for suicidality; combat trauma elevates risk."],
      nextSteps: ["Administer PCL-5.", "Refer for trauma-focused therapy (CPT/PE)."],
    },
  },
  {
    id: "adhd-vs-bipolar",
    title: "Lifelong, not episodic",
    chip: "ADHD vs Bipolar",
    presentation:
      "Adult, 34M, reports lifelong inattention, restlessness and impulsivity present " +
      "since early childhood, pervasive across work and home. No discrete episodes of " +
      "elevated mood, decreased sleep need, or grandiosity.",
    result: {
      caseId: "adhd-vs-bipolar",
      presentation: "",
      reasoning: [
        "Impulsivity and distractibility overlap between ADHD and bipolar.",
        "The course is the discriminator: chronic and pervasive since childhood.",
        "No discrete mood episodes or reduced sleep need argues against bipolar.",
        "Symptoms predate age 12 and are continuous, not cyclical.",
      ],
      differentials: [
        {
          name: "Attention-deficit/hyperactivity disorder",
          icd10: "F90.0",
          confidence: 0.8,
          rationale:
            "Chronic, pervasive inattention/impulsivity present since childhood; no episodic mood elevation.",
          discriminator:
            "Symptoms are continuous since <age 12 — not episodic mood states.",
        },
        {
          name: "Bipolar disorder",
          icd10: "F31.9",
          confidence: 0.3,
          rationale:
            "Would require discrete (hypo)manic episodes with decreased sleep need — absent here.",
        },
      ],
      genericModel: {
        name: "Bipolar Disorder",
        note: "Impulsivity alone can be misread as mania; the lifelong, non-episodic course is the tell.",
      },
      redFlags: [],
      nextSteps: ["Administer ASRS v1.1.", "Confirm childhood onset via collateral history."],
    },
  },
];

export function findCase(id: string): SampleCase | undefined {
  return CASES.find((c) => c.id === id);
}
