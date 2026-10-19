"use client";
import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  variant?: "success" | "info" | "warning";
}

interface ToastContextValue {
  showToast: (message: string, variant?: Toast["variant"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: Toast["variant"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-[var(--shadow-lg)] text-sm font-medium max-w-sm
              ${t.variant === "success" ? "bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-text)]" : ""}
              ${t.variant === "info" ? "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)]" : ""}
              ${t.variant === "warning" ? "bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--warning-text)]" : ""}`}
          >
            {t.variant === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {t.variant === "info" && <Info className="h-4 w-4 shrink-0" />}
            {t.variant === "warning" && <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="btn btn-ghost !p-1 -mr-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
