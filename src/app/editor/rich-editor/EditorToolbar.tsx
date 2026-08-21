import React from "react";
import editorSvg from "../../../imports/首页大纲模式根节点未编写内容-1/svg-208e2u96ym";
import { EditorToolBtn } from "../ui/EditorToolBtn";
import { IconSvg } from "../ui/IconSvg";
import type { ToolbarPanel } from "./types";

export function EditorToolbar({
  toolbarRef,
  currentHeading,
  currentFont,
  currentSize,
  activeFormats,
  showAlignDropdown,
  isAlignActive,
  saveEditorSelection,
  toggleToolbarPanel,
  runEditorCommand,
  applyIndent,
  openLinkModal,
  openImagePicker,
  openVideoPicker,
  openAttachmentPicker,
  openTableDialog,
  copyAnchorLink,
  linkBtnRef,
}: {
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  currentHeading: string;
  currentFont: string;
  currentSize: string;
  activeFormats: Set<string>;
  showAlignDropdown: boolean;
  isAlignActive: boolean;
  saveEditorSelection: () => void;
  toggleToolbarPanel: (panel: Exclude<ToolbarPanel, null>, pos?: { x: number; y: number }) => void;
  runEditorCommand: (command: (activeEditor: any) => boolean | void) => boolean;
  applyIndent: (dir: 1 | -1) => void;
  openLinkModal: (e: React.MouseEvent<HTMLButtonElement>) => void;
  openImagePicker: () => void;
  openVideoPicker: () => void;
  openAttachmentPicker: () => void;
  openTableDialog: () => void;
  copyAnchorLink: () => void;
  linkBtnRef: React.MutableRefObject<HTMLButtonElement | null>;
}) {
  const Btn = ({ label, cmd, action, children, getBtnRef }: { label: string; cmd?: string; action?: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode; getBtnRef?: (el: HTMLButtonElement | null) => void }) => (
    <EditorToolBtn
      label={label}
      cmd={cmd}
      activeFormats={activeFormats}
      action={(e) => {
        saveEditorSelection();
        action?.(e);
      }}
      getBtnRef={getBtnRef}
    >{children}</EditorToolBtn>
  );

  return (
    <div ref={toolbarRef} className="doc-editor-toolbar relative z-[260] isolate flex h-[62px] items-center gap-[24px] pl-[24px] pr-[40px] border-b border-[#EBECF0] bg-white flex-shrink-0 overflow-x-auto overscroll-x-contain box-border">
      <button type="button" className="relative flex h-[24px] items-center gap-[8px] px-[4px] rounded-[4px] shrink-0 cursor-pointer select-none bg-transparent border-0 hover:bg-[#EBECF0] transition-colors"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          toggleToolbarPanel("heading", { x: r.left, y: r.bottom + 4 });
        }}>
        <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] leading-[24px] w-[56px] truncate">{currentHeading}</p>
        <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
      </button>
      <button type="button" className="relative flex h-[24px] items-center gap-[8px] px-[4px] rounded-[4px] shrink-0 cursor-pointer select-none bg-transparent border-0 hover:bg-[#EBECF0] transition-colors"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          toggleToolbarPanel("font", { x: r.left, y: r.bottom + 4 });
        }}>
        <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] leading-[24px] w-[56px] truncate">{currentFont}</p>
        <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
      </button>
      <button type="button" className="relative flex h-[24px] items-center gap-[8px] px-[4px] rounded-[4px] shrink-0 cursor-pointer select-none bg-transparent border-0 hover:bg-[#EBECF0] transition-colors"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          toggleToolbarPanel("size", { x: r.left, y: r.bottom + 4 });
        }}>
        <p className="font-['PingFang_SC:Regular',sans-serif] text-[#131212] text-[14px] leading-[24px] w-[46px] truncate">{currentSize}</p>
        <svg className="block size-[12px] shrink-0" fill="none" viewBox="0 0 12 12"><path d="M3.5 5L6.00041 7.29L8.5 5" stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/></svg>
      </button>
      <Btn label="加粗" cmd="bold" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBold().run())}><IconSvg path={editorSvg.p3290fd80} /></Btn>
      <Btn label="斜体" cmd="italic" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleItalic().run())}><IconSvg path={editorSvg.p3837edc0} /></Btn>
      <Btn label="删除线" cmd="strikeThrough" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleStrike().run())}><IconSvg path={editorSvg.p2ae8080} /></Btn>
      <Btn label="下划线" cmd="underline" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleUnderline().run())}><IconSvg path={editorSvg.pc604cd0} /></Btn>
      <Btn label="字体颜色" action={(e) => {
        saveEditorSelection();
        const r = e.currentTarget.getBoundingClientRect();
        toggleToolbarPanel("fore", { x: r.left, y: r.bottom + 4 });
      }}><IconSvg path={[editorSvg.peaacc00, "M4 17H16"]} stroke="#131212" /></Btn>
      <Btn label="背景颜色" action={(e) => {
        saveEditorSelection();
        const r = e.currentTarget.getBoundingClientRect();
        toggleToolbarPanel("back", { x: r.left, y: r.bottom + 4 });
      }}>
        <div className="absolute left-[2px] size-[20px] top-[2px]"><svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 20 20"><rect fill="#FEF0F0" height="20" rx="4" width="20"/><path d={editorSvg.p16c26880} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" /></svg></div>
      </Btn>
      <Btn label="任务列表" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleTaskList().run())}><IconSvg path={editorSvg.p30909380} /></Btn>
      <Btn label="有序列表" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleOrderedList().run())}><IconSvg path={editorSvg.p31fc8400} /></Btn>
      <Btn label="无序列表" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBulletList().run())}><IconSvg path={editorSvg.p1ddeb0c0} /></Btn>
      <Btn label="减少缩进" action={() => applyIndent(-1)}><IconSvg path={editorSvg.p3244ee00} /></Btn>
      <Btn label="增加缩进" action={() => applyIndent(1)}><IconSvg path={editorSvg.p25bdc300} /></Btn>
      <button type="button" className={`relative size-[24px] rounded-[4px] inline-flex items-center justify-center shrink-0 cursor-pointer select-none border-0 p-0 transition-colors hover:bg-[#EBECF0] active:bg-[#EBECF0] ${showAlignDropdown || isAlignActive ? "bg-[#EBECF0]" : "bg-transparent"}`}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); saveEditorSelection(); }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          saveEditorSelection();
          const r = e.currentTarget.getBoundingClientRect();
          toggleToolbarPanel("align", { x: r.left, y: r.bottom + 4 });
        }}>
        <IconSvg path={editorSvg.p2c9c5c80} />
      </button>
      <Btn label="引用块" cmd="blockquote" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleBlockquote().run())}><IconSvg path={[editorSvg.p339d6600, editorSvg.p3a810c00, editorSvg.p27c3d000, editorSvg.p2e7ee0c0]} isFill /></Btn>
      <Btn label="代码块" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().toggleCodeBlock().run())}><IconSvg path={editorSvg.p36d5aa00} /></Btn>
      <Btn label="插入链接" cmd="link" action={openLinkModal} getBtnRef={(el) => { linkBtnRef.current = el; }}><IconSvg path={editorSvg.pda5c3c0} /></Btn>
      <Btn label="清除链接" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().unsetLink().run())}><IconSvg path={editorSvg.p3418c200} /></Btn>
      <Btn label="插入图片" action={openImagePicker}><IconSvg path={editorSvg.p2a7b5cf0} isFill fill="#131212" /></Btn>
      <Btn label="插入视频" action={openVideoPicker}><IconSvg path={editorSvg.p1a4aa900} /></Btn>
      <Btn label="清除格式" action={() => runEditorCommand((activeEditor) => activeEditor.chain().focus().unsetAllMarks().clearNodes().run())}><IconSvg path={editorSvg.p3e282b00} stroke="#131212" /></Btn>
      <Btn label="附件" action={openAttachmentPicker}><IconSvg path={editorSvg.p149b2100} /></Btn>
      <Btn label="表格" action={openTableDialog}><IconSvg path={editorSvg.p808b680} /></Btn>
      <Btn label="复制锚点链接" action={() => { void copyAnchorLink(); }}><IconSvg path={editorSvg.pda5c3c0} /></Btn>
    </div>
  );
}
