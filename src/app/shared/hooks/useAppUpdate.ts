import { useCallback, useEffect, useRef, useState } from "react";
import type { UpdateInfo, UpdateProgress } from "@/app/document/UpdateModal";
import { getElectronAPI } from "@/app/shared/electron";

type ToastSetter = (toast: { message: string; type: "success" | "error" | "info" } | null) => void;

export function useAppUpdate(isElectron: boolean, setToast: ToastSetter, flushCurrentDoc: () => Promise<boolean | void>) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [updateCheckBusy, setUpdateCheckBusy] = useState(false);
  const manualUpdateCheckRef = useRef(false);
  const startupUpdateCheckRef = useRef(false);

  useEffect(() => {
    if (!isElectron) return;
    const api = getElectronAPI();
    if (!api?.onUpdateAvailable) return;

    const unsubAvailable = api.onUpdateAvailable?.(async (payload) => {
      setUpdateCheckBusy(false);
      setUpdateError("");
      setUpdateDownloaded(false);
      setUpdateProgress(null);
      const isManual = manualUpdateCheckRef.current;
      manualUpdateCheckRef.current = false;
      const skipped = api.getSkippedUpdateVersion ? await api.getSkippedUpdateVersion() : "";
      if (!isManual && skipped && payload?.version && skipped === payload.version) return;
      setUpdateInfo({
        version: payload?.version || "",
        currentVersion: payload?.currentVersion,
        releaseDate: payload?.releaseDate,
        platform: payload?.platform,
      });
      setShowUpdateModal(isManual);
    });
    const unsubNotAvailable = api.onUpdateNotAvailable?.((payload) => {
      setUpdateCheckBusy(false);
      if (manualUpdateCheckRef.current) {
        setToast({
          message: payload?.reason === "dev" ? "开发模式不检查更新" : "当前已是最新版本",
          type: "info",
        });
        manualUpdateCheckRef.current = false;
      }
    });
    const unsubProgress = api.onUpdateProgress?.((payload) => {
      setUpdateDownloading(true);
      setUpdateProgress(payload);
    });
    const unsubDownloaded = api.onUpdateDownloaded?.((payload) => {
      setUpdateDownloading(false);
      setUpdateDownloaded(true);
      setUpdateProgress({ percent: 100 });
      setUpdateInfo((prev) => (prev ? { ...prev, version: payload?.version || prev.version, platform: payload?.platform || prev.platform } : prev));
      setToast({ message: "更新包已下载完成", type: "success" });
    });
    const unsubError = api.onUpdateError?.((payload) => {
      setUpdateCheckBusy(false);
      setUpdateDownloading(false);
      const message = payload?.message || "检查或下载更新失败";
      setUpdateError(message);
      if (manualUpdateCheckRef.current) setToast({ message, type: "error" });
      manualUpdateCheckRef.current = false;
    });

    if (!startupUpdateCheckRef.current && api.checkForUpdates) {
      startupUpdateCheckRef.current = true;
      window.setTimeout(() => {
        api.checkForUpdates({ manual: false }).catch((error: unknown) => {
          console.error("startup update check failed:", error);
        });
      }, 1200);
    }

    return () => {
      unsubAvailable?.();
      unsubNotAvailable?.();
      unsubProgress?.();
      unsubDownloaded?.();
      unsubError?.();
    };
  }, [isElectron, setToast]);

  const handleCheckForUpdates = useCallback(async () => {
    if (!isElectron) {
      setToast({ message: "请在桌面应用中检查更新", type: "info" });
      return;
    }
    const api = getElectronAPI();
    if (!api?.checkForUpdates) {
      setToast({ message: "当前版本不支持检查更新", type: "error" });
      return;
    }
    manualUpdateCheckRef.current = true;
    setUpdateCheckBusy(true);
    setUpdateError("");
    try {
      await api.checkForUpdates({ manual: true });
    } catch (error) {
      setUpdateCheckBusy(false);
      manualUpdateCheckRef.current = false;
      setToast({ message: error instanceof Error ? error.message : "检查更新失败", type: "error" });
    }
  }, [isElectron, setToast]);

  const handleUpdateLater = useCallback(async () => {
    setShowUpdateModal(false);
    setUpdateDownloading(false);
    setUpdateDownloaded(false);
    setUpdateProgress(null);
    setUpdateError("");
  }, []);

  const handleOpenReleasePage = useCallback(async () => {
    try {
      const api = getElectronAPI();
      if (api?.openReleasePage) await api.openReleasePage();
      else window.open("https://github.com/wenlong301-hue/document-assistant/releases/latest", "_blank", "noopener,noreferrer");
    } catch {
      window.open("https://github.com/wenlong301-hue/document-assistant/releases/latest", "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    setUpdateError("");
    setUpdateDownloading(true);
    setUpdateProgress({ percent: 0 });
    try {
      const result = await getElectronAPI()?.downloadUpdate?.();
      if (result && result.ok === false) {
        setUpdateDownloading(false);
        setUpdateError(result.message || "下载更新失败");
      }
    } catch (error) {
      setUpdateDownloading(false);
      setUpdateError(error instanceof Error ? error.message : "下载更新失败");
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    try {
      await flushCurrentDoc();
      const result = await getElectronAPI()?.installUpdate?.();
      if (result?.mode === "replace-in-place") {
        setToast({ message: "正在安装新版本并重启…", type: "info" });
      } else if (result?.mode === "open-installer") {
        setToast({
          message: "已打开安装包：请将应用拖入「应用程序」并选择替换，勿保留旧版",
          type: "info",
        });
      }
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "安装更新失败");
      setToast({ message: "安装失败，请打开下载页手动安装", type: "error" });
    }
  }, [flushCurrentDoc, setToast]);

  return {
    updateInfo,
    showUpdateModal,
    setShowUpdateModal,
    updateDownloading,
    updateDownloaded,
    updateProgress,
    updateError,
    updateCheckBusy,
    handleCheckForUpdates,
    handleUpdateLater,
    handleOpenReleasePage,
    handleDownloadUpdate,
    handleInstallUpdate,
  };
}
