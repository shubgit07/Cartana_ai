import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Clock3,
  Cpu,
  FileText,
  Github,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Play,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import ManagerDashboard from "./components/ManagerDashboard";

const DEMO_URL = "https://youtu.be/UhGXqdEFmm4";
const HERO_VIDEO_SRC = "/assets/whisk.mp4";

const problemCards = [
  {
    icon: FileText,
    title: "Notes Go Nowhere",
    description: "Action items stay buried in meeting notes and Slack threads.",
  },
  {
    icon: Users,
    title: "Ownership Gaps",
    description: "Tasks fall through when no one is explicitly assigned.",
  },
  {
    icon: Clock3,
    title: "Manual Overhead",
    description: "Managers spend time re-explaining instead of shipping.",
  },
];

const workflowSteps = [
  {
    title: "Capture Input",
    description: "Submit a voice recording or typed note from your meeting.",
    icon: "dual",
  },
  {
    title: "AI Extraction",
    description: "The async pipeline transcribes, parses, and extracts structured tasks.",
    icon: Cpu,
  },
  {
    title: "Review Gate",
    description: "Low-confidence tasks are flagged for human review before entering the board.",
    icon: ShieldCheck,
  },
  {
    title: "Execute & Collaborate",
    description: "Tasks land in the Kanban. Team communicates via real-time chat.",
    icon: LayoutDashboard,
  },
];

const stackGroups = [
  {
    label: "Backend",
    items: ["FastAPI", "SQLAlchemy", "Celery", "Redis", "PostgreSQL"],
  },
  {
    label: "Frontend",
    items: ["React", "Vite", "Tailwind CSS"],
  },
  {
    label: "AI",
    items: ["OpenAI LLM (function calling)", "Whisper (transcription)"],
  },
  {
    label: "Realtime",
    items: ["WebSockets"],
  },
  {
    label: "DevOps",
    items: ["Docker Compose"],
  },
];

function useInView(threshold = 0.2, rootMargin = "0px 0px -10% 0px") {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, isVisible];
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-slate-300/90 bg-white/85 px-4 py-1 text-xs font-semibold tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </span>
  );
}

function CTAs({ dark = false, className = "", large = false }) {
  const secondary = dark
    ? "border border-white/50 text-white hover:bg-white/10"
    : "border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-white";
  const sizeClasses = large ? "px-8 py-4" : "px-5 py-3";

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href={DEMO_URL}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-2 rounded-xl bg-[#2563EB] text-sm font-semibold text-white transition hover:bg-[#3B82F6] ${sizeClasses}`}
      >
        <Play size={15} className="fill-current" />
        Watch Demo
      </a>
      <a
        href="https://github.com/shubgit07/Cartana_ai"
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-2 rounded-xl text-sm font-semibold transition ${secondary} ${sizeClasses}`}
      >
        <Github size={16} />
        View on GitHub
      </a>
    </div>
  );
}

function RevealSection({ id, className = "", children }) {
  const [sectionRef, isVisible] = useInView(0.16);
  return (
    <section
      id={id}
      ref={sectionRef}
      className={`reveal-section ${isVisible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

function HeroMockup() {
  const [mockupRef, isVisible] = useInView(0.2);
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVisible) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
      return;
    }

    video.pause();
  }, [isVisible]);

  return (
    <div
      id="hero-mockup"
      ref={mockupRef}
      className={`reveal-item mt-50 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      }`}
      style={{ "--delay": "280ms" }}
    >
      <div className="hero-showcase-shell">
        <video
          ref={videoRef}
          src={HERO_VIDEO_SRC}
          muted
          loop
          playsInline
          preload="metadata"
          className={`hero-video-card w-full rounded-[24px] object-cover transition-all duration-1000 ease-out ${
            isVisible ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-xl scale-[1.03]"
          }`}
        />
        <div className="hero-showcase-vignette" aria-hidden="true" />
      </div>
    </div>
  );
}

function WorkflowSection() {
  const [timelineRef, timelineVisible] = useInView(0.3);

  return (
    <RevealSection id="workflow" className="mx-auto max-w-6xl px-4 py-24 md:px-8">
      <div className="reveal-item" style={{ "--delay": "0ms" }}>
        <Pill>Workflow</Pill>
      </div>
      <h2
        className="reveal-item mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl"
        style={{ "--delay": "90ms" }}
      >
        From conversation to execution
        <br />
        in four steps.
      </h2>

      <div ref={timelineRef} className="relative mt-14">
        <div className="absolute left-4 top-2 h-[calc(100%-16px)] w-px bg-slate-200 md:hidden" />
        <div
          className="absolute left-4 top-2 w-px bg-[#2563EB] transition-all duration-[800ms] ease-out md:hidden"
          style={{ height: timelineVisible ? "calc(100% - 16px)" : "0px" }}
        />

        <div className="absolute left-2 right-2 top-5 hidden h-px bg-slate-200 md:block" />
        <div
          className="absolute left-2 top-5 hidden h-px bg-[#2563EB] transition-all duration-[800ms] ease-out md:block"
          style={{ width: timelineVisible ? "calc(100% - 16px)" : "0px" }}
        />

        <div className="grid gap-6 md:grid-cols-4 md:gap-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className={`relative rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)] transition-all duration-500 ${
                  timelineVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                }`}
                style={{ transitionDelay: timelineVisible ? `${360 + index * 120}ms` : "0ms" }}
              >
                <span className="absolute -left-[21px] top-6 hidden h-4 w-4 rounded-full border-2 border-[#2563EB] bg-white md:block" />
                <span className="absolute left-[-6px] top-6 h-3 w-3 rounded-full border-2 border-[#2563EB] bg-white md:hidden" />

                <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-[#2563EB]">
                  {Icon === "dual" ? (
                    <>
                      <Mic size={16} />
                      <FileText size={16} />
                    </>
                  ) : (
                    <Icon size={17} />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}

export default function App() {
  const [showManagerDashboard, setShowManagerDashboard] = useState(false);

  if (showManagerDashboard) {
    return <ManagerDashboard onBackToLanding={() => setShowManagerDashboard(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900">
      <div className="page-atmosphere pointer-events-none fixed inset-0 -z-10" />

      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <a href="#top" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            <Sparkles size={16} className="text-[#2563EB]" />
            Cartana
          </a>
          <nav className="hidden items-center gap-7 text-sm text-slate-500 md:flex">
            <a href="#problem" className="transition hover:text-slate-800">
              Problem
            </a>
            <a href="#workflow" className="transition hover:text-slate-800">
              Workflow
            </a>
            <a href="#features" className="transition hover:text-slate-800">
              Features
            </a>
            <a href="#architecture" className="transition hover:text-slate-800">
              Architecture
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3B82F6]"
            >
              Watch Demo
            </a>
            <a
              href="https://github.com/shubgit07"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <main id="top" className="overflow-x-hidden">
        <section className="hero-dot-grid relative mx-auto mt-4 max-w-6xl overflow-hidden rounded-[36px] px-4 pb-16 pt-16 md:px-8 md:pt-20">
          <div className="float-card float-delay-0 absolute left-4 top-8 hidden w-[240px] -rotate-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:block">
            <p className="text-sm font-semibold text-slate-900">🎙️ Voice Note - 2 min ago</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Priya should finalize the API docs before Thursday&apos;s sprint review
            </p>
            <span className="mt-3 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
              ● Processing...
            </span>
          </div>

          <div className="float-card float-delay-1 absolute right-4 top-10 hidden w-[280px] rotate-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:block">
            <p className="text-sm font-semibold text-slate-900">✅ 3 Tasks Extracted</p>
            <div className="mt-3 space-y-2">
              <span className="block rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">API Docs - Priya - Thu</span>
              <span className="block rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">Design Review - Rahul - Fri</span>
              <span className="block rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">Client Demo - Sarah - Mon</span>
            </div>
          </div>

          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
            <Pill>Cartana AI</Pill>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0 }}
              className="mt-8 text-[48px] font-black leading-[0.95] tracking-[-0.03em] text-[#0F172A] md:text-[72px]"
            >
              Speak once.
              <span className="mt-2 block text-[#2563EB]">Ship everything.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 max-w-3xl text-[18px] leading-relaxed text-slate-500"
            >
              Cartana listens to your team meetings, extracts action items, assigns ownership, and
              pushes everything to your Kanban board - without anyone typing a single task.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8"
            >
              <CTAs className="justify-center" large />
            </motion.div>

            <HeroMockup />

            <div className="float-card float-delay-2 mt-5 hidden self-end rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl lg:block">
              <p className="text-sm font-semibold text-slate-900">INGESTION ✓ → EXTRACTION ✓ → REVIEW ⚠</p>
              <p className="mt-2 text-xs text-slate-500">1 task flagged for review</p>
            </div>
          </div>
        </section>

        <RevealSection id="problem" className="mx-auto max-w-6xl px-4 py-24 md:px-8">
          <div className="reveal-item" style={{ "--delay": "0ms" }}>
            <Pill>The Problem</Pill>
          </div>
          <h2
            className="reveal-item mt-4 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl"
            style={{ "--delay": "90ms" }}
          >
            Meetings generate intent.
            <br />
            Not execution.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {problemCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="reveal-item rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_35px_-30px_rgba(15,23,42,0.5)]"
                  style={{ "--delay": `${160 + index * 90}ms` }}
                >
                  <div className="inline-flex rounded-xl bg-blue-50 p-2.5 text-[#2563EB]">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
                </article>
              );
            })}
          </div>
        </RevealSection>

        <WorkflowSection />

        <RevealSection id="features" className="mx-auto max-w-6xl px-4 py-24 md:px-8">
          <div className="reveal-item" style={{ "--delay": "0ms" }}>
            <Pill>Features</Pill>
          </div>
          <h2
            className="reveal-item mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl"
            style={{ "--delay": "90ms" }}
          >
            Everything your team needs
            <br />
            to go from discussion to delivery.
          </h2>

          <div className="mt-12 grid auto-rows-[minmax(190px,_auto)] grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <article
              className="bento-card reveal-item rounded-3xl border border-slate-200 bg-white p-6 xl:col-span-2"
              style={{ "--delay": "160ms" }}
            >
              <div className="inline-flex rounded-xl bg-blue-50 p-2.5 text-[#2563EB]">
                <Mic size={18} />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">Voice-to-Task Conversion</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Upload or record audio. Whisper transcribes it. The LLM extracts tasks. You get a
                structured board - without typing a single task manually.
              </p>
              <div className="mt-5 flex h-12 items-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    className="wave-bar"
                    style={{
                      animationDelay: `${i * 70}ms`,
                      height: `${18 + ((i * 7) % 22)}px`,
                    }}
                  />
                ))}
              </div>
            </article>

            <article className="bento-card reveal-item rounded-3xl border border-slate-200 bg-white p-6" style={{ "--delay": "230ms" }}>
              <div className="inline-flex rounded-xl bg-amber-50 p-2.5 text-amber-600">
                <ShieldAlert size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Confidence-Aware Review Gate</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Uncertain extractions are never blindly pushed. They are routed to NEEDS_REVIEW,
                keeping you in control of automation.
              </p>
              <span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                ⚠ Confidence: 67%
              </span>
            </article>

            <article className="bento-card reveal-item rounded-3xl border border-slate-200 bg-white p-6" style={{ "--delay": "300ms" }}>
              <div className="inline-flex rounded-xl bg-blue-50 p-2.5 text-[#2563EB]">
                <Layers size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Typed Schema Extraction</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                LLM output is validated against strict types - no freeform blobs. Every task has a
                title, assignee, priority, and deadline.
              </p>
            </article>

            <article className="bento-card reveal-item rounded-3xl border border-slate-200 bg-white p-6 xl:row-span-2" style={{ "--delay": "370ms" }}>
              <div className="inline-flex rounded-xl bg-blue-50 p-2.5 text-[#2563EB]">
                <Activity size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Pipeline Trace Visibility</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Each note stores per-stage trace data. See exactly where extraction succeeded, where
                confidence dropped, and why.
              </p>

              <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {[
                  ["INGESTION", "ok"],
                  ["EXTRACTION", "ok"],
                  ["VALIDATION", "ok"],
                  ["REVIEW", "warn"],
                ].map(([label, state]) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{label}</span>
                    <span className="inline-flex items-center gap-2 text-slate-500">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          state === "warn" ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                      {state === "warn" ? "Attention" : "Passed"}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="bento-card reveal-item rounded-3xl border border-slate-200 bg-white p-6" style={{ "--delay": "440ms" }}>
              <div className="inline-flex rounded-xl bg-blue-50 p-2.5 text-[#2563EB]">
                <Zap size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Async Processing with Retries</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Celery + Redis queue ensures tasks are processed reliably. Transient failures retry
                with exponential backoff.
              </p>
            </article>

            <article className="bento-card reveal-item rounded-3xl border border-slate-200 bg-white p-6" style={{ "--delay": "510ms" }}>
              <div className="inline-flex rounded-xl bg-blue-50 p-2.5 text-[#2563EB]">
                <MessageSquare size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Real-Time Team Chat</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Manager-member channels tied to workspaces. Task context stays in the same place as
                execution - via WebSockets.
              </p>
            </article>
          </div>
        </RevealSection>

        <RevealSection id="architecture" className="mx-auto max-w-6xl px-4 py-24 md:px-8">
          <div className="reveal-item" style={{ "--delay": "0ms" }}>
            <Pill>Built With</Pill>
          </div>
          <h2
            className="reveal-item mt-4 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl"
            style={{ "--delay": "90ms" }}
          >
            A production-grade architecture
            <br />
            under the hood.
          </h2>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="reveal-item rounded-3xl border border-slate-200 bg-white p-6" style={{ "--delay": "180ms" }}>
              <h3 className="text-lg font-semibold text-slate-900">Stack Composition</h3>
              <div className="mt-5 space-y-4">
                {stackGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-sm font-semibold text-slate-500">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <article className="reveal-item rounded-2xl border border-slate-200 bg-white p-5" style={{ "--delay": "250ms" }}>
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-[#2563EB]">
                  <RefreshCw size={15} />
                  Async by Design
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Celery workers decouple AI processing from the request cycle, enabling
                  non-blocking task extraction at scale.
                </p>
              </article>

              <article className="reveal-item rounded-2xl border border-slate-200 bg-white p-5" style={{ "--delay": "330ms" }}>
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-[#2563EB]">
                  <BrainCircuit size={15} />
                  LLM with Guardrails
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Function-calling extraction enforces a typed output schema. Ambiguous results are
                  flagged, not guessed.
                </p>
              </article>

              <article className="reveal-item rounded-2xl border border-slate-200 bg-white p-5" style={{ "--delay": "410ms" }}>
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-[#2563EB]">
                  <Radio size={15} />
                  Real-Time Updates
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  WebSocket channels push task state changes instantly to connected clients without
                  polling.
                </p>
              </article>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="footer-cta" className="mt-20 bg-[#0F172A] px-4 py-20 md:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="reveal-item text-4xl font-extrabold tracking-tight text-white md:text-5xl" style={{ "--delay": "0ms" }}>
              See Cartana in action.
            </h2>
            <p className="reveal-item mt-4 max-w-3xl text-lg leading-relaxed text-slate-300" style={{ "--delay": "90ms" }}>
              Built as a full-stack AI project - explore the code or watch the walkthrough.
            </p>
            <div className="reveal-item mt-8" style={{ "--delay": "170ms" }}>
              <CTAs dark />
            </div>
            <p className="reveal-item mt-8 text-sm text-slate-400" style={{ "--delay": "240ms" }}>
              ⚡ Built with FastAPI · React · Celery · LLM APIs - Placement Project by Shubh, 2025
            </p>
          </div>
        </RevealSection>
      </main>
    </div>
  );
}
