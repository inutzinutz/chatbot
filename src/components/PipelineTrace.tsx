"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PipelineTrace, PipelineStep, PipelineStepStatus } from "@/lib/inspector";
import {
  ChevronDown,
  ChevronRight,
  Zap,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Circle,
  Clock,
  Layers,
  Brain,
  Shield,
  BookOpen,
  Search,
  Package,
  FolderOpen,
  MessageSquare,
  Cpu,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  PipelineStepStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  matched: {
    label: "Matched",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  },
  skipped: {
    label: "No Match",
    color: "text-gray-400",
    bg: "bg-gray-50",
    border: "border-gray-200",
    icon: <XCircle className="h-4 w-4 text-gray-300" />,
  },
  checked: {
    label: "Pass-through",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <MinusCircle className="h-4 w-4 text-amber-400" />,
  },
  not_reached: {
    label: "Not Reached",
    color: "text-gray-300",
    bg: "bg-gray-50/50",
    border: "border-gray-100",
    icon: <Circle className="h-4 w-4 text-gray-200" />,
  },
};

/* ------------------------------------------------------------------ */
/*  Layer icons                                                        */
/* ------------------------------------------------------------------ */

function getLayerIcon(layer: number): React.ReactNode {
  const cls = "h-3.5 w-3.5";
  switch (layer) {
    case 0:
      return <Cpu className={cls} />;
    case 1:
    case 2:
    case 3:
      return <Shield className={cls} />;
    case 4:
      return <XCircle className={cls} />;
    case 5:
      return <Brain className={cls} />;
    case 6:
      return <MessageSquare className={cls} />;
    case 7:
      return <BookOpen className={cls} />;
    case 8:
      return <Search className={cls} />;
    case 9:
      return <Package className={cls} />;
    case 10:
    case 11:
      return <FolderOpen className={cls} />;
    case 12:
      return <ArrowRight className={cls} />;
    default:
      return <Layers className={cls} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Step detail row                                                    */
/* ------------------------------------------------------------------ */

function StepRow({ step, isLast, isFinal }: { step: PipelineStep; isLast: boolean; isFinal: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[step.status];
  const hasDetails = step.details && Object.keys(step.details).length > 0;

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && (
        <div
          className={cn(
            "absolute left-[19px] top-[32px] w-[2px] bottom-0",
            step.status === "not_reached" ? "bg-gray-100" : "bg-gray-200"
          )}
        />
      )}

      <div
        className={cn(
          "relative flex items-start gap-3 py-2 px-2 rounded-lg transition-colors cursor-pointer",
          isFinal && step.status === "matched" && "bg-green-50/60",
          hasDetails && "hover:bg-gray-50"
        )}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        {/* Status icon */}
        <div className="relative z-10 mt-0.5 shrink-0">
          {cfg.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                isFinal && step.status === "matched"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              L{step.layer}
            </span>
            <span
              className={cn(
                "text-xs font-semibold",
                step.status === "not_reached" ? "text-gray-300" : "text-gray-800"
              )}
            >
              {step.name}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                cfg.bg,
                cfg.border,
                cfg.color
              )}
            >
              {cfg.label}
            </span>
            {step.durationMs > 0 && (
              <span className="text-[10px] text-gray-400 font-mono ml-auto">
                {step.durationMs.toFixed(2)} ms
              </span>
            )}
            {hasDetails && (
              <span className="text-gray-300 ml-1">
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            )}
          </div>

          <p
            className={cn(
              "text-[11px] mt-0.5",
              step.status === "not_reached" ? "text-gray-300" : "text-gray-500"
            )}
          >
            {step.description}
          </p>

          {/* Expanded details */}
          {expanded && step.details && (
            <div className="mt-2 bg-white rounded-lg border border-gray-100 p-3 space-y-2 text-[11px]">
              {step.details.intent && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-24 shrink-0">Intent:</span>
                  <span className="text-gray-800 font-medium">
                    {step.details.intent}
                    {step.details.intentId && (
                      <span className="ml-1 text-gray-400">({step.details.intentId})</span>
                    )}
                  </span>
                </div>
              )}
              {step.details.score !== undefined && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-24 shrink-0">Score:</span>
                  <span className="font-mono text-indigo-600 font-bold">{step.details.score}</span>
                </div>
              )}
              {step.details.matchedTriggers && step.details.matchedTriggers.length > 0 && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-24 shrink-0">Triggers:</span>
                  <div className="flex flex-wrap gap-1">
                    {step.details.matchedTriggers.map((t, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {step.details.allScores && step.details.allScores.length > 0 && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-24 shrink-0">Top Intents:</span>
                  <div className="space-y-0.5">
                    {step.details.allScores.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="h-1.5 rounded-full bg-indigo-400"
                          style={{
                            width: `${Math.min(100, (s.score / (step.details!.allScores![0]?.score || 1)) * 60)}px`,
                          }}
                        />
                        <span className="text-gray-700">{s.intent}</span>
                        <span className="font-mono text-gray-400">{s.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {step.details.matchedScript && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-24 shrink-0">Script:</span>
                  <span className="text-gray-800">{step.details.matchedScript}</span>
                </div>
              )}
              {step.details.matchedDoc && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-24 shrink-0">Document:</span>
                  <span className="text-gray-800">{step.details.matchedDoc}</span>
                </div>
              )}
              {step.details.matchedFaqTopic && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-24 shrink-0">FAQ Topic:</span>
                  <span className="text-gray-800">{step.details.matchedFaqTopic}</span>
                </div>
              )}
              {step.details.matchedProducts && step.details.matchedProducts.length > 0 && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-24 shrink-0">Products:</span>
                  <div className="space-y-0.5">
                    {step.details.matchedProducts.map((p, i) => (
                      <span key={i} className="block text-gray-800">{p}</span>
                    ))}
                    {step.details.productsCount && step.details.productsCount > 3 && (
                      <span className="text-gray-400">
                        +{step.details.productsCount - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              {step.details.matchedCategory && (
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-500 w-24 shrink-0">Category:</span>
                  <span className="text-gray-800">{step.details.matchedCategory}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mode badge                                                         */
/* ------------------------------------------------------------------ */

function ModeBadge({ mode }: { mode: PipelineTrace["mode"] }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    pipeline: {
      label: "Pipeline",
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
    pipeline_then_claude: {
      label: "Pipeline → Claude",
      color: "text-violet-700",
      bg: "bg-violet-50 border-violet-200",
    },
    pipeline_then_openai: {
      label: "Pipeline → OpenAI",
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
    },
    claude_fallback: {
      label: "Claude → Fallback",
      color: "text-fuchsia-700",
      bg: "bg-fuchsia-50 border-fuchsia-200",
    },
    openai_fallback: {
      label: "OpenAI → Fallback",
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
    },
    claude_stream: {
      label: "Claude Stream",
      color: "text-violet-700",
      bg: "bg-violet-50 border-violet-200",
    },
    openai_stream: {
      label: "OpenAI Stream",
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
    },
    fallback: {
      label: "Smart Fallback",
      color: "text-indigo-700",
      bg: "bg-indigo-50 border-indigo-200",
    },
  };
  const c = config[mode] || config.fallback;

  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", c.bg, c.color)}>
      {c.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main PipelineTracePanel                                            */
/* ------------------------------------------------------------------ */

export default function PipelineTracePanel({ trace }: { trace: PipelineTrace }) {
  const [collapsed, setCollapsed] = useState(true);

  const matchedStep = trace.steps.find(
    (s) => s.layer === trace.finalLayer && s.status === "matched"
  );
  const stepsChecked = trace.steps.filter(
    (s) => s.status !== "not_reached"
  ).length;

  return (
    <div className="mt-1.5">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-all",
          "hover:bg-indigo-50 text-gray-500 hover:text-indigo-600",
          !collapsed && "bg-indigo-50/60 text-indigo-600"
        )}
      >
        <Zap className="h-3 w-3" />
        <span>Pipeline</span>
        <span className="text-gray-300 mx-0.5">|</span>
        <ModeBadge mode={trace.mode} />
        <span className="text-gray-300 mx-0.5">|</span>
        <span className="font-mono text-[10px] text-gray-400">
          {trace.totalDurationMs.toFixed(1)} ms
        </span>
        {trace.finalLayerName && (
          <>
            <span className="text-gray-300 mx-0.5">|</span>
            <span className="text-green-600 font-semibold text-[10px]">
              → {trace.finalLayerName}
            </span>
          </>
        )}
        <span className="ml-1 text-gray-300">
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </span>
      </button>

      {/* Expanded panel */}
      {!collapsed && (
        <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header summary */}
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">
                    AI Processing Pipeline
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {stepsChecked} layers checked &middot; resolved at Layer {trace.finalLayer}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock className="h-3 w-3" />
                  {trace.totalDurationMs.toFixed(2)} ms total
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline steps */}
          <div className="px-3 py-2">
            {trace.steps.map((step, i) => (
              <StepRow
                key={step.layer}
                step={step}
                isLast={i === trace.steps.length - 1}
                isFinal={step.layer === trace.finalLayer}
              />
            ))}
          </div>

          {/* Footer: final resolution */}
          <div className="px-4 py-3 bg-green-50/60 border-t border-green-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs font-semibold text-green-700">
                Resolved at Layer {trace.finalLayer}: {trace.finalLayerName}
              </span>
              {trace.finalIntent && (
                <span className="text-[10px] text-green-600 font-mono bg-green-100 px-1.5 py-0.5 rounded">
                  intent={trace.finalIntent}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
