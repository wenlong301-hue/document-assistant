import React from "react";

export type UpdateInfo = {
  version: string;
  currentVersion?: string;
  releaseDate?: string;
  platform?: string;
};

export type UpdateProgress = {
  percent: number;
  transferred?: number;
  total?: number;
};

type Props = {
  info: UpdateInfo;
  downloading?: boolean;
  downloaded?: boolean;
  progress?: UpdateProgress | null;
  errorMessage?: string;
  onLater: () => void;
  onOpenRelease: () => void;
  onDownload: () => void;
  onInstall: () => void;
};

function formatBytes(bytes?: number) {
  const n = Number(bytes || 0);
  if (!n) return "";
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

export function UpdateModal({
  info,
  downloading = false,
  downloaded = false,
  progress = null,
  errorMessage = "",
  onLater,
  onOpenRelease,
  onDownload,
  onInstall,
}: Props) {
  const isMac = info.platform === "darwin" || (typeof navigator !== "undefined" && /Mac/i.test(navigator.platform));
  const percent = Math.max(0, Math.min(100, Math.round(progress?.percent || 0)));
  const primaryLabel = downloaded
    ? "立即安装并重启"
    : downloading
      ? `下载中 ${percent}%`
      : "下载更新";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onLater}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] max-w-[92vw] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 — 与 ShareModal 一致 */}
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">发现新版本</p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer outline-none appearance-none"
            onClick={onLater}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 正文 — 与 ShareModal 一致：上24 下32 */}
        <div className="px-[24px] pt-[24px] pb-[32px] flex flex-col">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[20px]">
            当前版本 v{info.currentVersion || "-"}，最新版本{" "}
            <span className="text-[#134CFF]">v{info.version}</span> 已发布。
          </p>
          <p className="m-0 mt-[8px] font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[13px] leading-[18px]">
            {isMac
              ? "下载完成后将覆盖当前应用并自动重启（不会生成第二个应用）。也可前往 GitHub Release 手动安装。"
              : "可直接下载并安装更新；也可前往 GitHub Release 页面获取安装包。"}
          </p>

          {(downloading || downloaded) && (
            <div className="mt-[16px] flex flex-col gap-[8px]">
              <div className="h-[8px] rounded-full bg-[#eef0f5] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#134CFF] transition-all duration-200"
                  style={{ width: `${downloaded ? 100 : percent}%` }}
                />
              </div>
              <p className="m-0 font-['PingFang_SC:Regular',sans-serif] text-[12px] text-[#8d8e99] leading-[18px]">
                {downloaded
                  ? "下载完成"
                  : progress?.total
                    ? `${formatBytes(progress.transferred)} / ${formatBytes(progress.total)}`
                    : `已下载 ${percent}%`}
              </p>
            </div>
          )}

          {errorMessage && (
            <p className="m-0 mt-[8px] font-['PingFang_SC:Regular',sans-serif] text-[#E53E3E] text-[13px] leading-[18px]">{errorMessage}</p>
          )}

          {/* 底部按钮 — 与 ExportModal 一致：高 32、圆角 6、间距 12 */}
          <div className="flex items-center justify-end gap-[12px] mt-[24px]">
            <button
              type="button"
              className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#131212] text-[14px] font-normal leading-none cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors outline-none appearance-none inline-flex items-center justify-center box-border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              onClick={onLater}
              disabled={downloading}
            >
              稍后再说
            </button>
            <button
              type="button"
              className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#131212] text-[14px] font-normal leading-none cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors outline-none appearance-none inline-flex items-center justify-center box-border"
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              onClick={onOpenRelease}
            >
              打开下载页
            </button>
            <button
              type="button"
              className={`h-[32px] px-[16px] rounded-[6px] border-0 bg-[#131212] text-white text-[14px] font-normal leading-none transition-opacity outline-none appearance-none inline-flex items-center justify-center box-border ${downloading ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:opacity-90 active:opacity-80"}`}
              style={{ fontFamily: "PingFang SC, sans-serif" }}
              onClick={downloaded ? onInstall : onDownload}
              disabled={downloading}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
