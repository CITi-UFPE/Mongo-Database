import { Loader2, RefreshCw } from "lucide-react";

interface PipefySyncButtonProps {
  isSyncing: boolean;
  onClick: () => void;
}

export function PipefySyncButton({ isSyncing, onClick }: PipefySyncButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSyncing}
      className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
      aria-busy={isSyncing}
      aria-live="polite"
    >
      {isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Sincronizando...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Sincronizar Pipefy
        </>
      )}
    </button>
  );
}
