import { WORKFLOW_STEPS, WorkflowStatus } from "@/lib/contract";

export function WorkflowStepper({ status }: { status: WorkflowStatus }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {WORKFLOW_STEPS.map((step, i) => {
        const state = i < status ? "done" : i === status ? "current" : "todo";
        return (
          <li
            key={step.label}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
              state === "current"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : state === "done"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-400"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                state === "current"
                  ? "bg-indigo-600 text-white"
                  : state === "done"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
