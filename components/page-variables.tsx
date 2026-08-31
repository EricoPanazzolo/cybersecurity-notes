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

interface PageCommandProps {
  /** Command template, with placeholders written as `{{name}}` — filled in from the page's `<PageVariables>`. */
  command: string;
  lang?: string;
}

export function PageCommand({ command, lang = "bash" }: PageCommandProps) {
  const { values } = usePageVariablesContext();
  const names = useMemo(
    () =>
      Array.from(new Set(Array.from(command.matchAll(VAR_PATTERN), (m) => m[1]))),
    [command],
  );

  const rendered = names.reduce(
    (acc, name) => acc.replaceAll(`{{${name}}}`, values[name] ?? `{{${name}}}`),
    command,
  );

  return <DynamicCodeBlock lang={lang} code={rendered} />;
}
