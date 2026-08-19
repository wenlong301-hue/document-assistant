/**
 * 文档正文排版 — 单一真相源（对齐 TipTap 编辑器 .doc-tiptap-content）
 * 用于：应用内预览 (.prose-preview)、分享/导出 HTML (.content)
 * 编辑器专属交互样式（选区、列宽拖拽等）仍留在 RichEditorTiptap。
 */
export const docContentCss = (prefix: string): string => {
  const p = prefix;
  return [
    /* 标题 / 段落 */
    `${p} p{margin:0 0 10px;color:inherit}`,
    `${p} h1{font-size:28px;line-height:1.45;margin:18px 0 12px;font-weight:700;color:#131212}`,
    `${p} h2{font-size:24px;line-height:1.45;margin:16px 0 10px;font-weight:700;color:#131212}`,
    `${p} h3{font-size:20px;line-height:1.5;margin:14px 0 8px;font-weight:650;color:#131212}`,
    `${p} h4,${p} h5,${p} h6{font-size:17px;line-height:1.55;margin:12px 0 8px;font-weight:650;color:#131212}`,
    `${p}>:first-child{margin-top:0}`,
    `${p} a{color:#134CFF;text-decoration:underline;text-underline-offset:2px}`,
    `${p} a.doc-link{color:#134CFF;text-decoration:underline}`,

    /* 列表（兼容 class 与裸标签） */
    `${p} ul,${p} ol,${p} .doc-list{margin:8px 0 10px;padding-left:28px}`,
    `${p} .doc-ordered-list,${p} ol{list-style:decimal}`,
    `${p} .doc-ordered-list .doc-ordered-list,${p} ol ol{list-style:lower-alpha}`,
    `${p} .doc-ordered-list .doc-ordered-list .doc-ordered-list,${p} ol ol ol{list-style:lower-roman}`,
    `${p} .doc-bullet-list,${p} ul:not([data-type="taskList"]):not(.doc-task-list){list-style:disc}`,
    `${p} .doc-bullet-list .doc-bullet-list,${p} ul ul{list-style:circle}`,
    `${p} .doc-bullet-list .doc-bullet-list .doc-bullet-list,${p} ul ul ul{list-style:square}`,
    `${p} li{margin:4px 0;padding-left:2px}`,
    `${p} li>p{margin:0}`,

    /* 任务列表 */
    `${p} ul[data-type="taskList"],${p} ul.doc-task-list,${p} .doc-task-list{list-style:none;padding-left:0;margin:8px 0 10px}`,
    `${p} li[data-type="taskItem"],${p} li.doc-task-item,${p} .doc-task-item{list-style:none;display:flex;gap:8px;align-items:flex-start;margin:4px 0;padding-left:0}`,
    `${p} li[data-type="taskItem"]>label,${p} li.doc-task-item>label,${p} .doc-task-item>label{margin-top:2px;flex-shrink:0}`,
    `${p} li[data-type="taskItem"]>div,${p} li.doc-task-item>div,${p} .doc-task-item>div{flex:1;min-width:0}`,
    `${p} li[data-type="taskItem"]>div>p,${p} li.doc-task-item>div>p{margin:0}`,
    `${p} [data-task-item="true"]{display:flex;align-items:flex-start;gap:8px;margin:4px 0;list-style:none}`,

    /* 引用：仅左侧线条，无背景 */
    `${p} blockquote,${p} .doc-blockquote{border-left:3px solid #EBECF0;background:transparent;margin:6px 0;padding:2px 12px;color:#606266;border-radius:0}`,
    `${p} blockquote p,${p} .doc-blockquote p{margin:0;line-height:1.8}`,
    `${p} blockquote p:last-child,${p} .doc-blockquote p:last-child{margin-bottom:0}`,

    /* 代码 */
    `${p} pre,${p} .doc-code-block{background:#f5f6f8;border:1px solid #ebecf0;border-radius:8px;padding:12px 14px;margin:12px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.65;white-space:pre-wrap;overflow-x:auto;position:relative}`,
    `${p} pre code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.65}`,

    /* 表格（对齐编辑器；裸 table 自带外间距，.tableWrapper 内 table 无外间距） */
    `${p} .tableWrapper{display:block;margin:14px 0;max-width:100%;overflow-x:auto;overflow-y:hidden;padding:2px 0 8px}`,
    `${p} .tableWrapper table,${p} table.doc-table,${p} table{border:1px solid #EEF0F5;border-collapse:collapse;border-spacing:0;display:table;margin:14px 0;max-width:none;overflow:visible;table-layout:fixed;width:100%}`,
    `${p} .tableWrapper table{margin:0}`,
    `${p} table td,${p} table th,${p} .doc-table td,${p} .doc-table th{border:1px solid #EEF0F5;box-sizing:border-box;min-width:96px;padding:7px 9px;position:relative;vertical-align:top;font-size:14px}`,
    `${p} table th,${p} .doc-table th{background:#f7f8fa;color:#131212;font-weight:600;text-align:left}`,
    `${p} table tr:nth-child(odd) td,${p} .doc-table tr:nth-child(odd) td{background:rgba(238,240,245,0.502)}`,
    `${p} table td>*,${p} table th>*,${p} .doc-table td>*,${p} .doc-table th>*{margin-bottom:0!important}`,
    `${p} table td p,${p} table th p{line-height:1.6;margin:0;min-height:20px}`,

    /* 媒体 / 附件 / 分隔线 */
    `${p} img,${p} video{max-width:100%;height:auto}`,
    `${p} img,${p} .doc-image{display:block;max-width:100%;height:auto;margin:0;border-radius:8px}`,
    `${p} .doc-video,${p} video{display:block;max-width:100%;margin:12px 0;border-radius:8px;background:#000}`,
    `${p} .doc-attachment{align-items:center;background:#f7f8fa;border:1px solid #ebecf0;border-radius:8px;color:#303133;display:flex;font-size:13px;margin:12px 0;max-width:520px;min-height:42px;padding:10px 12px;text-decoration:none}`,
    `${p} .doc-attachment:hover{border-color:#cfd4df;background:#f2f4f7}`,
    `${p} hr{border:none;border-top:1px solid #ebecf0;margin:24px 0}`,

    /* Mermaid */
    `${p} .mermaid-diagram{margin:16px 0;padding:12px;background:#fff;border:1px solid #ebecf0;border-radius:8px;overflow-x:auto;text-align:center}`,
    `${p} .mermaid-diagram svg{max-width:100%;height:auto;display:block;margin:0 auto}`,
    `${p} .mermaid-error{border-color:#FF4D4F}`,
    `${p} .mermaid-error-msg{color:#E53E3E;font-size:12px;margin:8px 0 0}`,
  ].join("");
};

/** 分享页移动端：字号略收，间距仍跟编辑器节奏，避免桌面修好后手机仍松 */
export const docContentCssMobile = (prefix: string): string => {
  const p = prefix;
  return [
    `${p} h1{font-size:24px;margin:14px 0 10px}`,
    `${p} h2{font-size:20px;margin:14px 0 8px}`,
    `${p} h3{font-size:18px;margin:12px 0 8px}`,
    `${p} h4,${p} h5,${p} h6{font-size:16px;margin:12px 0 8px}`,
    `${p} p,${p} li{font-size:15px;line-height:1.75}`,
  ].join("");
};
