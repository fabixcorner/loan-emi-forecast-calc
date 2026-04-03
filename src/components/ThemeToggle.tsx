import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-9 w-[4.5rem] rounded-full bg-muted/80 border border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] transition-all duration-300 flex items-center px-1"
      aria-label="Toggle theme"
    >
      {/* Sliding knob */}
      <span
        className={`absolute top-0.5 h-7 w-7 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-all duration-300 flex items-center justify-center ${
          isDark
            ? "translate-x-[calc(100%+0.5rem)] bg-slate-700"
            : "translate-x-0 bg-white"
        }`}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-blue-300" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </span>
      {/* Background icons */}
      <span className="absolute left-2 top-1/2 -translate-y-1/2">
        <Sun className={`h-3.5 w-3.5 transition-opacity ${isDark ? "opacity-30 text-muted-foreground" : "opacity-0"}`} />
      </span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2">
        <Moon className={`h-3.5 w-3.5 transition-opacity ${isDark ? "opacity-0" : "opacity-30 text-muted-foreground"}`} />
      </span>
    </button>
  );
}
