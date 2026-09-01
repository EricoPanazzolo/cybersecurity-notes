"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { sanitizeForFilename } from "@/lib/sanitize-filename";

// `useLayoutEffect` commits before paint, avoiding a flash of raw
// {{placeholder}} text in <PageCommand> while defaults are seeded; falls
// back to `useEffect` during SSR so React doesn't warn about the mismatch.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface PageVariablesContextValue {
  values: Record<string, string>;
  setValue: (name: string, value: string) => void;
  reset: (defaults: Record<string, string>) => void;
}

const PageVariablesContext = createContext<PageVariablesContextValue | null>(
  null,
);

export function PageVariablesProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({});

  const value = useMemo<PageVariablesContextValue>(
    () => ({
      values,
      setValue: (name, val) =>
        setValues((prev) => ({ ...prev, [name]: val })),
      reset: (defaults) => setValues(defaults),
    }),
    [values],
  );

  return (
    <PageVariablesContext.Provider value={value}>
      {children}
    </PageVariablesContext.Provider>
  );
}

function usePageVariablesContext() {
  const ctx = useContext(PageVariablesContext);
  if (!ctx) {
    throw new Error(
      "<PageVariables> and <PageCommand> must be used on a docs page",
    );
  }
  return ctx;
}

interface PageVariablesProps {
  /** Default value for each `{{name}}` placeholder used by `<PageCommand>` blocks below. */
  vars: Record<string, string>;
}

export function PageVariables({ vars }: PageVariablesProps) {
  const { values, setValue, reset } = usePageVariablesContext();
  const id = useId();
  const names = Object.keys(vars);

  // Seed the shared defaults once, so every <PageCommand> below renders
  // filled-in on first paint instead of showing raw {{name}} placeholders.
  useIsomorphicLayoutEffect(() => {
    reset(vars);
  }, []);

  return (
    <div className="not-prose sticky top-(--fd-header-height) z-10 my-4 flex flex-wrap items-center gap-3 rounded-lg border border-fd-border bg-fd-background/95 px-3 py-2 shadow-sm backdrop-blur">
      <span className="text-xs font-medium tracking-wide text-fd-muted-foreground uppercase">
        Page variables
      </span>
      {names.map((name) => (
        <label
          key={name}
          htmlFor={`${id}-${name}`}
          className="flex items-center gap-2 text-sm text-fd-muted-foreground"
        >
          <span className="font-medium text-fd-foreground">{name}</span>
          <input
            id={`${id}-${name}`}
            type="text"
            value={values[name] ?? vars[name]}
            onChange={(e) => setValue(name, e.target.value)}
            placeholder={vars[name]}
            spellCheck={false}
            autoComplete="off"
            className="w-44 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm text-fd-foreground outline-none focus:ring-2 focus:ring-fd-ring"
          />
        </label>
      ))}
      <button
        type="button"
        onClick={() => reset(vars)}
        className="ml-auto rounded-md border border-fd-border px-2 py-1 text-xs font-medium text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-accent-foreground"
      >
        Reset
      </button>
    </div>
  );
}

const VAR_PATTERN = /\{\{(\w+)\}\}/g;

interface DerivedVarConfig {
  /** Name of the source var (typically one shared via `<PageVariables>`) this one tracks until manually edited. */
  from: string;
  /** Template for the derived default; `{value}` is replaced by the source var's current value. */
  template: string;
  /**
   * Also publish the computed value to the shared page context under this
   * same name, so a later `<PageCommand>` on the page can reference it via
   * `{{name}}` (e.g. a filename produced by one step and consumed by the
   * next in a multi-step playbook).
   */
  shared?: boolean;
}

interface PageCommandProps {
  /** Command template, with placeholders written as `{{name}}` — filled in from the page's `<PageVariables>`. */
  command: string;
  lang?: string;
  /**
   * Vars local to this block whose default tracks a shared page variable
   * (e.g. an output filename derived from the page's `domain`) until edited
   * directly here, at which point it stops auto-updating.
   */
  derivedVars?: Record<string, DerivedVarConfig>;
  /** Plain vars local to this block only, with their own fixed default (not shared, not derived). */
  localVars?: Record<string, string>;
}

export function PageCommand({
  command,
  lang = "bash",
  derivedVars,
  localVars,
}: PageCommandProps) {
  const { values: pageValues, setValue } = usePageVariablesContext();
  const id = useId();
  const [localValues, setLocalValues] = useState<Record<string, string>>(
    () => localVars ?? {},
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const derived = useMemo(() => derivedVars ?? {}, [derivedVars]);
  const plain = localVars ?? {};
  const names = useMemo(
    () =>
      Array.from(new Set(Array.from(command.matchAll(VAR_PATTERN), (m) => m[1]))),
    [command],
  );

  const effectiveValues = useMemo(() => {
    const next: Record<string, string> = { ...pageValues, ...localValues };
    for (const [name, config] of Object.entries(derived)) {
      if (!touched[name]) {
        const source = sanitizeForFilename(next[config.from] ?? "");
        next[name] = config.template.replace("{value}", source);
      }
    }
    return next;
  }, [pageValues, localValues, touched, derived]);

  // Publish `shared` derived values to the page context so a later
  // <PageCommand> can reference the same {{name}} (e.g. this step's output
  // filename feeding the next step's input).
  useEffect(() => {
    for (const [name, config] of Object.entries(derived)) {
      if (config.shared && !touched[name]) {
        const computed = effectiveValues[name];
        if (computed !== undefined && pageValues[name] !== computed) {
          setValue(name, computed);
        }
      }
    }
  }, [derived, effectiveValues, touched, pageValues, setValue]);

  const rendered = names.reduce(
    (acc, name) => acc.replaceAll(`{{${name}}}`, effectiveValues[name] ?? `{{${name}}}`),
    command,
  );

  const localFieldNames = Array.from(
    new Set([...Object.keys(derived), ...Object.keys(plain)]),
  );

  return (
    <div className="not-prose">
      {localFieldNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-t-lg border border-b-0 border-fd-border bg-fd-secondary/50 px-3 py-2">
          {localFieldNames.map((name) => (
            <label
              key={name}
              htmlFor={`${id}-${name}`}
              className="flex items-center gap-2 text-sm text-fd-muted-foreground"
            >
              <span className="font-medium text-fd-foreground">{name}</span>
              <input
                id={`${id}-${name}`}
                type="text"
                value={effectiveValues[name] ?? ""}
                onChange={(e) => {
                  setLocalValues((prev) => ({ ...prev, [name]: e.target.value }));
                  if (derived[name]) {
                    setTouched((prev) => ({ ...prev, [name]: true }));
                  }
                }}
                placeholder={plain[name]}
                spellCheck={false}
                autoComplete="off"
                className="w-56 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm text-fd-foreground outline-none focus:ring-2 focus:ring-fd-ring"
              />
            </label>
          ))}
        </div>
      )}
      <DynamicCodeBlock
        lang={lang}
        code={rendered}
        codeblock={
          localFieldNames.length > 0
            ? { className: "mt-0 rounded-t-none" }
            : undefined
        }
      />
    </div>
  );
}
