import { useState } from "react";

export function RoomLobby({
  onCreateRoom,
  onJoinRoom,
}: {
  onCreateRoom?: (password: string) => void;
  onJoinRoom?: (id: string, password: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"join" | "create">("join");
  const [joinId, setJoinId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [createPassword, setCreatePassword] = useState("");

  const handleJoin = () => {
    if (onJoinRoom) {
      onJoinRoom(joinId, joinPassword);
    }
  };

  const handleCreate = () => {
    if (onCreateRoom) {
      onCreateRoom(createPassword);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="mb-4 text-center text-3xl font-bold text-base-content">
            RJPQ
          </h2>
          <div className="tabs-boxed mb-4 tabs flex justify-center">
            <button
              className={`tab flex-1 ${activeTab === "join" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("join")}
            >
              加入房間
            </button>
            <button
              className={`tab flex-1 ${activeTab === "create" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("create")}
            >
              創建房間
            </button>
          </div>

          {activeTab === "join" && (
            <div className="form-control w-full space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">房間號碼</span>
                </label>
                <input
                  className="input-bordered input w-full appearance-none"
                  onChange={(e) => setJoinId(e.target.value)}
                  placeholder="請輸入6位數房號"
                  type="number"
                  value={joinId}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">房間密碼</span>
                </label>
                <input
                  className="input-bordered input w-full appearance-none"
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  type="number"
                  value={joinPassword}
                />
              </div>
              <button
                className="btn mt-4 w-full btn-primary"
                onClick={handleJoin}
              >
                加入
              </button>
            </div>
          )}

          {activeTab === "create" && (
            <div className="form-control w-full space-y-4">
              <div className="alert py-2 text-sm alert-info">
                <span>創建後將自動產生隨機的房號。</span>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">設定房間密碼</span>
                </label>
                <input
                  className="input-bordered input w-full appearance-none"
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="至少4位數的純數字密碼"
                  type="number"
                  value={createPassword}
                />
              </div>
              <button
                className="btn mt-4 w-full btn-secondary"
                onClick={handleCreate}
              >
                創建房間
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
