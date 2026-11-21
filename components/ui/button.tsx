import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "brand-soft"
  size?: "default" | "sm" | "lg" | "icon"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-120 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    
    const variants = {
      default: "bg-brand text-on-brand shadow-subtle hover:bg-brand-hover",
      destructive: "bg-danger text-white shadow-subtle hover:bg-danger/90",
      outline: "border border-border bg-surface text-text hover:bg-surface-2 hover:text-text",
      secondary: "bg-surface-2 text-text hover:bg-border",
      ghost: "text-text-muted hover:bg-surface-2 hover:text-text",
      link: "text-brand underline-offset-4 hover:underline",
      "brand-soft": "bg-brand-soft text-brand hover:bg-brand-soft/80",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-sm px-3 text-xs",
      lg: "h-12 rounded-md px-6 text-base",
      icon: "h-9 w-9",
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
