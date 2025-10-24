import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function VisualToggle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [selected, setSelected] = React.useState("visao1");

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-2 gap-4 p-3 rounded-xl backdrop-blur-md ml-3",
        className
      )}
      {...props}
    >
      <Button
        onClick={() => setSelected("visao1")}
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
        onClick={() => setSelected("visao2")}
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
  );
}
