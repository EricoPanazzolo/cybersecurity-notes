"use client";

import { useId, useMemo, useState } from "react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { sanitizeForFilename } from "@/lib/sanitize-filename";

const VAR_PATTERN = /\{\{(\w+)\}\}/g;

interface DerivedVarConfig {
  /** Name of the source var this one tracks until manually edited. */
  from: string;
  /** Template for the derived default; `{value}` is replaced by the source var's current value. */
  template: string;
}

interface CommandInputProps {
  /** Command template, with placeholders written as `{{name}}`. */
  command: string;
  /** Default value shown for each `{{name}}` placeholder before the user edits it. */
  vars: Record<string, string>;
  /**
   * Vars whose default tracks another var's live value (e.g. an output
   * filename derived from a domain) until the reader edits that field
   * directly, at which point it stops auto-updating.
   */
  derivedVars?: Record<string, DerivedVarConfig>;
  lang?: string;
}

export function CommandInput({
  command,
  vars,
  derivedVars,
  lang = "bash",
}: CommandInputProps) {
  const id = useId();
  const names = useMemo(
    () => Array.from(new Set(Array.from(command.matchAll(VAR_PATTERN), (m) => m[1]))),
    [command],
  );
  const [values, setValues] = useState<Record<string, string>>(vars);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const derived = useMemo(() => derivedVars ?? {}, [derivedVars]);

  const effectiveValues = useMemo(() => {
    const next = { ...values };
    for (const [name, config] of Object.entries(derived)) {
      if (!touched[name]) {
        next[name] = config.template.replace(
          "{value}",
          sanitizeForFilename(values[config.from] ?? ""),
        );
      }
    }
    return next;
  }, [values, touched, derived]);

  const rendered = names.reduce(
    (acc, name) => acc.replaceAll(`{{${name}}}`, effectiveValues[name] ?? ""),
    command,
  );

  return (
    <div className="my-4 not-prose">
      <div className="flex flex-wrap items-center gap-3 rounded-t-lg border border-b-0 border-fd-border bg-fd-secondary/50 px-3 py-2">
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
              value={effectiveValues[name] ?? ""}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [name]: e.target.value }));
                if (derived[name]) {
                  setTouched((prev) => ({ ...prev, [name]: true }));
                }
              }}
              placeholder={vars[name]}
              spellCheck={false}
              autoComplete="off"
              className="w-44 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm text-fd-foreground outline-none focus:ring-2 focus:ring-fd-ring"
            />
          </label>
        ))}
      </div>
      <DynamicCodeBlock
        lang={lang}
        code={rendered}
        codeblock={{ className: "mt-0 rounded-t-none" }}
      />
    </div>
  );
}
