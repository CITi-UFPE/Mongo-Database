import { useCallback, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ViewMode = "planilha" | "dashboard";

type VisualToggleProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  viewMode?: ViewMode;
  onChange?: (mode: ViewMode) => void;
  onPopup?: (mode: ViewMode) => void;
};

export default function VisualToggle({
  className,
  viewMode = "planilha",
  onChange,
  onPopup,
  ...props
}: VisualToggleProps) {
  const handleSelect = useCallback(
    (mode: ViewMode) => {
      onChange?.(mode);
      onPopup?.(mode);
    },
    [onChange, onPopup]
  );

  return (
    <div
      className={cn(
        "flex flex-wrap gap-4 p-3 rounded-xl backdrop-blur-md ml-3",
        className
      )}
      {...props}
    >
      <Button
        type="button"
        onClick={() => handleSelect("planilha")}
        className={cn(
          "transition-all duration-200 rounded-md text-xs font-medium border",
          viewMode === "planilha"
            ? "bg-linear-to-r from-blue-500 to-teal-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.5)] border-teal-400/40"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border-slate-600"
        )}
      >
        Visão Geral
      </Button>

      <Button
        type="button"
        onClick={() => handleSelect("dashboard")}
        className={cn(
          "transition-all duration-200 rounded-md text-xs font-medium border",
          viewMode === "dashboard"
            ? "bg-linear-to-r from-teal-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-emerald-400/40"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border-slate-600"
        )}
      >
        Dashboard
      </Button>
    </div>
  );
}
