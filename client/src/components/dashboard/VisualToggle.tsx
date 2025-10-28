import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

type VisualToggleProps = React.HTMLAttributes<HTMLDivElement> & {
  /** called when a view is toggled; receives the selected view id */
  onPopup?: (view: string) => void;
};

export default function VisualToggle({
  className,
  viewMode,
  onChange,
  ...props
}: VisualToggleProps) {
  const [selected, setSelected] = React.useState("visao1");
  // Função que dispara ao clicar em uma das visões
  function handleToggle(view: string) {
    setSelected(view);

    // notify parent (if provided) that the popup should be shown
    // notify parent (if provided) that the popup should be shown
    try {
      onPopup?.(view);
    } catch (e) {
      // ignore callback errors
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-4 p-3 rounded-xl backdrop-blur-md ml-3",
        className
      )}
      {...props}
    >
      {/* botão Visão Geral -> vamos mapear pra 'planilha' */}
      <Button
        onClick={() => onChange("planilha")}
        className={cn(
          "transition-all duration-200 rounded-md text-xs font-medium border",
          viewMode === "planilha"
            ? "bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.5)] border-teal-400/40"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border-slate-600"
        )}
      >
        Visão Geral
      </Button>

      {/* botão Dashboard -> ativa 'dashboard' */}
      <Button
        onClick={() => onChange("dashboard")}
        className={cn(
          "transition-all duration-200 rounded-md text-xs font-medium border",
          viewMode === "dashboard"
            ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-emerald-400/40"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border-slate-600"
        )}
      >
        Dashboard
      </Button>
    </div>
  );
}
