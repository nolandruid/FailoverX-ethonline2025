import * as React from "react"

import { cn } from "@/globals/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none",
        "bg-gray-900 border-gray-700 text-white placeholder:text-gray-500",
        "focus-visible:border-yellow-500 focus-visible:ring-yellow-500/50 focus-visible:ring-[3px]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
