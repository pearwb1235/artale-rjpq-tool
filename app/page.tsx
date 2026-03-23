"use client";

import { Loading } from "@/components/Loading";
import { Room } from "@/components/Room";
import { RoomLobby } from "@/components/RoomLobby";
import { ToastContainer, ToastMsg, ToastType } from "@/components/ToastItem";
import { Client } from "@/lib/client";
import { Server } from "@/lib/server";
import React, { useCallback } from "react";

export default function Home() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [client, setClient] = React.useState<Client | null>(null);
  const [server, setServer] = React.useState<Server | null>(null);
  const [toasts, setToasts] = React.useState<ToastMsg[]>([]);

  /** 禁用右鍵菜單 */
  React.useEffect(() => {
    document.body.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }, []);
  /** 初始化 client */
  React.useEffect(() => {
    const client = new Client();
    setClient(client);
    return client.destroy;
  }, []);
  /** 防止 server 記憶體洩漏 */
  React.useEffect(() => {
    if (!server) return;
    const currentServer = server;
    return () => {
      currentServer.shutdown();
    };
  }, [server]);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    [],
  );
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const onCreateRoom = React.useCallback(
    (password: string) => {
      password = password.trim();
      if (password.length < 4) {
        addToast("error", "房間密碼至少需要4位數");
        return;
      }
      if (!/^[0-9]+$/.test(password)) {
        addToast("error", "房間密碼只能包含數字");
        return;
      }
      setIsLoading(true);
      const server = new Server(password);
      function onShutdown() {
        addToast("error", "創建房間失敗");
        setIsLoading(false);
      }
      server.on("shutdown", onShutdown);
      server.on("ready", () => {
        setServer(server);
        server.off("shutdown", onShutdown);
      });
    },
    [addToast],
  );
  const onJoinRoom = React.useCallback(
    (id: string, password: string) => {
      id = id.trim();
      password = password.trim();
      if (!id) {
        addToast("error", "請輸入房間ID");
        return;
      }
      if (!password) {
        addToast("error", "請輸入房間密碼");
        return;
      }
      if (!/^[0-9]{6}$/.test(id)) {
        addToast("error", "房間ID 必須是6位數字");
        return;
      }
      if (password.length < 4) {
        addToast("error", "房間密碼至少需要4位數");
        return;
      }
      if (!client) {
        addToast("error", "客戶端尚未初始化完成，請稍後再試");
        return;
      }
      setIsLoading(true);
      client
        .joinRoom(id, password)
        .catch(() => {
          addToast("error", "加入房間失敗，請檢查ID和密碼是否正確");
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [client, addToast],
  );
  const onLeaveRoom = React.useCallback(() => {
    if (!client) return;
    client.leaveRoom();
  }, [client]);

  React.useEffect(() => {
    if (!client) return;
    function onDisconnection() {
      addToast("error", "與房主連結中斷");
    }
    client.on("disconnection", onDisconnection);
    return () => {
      client.off("disconnection", onDisconnection);
    };
  }, [client, addToast]);
  /** 當 client 或 server 改變時，自動加入房間 */
  React.useEffect(() => {
    if (!client || !server) return;
    if (client.isConnected) client.leaveRoom();
    onJoinRoom(server.roomId, server.password);
  }, [client, server, onJoinRoom]);

  return (
    <>
      {/* 浮動通知容器 */}
      <ToastContainer onClose={removeToast} toasts={toasts} />
      {isLoading ? (
        <Loading />
      ) : client?.isConnected ? (
        <Room addToast={addToast} client={client} onBack={onLeaveRoom} />
      ) : (
        <RoomLobby onCreateRoom={onCreateRoom} onJoinRoom={onJoinRoom} />
      )}
    </>
  );
}
