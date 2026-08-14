import { useEffect, useState, type ReactNode } from "react";

type HelpSection = {
  id: string;
  title: string;
  body: ReactNode;
};

const SECTIONS: HelpSection[] = [
  {
    id: "intro",
    title: "产品简介",
    body: (
      <>
        <p>文档助手是一款多级文档写作工具：左侧管理文档与大纲树，右侧富文本编辑，支持局域网分享预览，以及 HTML / Markdown / Word / PDF 导出。</p>
        <p><strong>精编格式</strong>为 <code>.mdoc</code>（JSON：大纲树 + 节点 HTML）。适合产品说明、会议纪要、技术方案、分层知识库等需长期往返编辑的场景。</p>
        <p>格式分层：<strong>L1</strong> <code>.mdoc</code> 权威存储（无损）→ <strong>L2</strong> 项目原文件打开什么存什么（未编辑原样写回）→ <strong>L3</strong> 导出 HTML/MD/Word/PDF（尽力而为，可能有损）。</p>
      </>
    ),
  },
  {
    id: "quickstart",
    title: "快速开始",
    body: (
      <ol>
        <li>左侧点 <strong>新建文件</strong>，输入名称并确定。</li>
        <li>进入 <strong>大纲树</strong> 模式，默认带有同名根节点。</li>
        <li>用 <strong>新建层级 / 添加子文档</strong> 搭好章节结构。</li>
        <li>选中节点后在右侧编辑器写作（工具栏、斜杠命令 <code>/</code>、Markdown 快捷输入）。</li>
        <li>内容会自动保存；可用顶栏 <strong>保存 / 分享 / 导出</strong>。</li>
      </ol>
    ),
  },
  {
    id: "layout",
    title: "界面说明",
    body: (
      <ul>
        <li><strong>顶栏</strong>：保存、导入、导出、分享、删除、帮助、更多（另存为 .mdoc）</li>
        <li><strong>左侧</strong>：搜索、文件树/大纲树切换、文件树或大纲树、分享状态</li>
        <li><strong>右侧</strong>：标题 + 富文本编辑器（大纲树模式）</li>
        <li><strong>底栏</strong>：保存状态、字数统计、页内大纲</li>
      </ul>
    ),
  },
  {
    id: "docs",
    title: "文档管理",
    body: (
      <ul>
        <li><strong>文件树</strong>：管理项目文件列表；<strong>大纲树</strong>：编辑结构与正文。</li>
        <li><strong>导入</strong>：支持 <code>.mdoc</code> / <code>.md</code> / <code>.txt</code> / <code>.html</code> / <code>.docx</code>。</li>
        <li><strong>保存</strong>：项目文件写回原路径；库内文档可另存。</li>
        <li><strong>更多 → 另存为 .mdoc</strong>：始终导出 L1 无损格式（桌面选目录 / Web 下载），适合从 md/docx 转入长期精编。</li>
        <li>项目中打开 <code>.md</code>/<code>.txt</code>/<code>.docx</code> 等：未编辑原样写回；编辑后按该格式最优策略写回（可能有损）。</li>
        <li>桌面端默认库：用户「文档」下的 <code>DocAssistant/*.mdoc</code>。</li>
        <li>删除不可撤销，请谨慎操作。</li>
      </ul>
    ),
  },
  {
    id: "outline",
    title: "大纲结构",
    body: (
      <ul>
        <li>节点菜单：添加子文档、重命名、克隆、删除、导出 HTML（含子文档）。</li>
        <li><strong>预览时隐藏/显示本层</strong>：控制分享与导出 HTML 是否收录该节点。</li>
        <li>支持拖拽排序；根节点不能拖到非根下。</li>
        <li>层级约最多 6 层；空节点或隐藏节点通常不出现在预览章节中。</li>
      </ul>
    ),
  },
  {
    id: "editor",
    title: "编辑写作",
    body: (
      <ul>
        <li>工具栏：标题、字体字号、加粗斜体、颜色、列表、对齐、引用/代码块、链接、图片/视频/附件、表格等。</li>
        <li>空行输入 <code>/</code> 打开斜杠命令（标题/列表/引用/代码/链接/媒体/表格等）；<code>↑</code><code>↓</code><code>Enter</code><code>Esc</code> 导航；删除 <code>/</code> 或光标离开触发行后菜单自动关闭。</li>
        <li>支持 Markdown 行首快捷（如 <code>#</code>、<code>-</code>、<code>&gt;</code>）。链接：<code>Ctrl/Cmd + K</code>。表格行 1–20、列 1–10。</li>
        <li>图片：PNG/JPEG/WebP/GIF（不支持 SVG）；源文件建议 ≤20MB。选中后可调宽度百分比；打开分享/导出等弹窗时不会被操作条挡住。</li>
        <li>视频 ≤20MB；附件 ≤10MB。PDF 导出不含视频。</li>
      </ul>
    ),
  },
  {
    id: "update",
    title: "检查更新",
    body: (
      <ul>
        <li>桌面端启动后会<strong>自动检查</strong> GitHub Releases 是否有新安装包。</li>
        <li>本页标题旁可点 <strong>检查更新</strong> 手动检查。</li>
        <li>发现新版本可：稍后再说、打开下载页、下载更新（显示进度）。</li>
        <li>下载完成后点 <strong>立即安装并重启</strong>：Windows / macOS 均会覆盖当前应用（macOS 不会生成第二个应用）。</li>
        <li>「稍后再说」会跳过该版本的启动提示，仍可随时手动检查。</li>
      </ul>
    ),
  },
  {
    id: "share",
    title: "局域网分享",
    body: (
      <ul>
        <li>桌面端开启分享后，同一 Wi-Fi 可用浏览器访问（端口 <strong>6535</strong>）。</li>
        <li>电脑与文档助手需保持开启；关闭分享或退出后链接失效。</li>
        <li>预览页含多级大纲与「在本页」目录；手机可用顶栏抽屉切换章节。</li>
        <li>Web 端仅能生成本机预览/下载 HTML，不能提供真局域网服务。</li>
      </ul>
    ),
  },
  {
    id: "export",
    title: "导出",
    body: (
      <ul>
        <li>范围：<strong>当前页</strong>（当前节点及子集）或 <strong>整个文档</strong>。</li>
        <li>格式：HTML（带导航预览页）、Markdown、Word（.docx）、PDF——均为 <strong>L3 交换格式</strong>，复杂排版/空格/样式可能有损。</li>
        <li>列表/大纲菜单可快捷「导出 HTML」。</li>
        <li>需要无损往返时请用顶栏 <strong>保存</strong> 写出 <code>.mdoc</code>，不要仅依赖导出。</li>
      </ul>
    ),
  },
  {
    id: "shortcuts",
    title: "常用快捷键",
    body: (
      <ul>
        <li><code>Ctrl/Cmd + S</code>：保存（写回原文件）</li>
        <li><code>Ctrl/Cmd + Shift + S</code>：另存为 .mdoc 并切换到新文件</li>
        <li><code>Ctrl/Cmd + K</code>：插入链接</li>
        <li><code>/</code>（行首）：斜杠命令</li>
        <li>Markdown 行首 + 空格：标题/列表/引用/代码块</li>
        <li><code>Esc</code> 或 <code>Ctrl/Cmd + Enter</code>：退出代码块</li>
      </ul>
    ),
  },
  {
    id: "faq",
    title: "常见问题",
    body: (
      <ul>
        <li><strong>macOS/Windows 提示未知开发者？</strong> 当前安装包未签名，请右键打开或允许仍要运行。</li>
        <li><strong>macOS 提示「已损坏，无法打开」？</strong> 多为下载隔离误报，不要移到废纸篓。终端执行：<code>xattr -cr "/Applications/文档助手.app"</code> 后再打开。</li>
        <li><strong>手机打不开分享链接？</strong> 确认桌面端已开启分享、同一 Wi-Fi、防火墙放行 6535、链接为局域网 IP。</li>
        <li><strong>预览缺章节？</strong> 节点可能为空或设置了「预览时隐藏本层」；请重新分享/导出。</li>
        <li><strong>浏览器存储失败？</strong> 媒体过大，请减少图片视频或改用桌面端并导出备份。</li>
        <li><strong>导入 md/docx 后样式或空格变了？</strong> 跨格式转换为「尽力而为」。未编辑再保存会原样写回；长期精编请另存 <code>.mdoc</code>。</li>
        <li><strong>如何更新软件？</strong> 启动会自动提示；也可在帮助页点「检查更新」。安装包来自 GitHub Releases。</li>
      </ul>
    ),
  },
];

export function HelpModal({
  onClose,
  onCheckUpdate,
  updateCheckBusy = false,
}: {
  onClose: () => void;
  onCheckUpdate?: () => void;
  updateCheckBusy?: boolean;
}) {
  const [version, setVersion] = useState("0.1.0");
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.getVersion) {
      api.getVersion().then((v: string) => v && setVersion(v)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[min(920px,94vw)] h-[min(720px,88vh)] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[24px] h-[56px] shrink-0 border-b border-[#ebecf0]">
          <div className="flex items-center gap-[10px] min-w-0">
            <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[normal]">使用帮助</p>
            <span className="text-[12px] text-[#8d8e99] font-['PingFang_SC:Regular',sans-serif] shrink-0">v{version}</span>
            {onCheckUpdate && (
              <button
                type="button"
                className="h-[28px] px-[10px] rounded-[6px] border border-[#ebecf0] text-[12px] text-[#131212] cursor-pointer hover:bg-[#EBECF0] active:bg-[#dddee3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-['PingFang_SC:Regular',sans-serif]"
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckUpdate();
                }}
                disabled={updateCheckBusy}
              >
                {updateCheckBusy ? "检查中..." : "检查更新"}
              </button>
            )}
          </div>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <aside className="w-[200px] shrink-0 border-r border-[#ebecf0] overflow-y-auto py-[12px] px-[10px] bg-[#fafbfc]">
            {SECTIONS.map((section) => {
              const selected = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveId(section.id)}
                  className={`w-full text-left rounded-[8px] px-[12px] py-[9px] text-[13px] mb-[2px] transition-colors cursor-pointer font-['PingFang_SC:Regular',sans-serif] ${
                    selected
                      ? "bg-[#eef0f5] text-[#131212] font-medium"
                      : "text-[#606266] hover:bg-[#f0f1f5]"
                  }`}
                >
                  {section.title}
                </button>
              );
            })}
          </aside>

          <main className="flex-1 min-w-0 overflow-y-auto px-[28px] py-[20px]">
            <h2 className="font-['PingFang_SC:Medium',sans-serif] text-[18px] text-[#131212] font-medium mb-[14px] leading-[1.4]">
              {active.title}
            </h2>
            <div className="help-body font-['PingFang_SC:Regular',sans-serif] text-[14px] text-[#303133] leading-[1.75]">
              {active.body}
            </div>
            <div className="mt-[28px] pt-[16px] border-t border-[#ebecf0] text-[12px] text-[#8d8e99] font-['PingFang_SC:Regular',sans-serif] leading-[1.6]">
              完整手册见仓库内 <code className="text-[#606266]">使用手册.md</code>
              {" · "}
              <a
                className="text-[#134CFF] hover:underline"
                href="https://github.com/wenlong301-hue/document-assistant/releases"
                target="_blank"
                rel="noreferrer"
              >
                下载安装包
              </a>
              {" · "}
              <a
                className="text-[#134CFF] hover:underline"
                href="https://github.com/wenlong301-hue/document-assistant/issues"
                target="_blank"
                rel="noreferrer"
              >
                问题反馈
              </a>
            </div>
          </main>
        </div>

        <style>{`
          .help-body p { margin: 0 0 10px; }
          .help-body ul, .help-body ol { margin: 0 0 10px; padding-left: 20px; }
          .help-body li { margin: 4px 0; }
          .help-body code {
            font-family: "SF Mono", Menlo, Monaco, Consolas, monospace;
            font-size: 12.5px;
            background: #f5f6f8;
            border: 1px solid #ebecf0;
            border-radius: 4px;
            padding: 0 5px;
            color: #303133;
          }
          .help-body strong { font-weight: 600; color: #131212; }
        `}</style>
      </div>
    </div>
  );
}
