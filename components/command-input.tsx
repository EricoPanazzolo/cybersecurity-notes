"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { sanitizeForFilename } from "@/lib/sanitize-filename";
import { orderFields } from "@/lib/field-order";
import { Tooltip } from "./tooltip";

const VAR_PATTERN = /\{\{(\w+)\}\}/g;

interface CommandChannelContextValue {
  values: Record<string, string>;
  publish: (channel: string, value: string) => void;
}

const CommandChannelContext = createContext<CommandChannelContextValue | null>(
  null,
);

/**
 * Opt-in cross-block link for the rare case where one command's `output`
 * must live-update a *different* command block's `input` (e.g. the reader
 * typed a custom filename into the first block and the second block's
 * default needs to follow it), instead of the normal per-block-independent
 * behavior. Wraps a page's MDX body once; blocks only participate when they
 * pass `publishChannel` (producer) or a `{ channel }` derivedVar (consumer).
 */
export function CommandChannelProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const publish = useCallback((channel: string, value: string) => {
    setValues((prev) => (prev[channel] === value ? prev : { ...prev, [channel]: value }));
  }, []);
  const ctx = useMemo(() => ({ values, publish }), [values, publish]);
  return (
    <CommandChannelContext.Provider value={ctx}>
      {children}
    </CommandChannelContext.Provider>
  );
}

type DerivedVarConfig =
  | {
      /** Name of the source var this one tracks until manually edited. */
      from: string;
      /** Template for the derived default; `{value}` is replaced by the source var's current value. */
      template: string;
    }
  | {
      /** Name of a cross-block channel (see `CommandChannelProvider`) this var mirrors until manually edited. */
      channel: string;
    };

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
  /**
   * Cross-block channel name (see `CommandChannelProvider`) this block's own
   * `output` field publishes its live value to, for another block's `input`
   * to mirror. No-op if the block has no `output` field.
   */
  publishChannel?: string;
  lang?: string;
  /**
   * When true, fields start empty — their default shows only as grey
   * placeholder text — and the rendered command shows a `<name>` token for
   * any field the reader hasn't typed into yet, instead of silently
   * filling in the default. That way the copied command reads as an
   * editable template (fill in `<target>` yourself in the terminal), or
   * the reader can fill in the fields above and click Apply (or type into
   * every field) to get the fully-substituted live command instead.
   * Apply fills in every field at once — including a derived field like
   * `output` the reader never typed into directly — and keeps tracking
   * live updates afterward (e.g. `output` keeps following `target`).
   */
  placeholderMode?: boolean;
}

/** Bracketed token shown in the command for a field the reader hasn't filled in yet. */
function placeholderToken(name: string): string {
  const label = name === "input" || name === "output" ? `${name}-file` : name;
  return `<${label}>`;
}

export function CommandInput({
  command,
  vars,
  derivedVars,
  publishChannel,
  lang = "bash",
  placeholderMode = false,
}: CommandInputProps) {
  const id = useId();
  const channelCtx = useContext(CommandChannelContext);
  const names = useMemo(() => {
    const templateNames = new Set(
      Array.from(command.matchAll(VAR_PATTERN), (m) => m[1]),
    );
    const authored = [...Object.keys(vars), ...Object.keys(derivedVars ?? {})].filter(
      (name, index, arr) => arr.indexOf(name) === index && templateNames.has(name),
    );
    const remaining = [...templateNames].filter((name) => !authored.includes(name));
    return orderFields([...authored, ...remaining]);
  }, [command, vars, derivedVars]);
  const [values, setValues] = useState<Record<string, string>>(
    placeholderMode ? {} : vars,
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState(false);
  const derived = useMemo(() => derivedVars ?? {}, [derivedVars]);

  const effectiveValues = useMemo(() => {
    const next = placeholderMode ? { ...vars, ...values } : { ...values };
    for (const [name, config] of Object.entries(derived)) {
      if (touched[name]) continue;
      if ("channel" in config) {
        next[name] = channelCtx?.values[config.channel] ?? vars[name] ?? "";
      } else {
        next[name] = config.template.replace(
          "{value}",
          sanitizeForFilename(next[config.from] ?? ""),
        );
      }
    }
    return next;
  }, [values, touched, derived, placeholderMode, vars, channelCtx]);

  useEffect(() => {
    if (publishChannel && channelCtx && effectiveValues.output !== undefined) {
      channelCtx.publish(publishChannel, effectiveValues.output);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishChannel, effectiveValues.output]);

  const rendered = names.reduce((acc, name) => {
    const filled = placeholderMode ? Boolean(values[name]) || applied : true;
    const replacement = filled
      ? (effectiveValues[name] ?? "")
      : placeholderToken(name);
    return acc.replaceAll(`{{${name}}}`, replacement);
  }, command);

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
              value={
                placeholderMode
                  ? (values[name] ?? "")
                  : (effectiveValues[name] ?? "")
              }
              onChange={(e) => {
                setValues((prev) => ({ ...prev, [name]: e.target.value }));
                if (derived[name]) {
                  setTouched((prev) => ({ ...prev, [name]: true }));
                }
              }}
              placeholder={placeholderMode ? effectiveValues[name] : vars[name]}
              spellCheck={false}
              autoComplete="off"
              className="w-44 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm text-fd-foreground outline-none placeholder:text-fd-muted-foreground focus:ring-2 focus:ring-fd-ring"
            />
          </label>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {placeholderMode && (
            <Tooltip label="Fill every field's current value (typed or default) into the command below, including fields you haven't edited yet.">
              <button
                type="button"
                onClick={(e) => {
                  setApplied(true);
                  e.currentTarget.blur();
                }}
                className="rounded-md border border-fd-border px-2 py-1 text-xs font-medium text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-accent-foreground"
              >
                Apply
              </button>
            </Tooltip>
          )}
          <Tooltip
            label={
              placeholderMode
                ? "Clear every field back to empty, showing its default as placeholder text again."
                : "Reset every field back to its default value."
            }
          >
            <button
              type="button"
              onClick={(e) => {
                setValues(placeholderMode ? {} : vars);
                setTouched({});
                setApplied(false);
                e.currentTarget.blur();
              }}
              className="rounded-md border border-fd-border px-2 py-1 text-xs font-medium text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              Reset
            </button>
          </Tooltip>
        </div>
      </div>
      <DynamicCodeBlock
        lang={lang}
        code={rendered}
        codeblock={{ className: "mt-0 rounded-t-none" }}
      />
    </div>
  );
}
