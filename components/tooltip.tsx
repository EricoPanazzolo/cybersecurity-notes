"use client";

import { cloneElement, isValidElement, useId, type ReactElement } from "react";

interface TooltipProps {
  /** Text shown in the tooltip on hover/focus. */
  label: string;
  /** A single focusable element (e.g. a button) to attach the tooltip to. */
  children: ReactElement<{ "aria-describedby"?: string }>;
}

/** Small themed hover/focus tooltip, styled to match the rest of the site instead of the browser's native `title` box. */
export function Tooltip({ label, children }: TooltipProps) {
  const id = useId();
  const trigger = isValidElement(children)
    ? cloneElement(children, { "aria-describedby": id })
    : children;

  return (
    <span className="group/tooltip relative inline-flex">
      {trigger}
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-56 -translate-x-1/2 rounded-md border border-fd-border bg-fd-popover px-2.5 py-1.5 text-xs leading-snug text-fd-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      >
        {label}
        <span className="absolute top-full left-1/2 -mt-px h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-fd-border bg-fd-popover" />
      </span>
    </span>
  );
}
