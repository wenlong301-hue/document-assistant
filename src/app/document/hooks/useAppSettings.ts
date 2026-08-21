import { useState, useEffect } from "react";
import type { DocStore, WebPersistedState } from "@/app/document/types";
import { getElectronAPI } from "@/app/shared/electron";
import { formatSavedAt } from "@/app/editor/constants";

type ToastSetter = (toast: { message: string; type: "success" | "error" | "info" } | null) => void;
type AppSettings = { closeBehavior?: string; fontSize?: string; lineHeight?: string; theme?: string; autoSaveEnabled?: boolean };

export function useAppSettings(params: {
  isElectron: boolean;
  setToast: ToastSetter;
  flushCurrentDocRef: React.MutableRefObject<() => Promise<boolean>>;
  persistWebStateNowRef: React.MutableRefObject<(state: WebPersistedState) => Promise<boolean>>;
  docsRef: React.MutableRefObject<string[]>;
  selectedDocRef: React.MutableRefObject<string>;
  docStoreRef: React.MutableRefObject<DocStore>;
}) {
  const { isElectron, setToast, flushCurrentDocRef, persistWebStateNowRef, docsRef, selectedDocRef, docStoreRef } = params;
  const [appSettings, setAppSettings] = useState<AppSettings>({});
  const fontSize = appSettings.fontSize || "15px";
  const lineHeight = appSettings.lineHeight || "1.8";
  const theme = appSettings.theme || "light";
  const autoSaveEnabled = !!appSettings.autoSaveEnabled;

  useEffect(() => {
    const api = getElectronAPI();
    if (isElectron && api?.settingsRead) {
      api.settingsRead().then((settings: AppSettings) => {
        setAppSettings(settings || {});
      }).catch((error: unknown) => console.error("load settings failed:", error));
      return;
    }
    try {
      const raw = localStorage.getItem("doc-assistant-settings");
      if (raw) setAppSettings(JSON.parse(raw));
    } catch {}
  }, [isElectron]);

  const handleSaveSettings = async (next: AppSettings) => {
    const merged = { ...appSettings, ...next };
    setAppSettings(merged);
    try {
      const api = getElectronAPI();
      if (api?.settingsWrite) await api.settingsWrite(merged);
      else if (!isElectron) {
        try { localStorage.setItem("doc-assistant-settings", JSON.stringify(merged)); } catch {}
      }
      setToast({ message: "设置已保存", type: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "设置保存失败", type: "error" });
    }
  };

  const handleAutoSaveChange = (enabled: boolean, setLastSavedAt: (v: string | null) => void) => {
    const merged = { ...appSettings, autoSaveEnabled: enabled };
    setAppSettings(merged);
    void (async () => {
      try {
        const api = getElectronAPI();
        if (api?.settingsWrite) await api.settingsWrite(merged);
        else if (!isElectron) {
          try { localStorage.setItem("doc-assistant-settings", JSON.stringify(merged)); } catch {}
        }
      } catch (error) {
        console.error("Failed to persist auto-save setting:", error);
      }
      if (enabled) {
        if (isElectron) {
          const ok = await flushCurrentDocRef.current();
          if (ok) setLastSavedAt(formatSavedAt(false));
        } else {
          const state: WebPersistedState = { docs: docsRef.current, docStore: docStoreRef.current, selectedDoc: selectedDocRef.current };
          const ok = await persistWebStateNowRef.current(state);
          if (ok) setLastSavedAt(formatSavedAt(false));
        }
      }
    })();
  };

  return {
    appSettings,
    setAppSettings,
    fontSize,
    lineHeight,
    theme,
    autoSaveEnabled,
    handleSaveSettings,
    handleAutoSaveChange,
  };
}
