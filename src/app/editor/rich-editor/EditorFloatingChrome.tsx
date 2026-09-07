// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import React from "react";
import { FONT_FAMILIES, FONT_SIZES, HEADING_OPTIONS, normalizeHexColor } from "../constants";
import { InsertTableModal, TableFloatBar, TableRowResizeHandles } from "./EditorTableOverlays";
import { EditorImageToolbar } from "./EditorImageToolbar";
import { EditorSlashMenu } from "./EditorSlashMenu";
import { ColorPicker } from "../ui/ColorPicker";
import { Dropdown } from "../ui/Dropdown";
import { LinkModal } from "../ui/LinkModal";

export function EditorFloatingChrome(props: any) {
  const {
    editor, toolbarRef, editorInstanceRef,
    showColorPicker, colorPickerPos, setShowColorPicker, runEditorCommand,
    showHeadingDropdown, headingDropPos, setShowHeadingDropdown,
    showFontDropdown, fontDropPos, setShowFontDropdown,
    showSizeDropdown, sizeDropPos, setShowSizeDropdown,
    showAlignDropdown, alignDropPos, setShowAlignDropdown, applyTextAlign,
    showLinkModal, linkModalPos, linkModalText, linkModalUrl, linkModalMode, linkBtnRef, setShowLinkModal, applyLink,
    showTableModal, tableRows, tableCols, setTableRows, setTableCols, setShowTableModal, insertTable,
    showTableToolbar, tableToolbarPos, tableAlignActive, runTableCommand, applyTableAlign,
    tableRowHandles, activeRowResizeIndex, startTableRowResize,
    selectedImgRect, editorVisibleRect, imageCustomPct, setImageCustomPct,
    imageRatioLocked, setImageRatioLocked, imgBarSlider, setImgBarSlider,
    selectedImagePosRef, setSelectedImgRect, updateImageToolbar, applySelectedImageWidth,
    onImagePreview,
    slashMenu, slashMenuElRef, slashItems, slashActive, slashPressIdx,
    setSlashActive, setSlashPressIdx, runSlashAction, runSlashFileAction,
  } = props;

  return (
    <>
    {showColorPicker && (
      <ColorPicker
        mode={showColorPicker}
        currentColor={
          showColorPicker === "fore"
            ? normalizeHexColor(editor?.getAttributes("textStyle")?.color, "#000000")
            : normalizeHexColor(editor?.getAttributes("textStyle")?.backgroundColor, "#fef0f0")
        }
        onSelect={(color) => {
          runEditorCommand((activeEditor) => (
            showColorPicker === "fore"
              ? activeEditor.chain().focus().setColor(color).run()
              : activeEditor.chain().focus().setBackgroundColor(color).run()
          ));
        }}
        onClose={() => setShowColorPicker(null)}
        position={colorPickerPos}
      />
    )}
    {showHeadingDropdown && (
      <Dropdown items={HEADING_OPTIONS} position={headingDropPos} onSelect={(v) => {
        const idx = HEADING_OPTIONS.indexOf(v);
        runEditorCommand((activeEditor) => idx === 0
          ? activeEditor.chain().focus().setParagraph().run()
          : activeEditor.chain().focus().toggleHeading({ level: idx as 1 | 2 | 3 | 4 | 5 }).run());
      }} onClose={() => setShowHeadingDropdown(false)} />
    )}
    {showFontDropdown && (
      <Dropdown items={FONT_FAMILIES} position={fontDropPos} onSelect={(v) => runEditorCommand((activeEditor) => v === "系统默认" ? activeEditor.chain().focus().unsetFontFamily().run() : activeEditor.chain().focus().setFontFamily(v).run())} onClose={() => setShowFontDropdown(false)} />
    )}
    {showSizeDropdown && (
      <Dropdown items={FONT_SIZES} position={sizeDropPos} onSelect={(v) => runEditorCommand((activeEditor) => activeEditor.chain().focus().setFontSize(v).run())} onClose={() => setShowSizeDropdown(false)} />
    )}
    {showAlignDropdown && (
      <Dropdown
        items={["左对齐", "居中对齐", "右对齐", "两端对齐"]}
        position={alignDropPos}
        onSelect={(v) => applyTextAlign(v === "左对齐" ? "left" : v === "居中对齐" ? "center" : v === "右对齐" ? "right" : "justify")}
        onClose={() => setShowAlignDropdown(false)}
      />
    )}
    {showLinkModal && <LinkModal position={linkModalPos} initialText={linkModalText} initialUrl={linkModalUrl} mode={linkModalMode} triggerRef={linkBtnRef} onClose={() => setShowLinkModal(false)} onConfirm={applyLink} />}
    {showTableModal && (
      <InsertTableModal
        tableRows={tableRows}
        tableCols={tableCols}
        setTableRows={setTableRows}
        setTableCols={setTableCols}
        onClose={() => setShowTableModal(false)}
        onInsert={insertTable}
      />
    )}
    {showTableToolbar && (
      <TableFloatBar
        tableToolbarPos={tableToolbarPos}
        tableAlignActive={tableAlignActive}
        runTableCommand={runTableCommand}
        applyTableAlign={applyTableAlign}
      />
    )}
    {showTableToolbar && (
      <TableRowResizeHandles
        tableRowHandles={tableRowHandles}
        activeRowResizeIndex={activeRowResizeIndex}
        onStartResize={startTableRowResize}
      />
    )}
    {selectedImgRect && editorVisibleRect && (
      <EditorImageToolbar
        selectedImgRect={selectedImgRect}
        editorVisibleRect={editorVisibleRect}
        toolbarRef={toolbarRef}
        imageCustomPct={imageCustomPct}
        setImageCustomPct={setImageCustomPct}
        imageRatioLocked={imageRatioLocked}
        setImageRatioLocked={setImageRatioLocked}
        imgBarSlider={imgBarSlider}
        applySelectedImageWidth={applySelectedImageWidth}
        editorInstanceRef={editorInstanceRef}
        selectedImagePosRef={selectedImagePosRef}
        setImgBarSlider={setImgBarSlider}
        setSelectedImgRect={setSelectedImgRect}
        updateImageToolbar={updateImageToolbar}
        onPreview={onImagePreview}
      />
    )}
    {slashMenu && (
      <EditorSlashMenu
        slashMenu={slashMenu}
        slashMenuElRef={slashMenuElRef}
        slashItems={slashItems}
        slashActive={slashActive}
        slashPressIdx={slashPressIdx}
        setSlashActive={setSlashActive}
        setSlashPressIdx={setSlashPressIdx}
        runSlashAction={runSlashAction}
        runSlashFileAction={runSlashFileAction}
      />
    )}
    </>
  );
}
