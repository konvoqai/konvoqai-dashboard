import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-[var(--text-1)] placeholder:text-[var(--text-3)] selection:bg-primary selection:text-primary-foreground h-11 w-full min-w-0 rounded-xl border border-white/10 bg-[color:var(--surface)] px-3.5 py-2 text-base text-[var(--text-1)] shadow-[var(--shadow-card)] transition-[color,box-shadow,border-color,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[color:var(--accent-strong)] focus-visible:ring-[color:var(--accent-muted-strong)] focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
