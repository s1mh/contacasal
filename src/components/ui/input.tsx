import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        spellCheck
        lang="pt-BR"
        className={cn(
          "flex h-12 w-full rounded-2xl border-2 border-border/50 bg-muted/50 px-4 py-3 text-base ring-offset-background transition-all duration-300",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/60",
          "hover:border-primary/30 hover:bg-muted/70",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-background focus-visible:shadow-[0_0_0_4px_hsl(var(--primary)/0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
