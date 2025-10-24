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
  onPopup,
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
    <>
      {/* Botões de toggle */}
      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-2 gap-4 p-3 rounded-xl backdrop-blur-md ml-3",
          className
        )}
        {...props}
      >
        <Button
          onClick={() => handleToggle("visao1")}
          className={cn(
            "transition-all duration-200 rounded-md",
            selected === "visao1"
              ? "bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-md"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
          )}
        >
          Visão Geral
        </Button>

        <Button
          onClick={() => handleToggle("visao2")}
          className={cn(
            "transition-all duration-200 rounded-md",
            selected === "visao2"
              ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white"
          )}
        >
          Dashboard
        </Button>
      </div>

      {/* popup handled by parent via `onPopup` prop */}
    </>
  );
}
