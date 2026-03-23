import { ToastType } from "@/components/ToastItem";
import { Client } from "@/lib/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

export function Room({
  client,
  onBack,
  addToast,
}: {
  client: Client;
  onBack?: () => void;
  addToast: (type: ToastType, message: string, duration?: number) => void;
}) {
  const grid = useSyncExternalStore(
    client.subscribe.bind(client),
    client.getGrid.bind(client),
  );

  // 當前選擇要填上的顏色，預設為 1 (顏色 A)
  const [activeColor, setActiveColor] = useState<number>(1);

  // PiP 懸浮視窗的狀態
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  // 顏色與樣式的對應表 (使用 Tailwind 顏色)
  const colorConfig: Record<number, { bg: string; label: string }> = {
    0: {
      bg: "bg-base-100 border-base-content/20 text-base-content/40 hover:border-primary/50 hover:bg-base-200",
      label: "清除",
    },
    1: { bg: "bg-error text-error-content border-error", label: "101" },
    2: { bg: "bg-info text-info-content border-info", label: "102" },
    3: {
      bg: "bg-success text-success-content border-success",
      label: "103",
    },
    4: {
      bg: "bg-warning text-warning-content border-warning",
      label: "104",
    },
  };

  // 當懸浮視窗開啟時，自動滾動到最底部
  useEffect(() => {
    if (pipWindow) {
      // 稍微延遲以確保 React 已經把 Portal 內容 render 到 pip 內
      const timer = setTimeout(() => {
        if (pipWindow.document.documentElement) {
          pipWindow.scrollTo({
            top: pipWindow.document.documentElement.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [pipWindow]);

  const togglePiP = useCallback(async () => {
    // 若已開啟，則會呼叫 close() 關閉
    if (pipWindow) {
      pipWindow.close();
      return;
    }

    if (!("documentPictureInPicture" in window)) {
      addToast(
        "error",
        "您的瀏覽器不支援 Document PiP API (建議使用最新版 Chrome)",
      );
      return;
    }

    try {
      // @ts-expect-error: documentPictureInPicture TS目前可能沒有內建支援
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 400,
        height: 800,
      });

      // 複製所有的樣式表以確保 Tailwind/FlyonUI 正常顯示
      Array.from(document.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.cssRules) {
            const styleEl = document.createElement("style");
            const cssText = Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join("");
            styleEl.textContent = cssText;
            pip.document.head.appendChild(styleEl);
          }
        } catch {
          // 若有跨域樣式，嘗試用 link 來載入
          if (styleSheet.href) {
            const linkEl = document.createElement("link");
            linkEl.rel = "stylesheet";
            linkEl.href = styleSheet.href;
            pip.document.head.appendChild(linkEl);
          }
        }
      });

      // 確保底色和整體版面套用到外層
      pip.document.documentElement.className =
        document.documentElement.className;
      pip.document.documentElement.setAttribute(
        "data-theme",
        document.documentElement.getAttribute("data-theme") || "light",
      );
      pip.document.body.className =
        "bg-base-200 min-h-screen p-4 overflow-y-auto " +
        document.body.className;

      // 當視窗關閉時清理狀態
      pip.addEventListener("pagehide", () => {
        setPipWindow(null);
      });

      setPipWindow(pip);
    } catch (error) {
      console.error(error);
      addToast("error", "無法開啟懸浮視窗，可能被阻擋或沒有權限");
    }
  }, [pipWindow, addToast]);

  const resetGrid = useCallback(() => {
    client.resetGrid();
  }, [client]);

  const handleSlotClick = (layerIndex: number, slotIndex: number) => {
    const existingColor = grid[layerIndex][slotIndex];

    // 如果該格子已經有其他的顏色（非 0 且不是當前顏色），則阻擋並顯示錯誤訊息
    if (existingColor !== 0 && existingColor !== activeColor) {
      addToast("error", "此小格已經有人選了！");
      return;
    }

    client.markSlot(
      layerIndex,
      slotIndex,
      existingColor === activeColor ? 0 : activeColor,
    );
  };

  // 將 10x4 的陣列轉換成 10 位數字的答案，並在中間加一個空格方便閱讀
  const sequenceString = useMemo(() => {
    const ans = grid
      .map((layer) => {
        const pos = layer.findIndex((color) => color === activeColor);
        return pos === -1 ? "?" : (4 - pos).toString();
      })
      .reverse()
      .join("");
    return ans.substring(0, 5) + " " + ans.substring(5);
  }, [grid, activeColor]);

  // 需要被移到懸浮視窗的共同內容 (工具列 + 網格)
  const renderGridContent = () => (
    <>
      {/* 調色盤 / 工具列 */}
      <div className="mb-6 flex flex-wrap justify-center gap-2 sm:gap-4">
        <button
          className={`btn btn-outline opacity-80 hover:opacity-100 ${colorConfig[0].bg.split(" ")[0]} ${colorConfig[0].bg.split(" ")[1] || ""}`}
          onClick={() => resetGrid()}
        >
          重置
        </button>
        {[1, 2, 3, 4].map((c) => (
          <button
            className={`btn ${
              activeColor === c
                ? "ring-4 ring-primary ring-offset-2 ring-offset-base-100"
                : "opacity-80 hover:opacity-100"
            } border-none ${colorConfig[c].bg.split(" ")[0]} ${colorConfig[c].bg.split(" ")[1] || ""}`}
            key={c}
            onClick={() => setActiveColor(c)}
          >
            {colorConfig[c].label}
          </button>
        ))}
        <button
          className={`btn btn-outline opacity-80 hover:opacity-100 ${colorConfig[0].bg.split(" ")[0]} ${colorConfig[0].bg.split(" ")[1] || ""}`}
          onClick={togglePiP}
        >
          {pipWindow ? "關閉視窗" : "懸浮視窗"}
          <span className="icon-[ic--baseline-launch]"></span>
        </button>
      </div>

      {/* 答案字串顯示區 */}
      <div className="mb-6 flex items-center justify-between rounded-xl bg-neutral p-4 text-neutral-content shadow-lg sm:justify-start sm:gap-6">
        <h3 className="shrink-0 text-sm font-semibold uppercase opacity-70">
          答案字串
        </h3>
        <p className="text-right font-mono text-lg tracking-widest break-all sm:text-left">
          {sequenceString}
        </p>
      </div>

      {/* 10 層 4 列的網格 */}
      <div className="flex flex-col gap-2">
        {grid.map((layer, layerIndex) => (
          <div className="group flex items-center gap-3" key={layerIndex}>
            {/* 顯示層數標籤 */}
            <div className="w-8 shrink-0 text-right text-lg font-bold text-base-content/40 transition-colors group-hover:text-base-content/80">
              {10 - layerIndex}
            </div>

            <div className="flex flex-1 justify-around gap-2 rounded-box bg-base-200 p-2 shadow-inner">
              {layer.map((val, slotIndex) => (
                <button
                  className={`flex h-12 w-full max-w-16 items-center justify-center rounded-lg border-2 text-xl font-bold transition-all hover:scale-105 active:scale-95 sm:h-16 ${colorConfig[val].bg} ${
                    val === 0 ? "border-dashed" : "border-transparent"
                  } `}
                  key={slotIndex}
                  onClick={() => handleSlotClick(layerIndex, slotIndex)}
                >
                  {4 - slotIndex}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col items-center bg-base-200 p-4 sm:p-8">
      <div className="card w-full max-w-2xl bg-base-100 shadow-xl">
        <div className="card-body">
          {/* 頂部標題區塊：包含上一頁按鈕與房間資訊 */}
          <div className="mb-6 flex items-center justify-between gap-2">
            {onBack && (
              <button
                className="btn shrink-0 btn-sm btn-outline sm:w-24"
                aria-label="回上一頁"
                onClick={onBack}
              >
                <span className="icon-[ic--baseline-arrow-back-ios-new]"></span>
                <span className="hidden sm:inline">上一頁</span>
              </button>
            )}

            <h2 className="flex-1 text-center text-xl font-bold text-base-content sm:text-2xl">
              房間:{" "}
              <span className="tracking-wider text-primary">
                {client.roomId}
              </span>{" "}
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> | </span>密碼:{" "}
              <span className="font-mono text-secondary">
                {client.password}
              </span>
            </h2>

            <button
              className="btn shrink-0 btn-sm btn-outline sm:w-24"
              aria-label="複製資訊"
              onClick={() => {
                const copyText = `Code: ${client.roomId} | PWD: ${client.password} | Link: rjpq.pearki.org`;
                navigator.clipboard
                  .writeText(copyText)
                  .then(() => addToast("success", "已複製", 3000))
                  .catch(() => addToast("error", "複製失敗"));
              }}
              title="複製房間資訊"
            >
              <span className="icon-[ic--baseline-content-copy] text-lg"></span>
              <span className="hidden sm:inline">複製</span>
            </button>
          </div>

          {/* 如果已開啟 PiP，原本的地方顯示提示；否則直接渲染 */}
          {pipWindow ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-70">
              <span className="mb-4 icon-[ic--baseline-picture-in-picture-alt] text-7xl"></span>
              <h3 className="mb-2 text-xl font-bold">
                操作面板已移至懸浮視窗 🎈
              </h3>
              <p className="mb-6 text-sm">請在獨立的小視窗中繼續操作網格。</p>
              <button className="btn btn-primary" onClick={togglePiP}>
                把面板收回來
              </button>
            </div>
          ) : (
            renderGridContent()
          )}

          {/* 將內容建立 Portal 轉移到 PiP Window 內 */}
          {pipWindow &&
            createPortal(renderGridContent(), pipWindow.document.body)}
        </div>
      </div>
    </div>
  );
}
