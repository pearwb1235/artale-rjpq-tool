import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMsg {
  id: string;
  duration?: number;
  type: ToastType;
  message: string;
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastMsg;
  onClose: (id: string) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(100);
  const DURATION = toast.duration ?? 5000;

  useEffect(() => {
    // 觸發進入動畫與進度條
    const mountTimer = setTimeout(() => {
      setIsMounted(true);
      setProgress(0); // 開始倒數進度條
    }, 10);

    // 觸發離開動畫與卸載
    const closeTimer = setTimeout(() => {
      setIsClosing(true);
      setTimeout(() => onClose(toast.id), 300); // 等待退場動畫結束後移除
    }, DURATION);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(closeTimer);
    };
  }, [toast.id, DURATION, onClose]);

  const colors =
    toast.type === "error"
      ? "bg-error text-error-content"
      : toast.type === "success"
        ? "bg-success text-success-content"
        : "bg-info text-info-content";

  const icon =
    toast.type === "error" ? (
      <span className="mt-0.5 icon-[ic--baseline-error-outline] shrink-0 text-xl" />
    ) : toast.type === "success" ? (
      <span className="mt-0.5 icon-[ic--baseline-check-circle-outline] shrink-0 text-xl" />
    ) : (
      <span className="mt-0.5 icon-[ic--baseline-info] shrink-0 text-xl" />
    );

  return (
    <div
      className={`relative w-full max-w-sm overflow-hidden rounded-lg shadow-xl outline outline-black/5 transition-all duration-300 ease-in-out sm:max-w-md ${
        isMounted && !isClosing
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none origin-top -translate-y-4 scale-95 opacity-0"
      } ${colors}`}
    >
      <div className="relative z-10 flex items-start gap-3 px-4 py-3">
        {icon}
        <span className="text-sm font-semibold">{toast.message}</span>
      </div>
      {/* 底部進度條 */}
      <div className="absolute right-0 bottom-0 left-0 h-1 bg-black/10">
        <div
          className="h-full bg-current opacity-40 transition-all ease-linear"
          style={{
            width: `${progress}%`,
            transitionDuration: `${DURATION}ms`,
          }}
        />
      </div>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastMsg[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-100 flex w-full -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          className="pointer-events-auto flex w-full justify-center"
          key={t.id}
        >
          <ToastItem onClose={onClose} toast={t} />
        </div>
      ))}
    </div>
  );
}
