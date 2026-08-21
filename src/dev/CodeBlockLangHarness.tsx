import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { MermaidCodeBlock } from "@/app/editor/extensions";

export default function CodeBlockLangHarness() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      MermaidCodeBlock,
    ],
    content: `
      <pre class="doc-code-block" data-language=""><code>console.log(1)</code></pre>
      <p></p>
      <pre class="doc-code-block" data-language="mermaid"><code>flowchart TB
    A["用户"] --> B["服务"]</code></pre>
      <p></p>
    `,
    editorProps: {
      attributes: {
        class: "doc-tiptap-content outline-none min-h-[320px] p-6",
      },
    },
  });

  return (
    <div className="min-h-screen bg-white p-8 font-[PingFang_SC,sans-serif]">
      <h1 className="text-[16px] mb-4 text-[#131212]">代码块 UI 四态测试</h1>
      <div className="border border-[#EBECF0] rounded-[8px] max-w-[860px]">
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .doc-tiptap-content .doc-code-block-wrap{margin:16px 0;position:relative;border:1px solid #E8E9EE;border-radius:8px;background:#F6F7FA;overflow:hidden;display:flex;flex-direction:column}
        .doc-tiptap-content .doc-code-block-wrap.is-lang-open{overflow:visible;z-index:30}
        .doc-tiptap-content .doc-code-block{position:relative;background:#F6F7FA;border:0;padding:16px;margin:0;font-size:16px;line-height:26px;color:#3F4046;white-space:pre-wrap}
        .doc-tiptap-content .doc-code-highlight{position:absolute;inset:0;padding:16px;pointer-events:none;white-space:pre-wrap;z-index:0}
        .doc-tiptap-content .doc-code-block>code{position:relative;z-index:1;display:block;background:transparent;outline:none}
        .doc-tiptap-content .doc-code-block-wrap.doc-diagram{border:1px solid #E8E9EE;border-radius:8px;overflow:hidden;background:#F6F7FA}
        .doc-tiptap-content .doc-diagram.is-preview{background:#fff;cursor:pointer}
        .doc-tiptap-content .doc-diagram-source-shell{display:block;width:100%;height:0;min-height:0;flex:0 0 auto;box-sizing:border-box;overflow:hidden}
        .doc-tiptap-content .doc-code-block-wrap:not(.doc-diagram) .doc-diagram-source-shell{height:auto;overflow:visible}
        .doc-tiptap-content .doc-diagram-source-inner{display:flex;flex-direction:column}
        .doc-tiptap-content .doc-diagram.is-source-open .doc-diagram-source-shell{height:auto}
        .doc-tiptap-content .doc-diagram.is-editing .doc-diagram-preview{border-top:0;background:#fff;padding:16px;min-height:120px;border-radius:0 0 8px 8px}
        .doc-tiptap-content .doc-diagram.is-preview .doc-diagram-preview{padding:16px;min-height:120px}
        .doc-tiptap-content .doc-diagram-expand-bar{display:flex;align-items:center;justify-content:center;gap:6px;height:0;max-height:0;opacity:0;width:100%;padding:0 12px;margin:0;border:0;border-bottom:0 solid #E8E9EE;background:#F6F7FA;color:#8D8E99;font-size:12px;font-family:PingFang SC,sans-serif;cursor:pointer;flex-shrink:0;box-sizing:border-box;overflow:hidden;pointer-events:none;transition:height .2s ease,max-height .2s ease,opacity .18s ease,border-bottom-width .2s ease}
        .doc-tiptap-content .doc-diagram.is-armed .doc-diagram-expand-bar{height:20px;max-height:20px;opacity:1;border-bottom-width:1px;pointer-events:auto}
        .doc-tiptap-content .doc-diagram.is-editing .doc-diagram-expand-bar{height:0;max-height:0;opacity:0;border-bottom-width:0;pointer-events:none}
        .doc-tiptap-content .doc-diagram-expand-bar:hover{background:#F5F6F8;color:#131212}
        .doc-tiptap-content .doc-diagram-expand-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%}
        .doc-tiptap-content .doc-diagram-expand-chevron{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid currentColor;flex-shrink:0}
        .doc-tiptap-content .doc-diagram-preview{overflow-x:auto;text-align:center;box-sizing:border-box;color:#8D8E99;font-size:13px;display:flex;align-items:center;justify-content:center}
        .doc-tiptap-content .doc-code-actionbar{display:none;position:relative;z-index:6;align-items:center;justify-content:flex-end;gap:12px;height:64px;padding:0 16px;background:#fff;border-top:1px solid #E8E9EE;flex-shrink:0;border-radius:0;overflow:visible}
        .doc-tiptap-content .doc-code-block-wrap.is-plain-editing .doc-code-actionbar{display:flex!important;justify-content:flex-end;border-top:1px solid #E8E9EE;border-radius:0 0 8px 8px}
        .doc-tiptap-content .doc-diagram.is-editing .doc-code-actionbar{display:flex!important;justify-content:flex-end;border-top:1px solid #E8E9EE;border-bottom:1px solid #E8E9EE;border-radius:0}
        .doc-tiptap-content .doc-code-lang{display:none;align-items:center;justify-content:flex-end;position:relative;z-index:8;overflow:visible}
        .doc-tiptap-content .doc-code-actionbar .doc-code-lang{display:flex!important}
        .doc-tiptap-content .doc-code-lang-trigger{width:120px;height:32px;padding:0 12px;border:1px solid #EBECF0;border-radius:8px;background:#fff;color:#131212;font-size:14px;outline:none;box-sizing:border-box;text-align:center;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
        .doc-tiptap-content .doc-code-lang-trigger.is-placeholder{color:#C0C4CC}
        .doc-tiptap-content .doc-code-delete-hint{display:none;position:absolute;top:16px;right:16px;z-index:4;width:44px;height:28px;padding:0;border-radius:4px;border:1px solid #E8E9EE;background:#fff;color:#131212;font-size:12px;cursor:pointer;align-items:center;justify-content:center;box-sizing:border-box}
        .doc-code-lang-portal{position:fixed;z-index:501;display:none}
        .doc-code-lang-portal .doc-code-lang-input{width:100%;height:100%;padding:0 12px;border:1px solid #131212;border-radius:8px;background:#fff;color:#131212;font-size:14px;outline:none;box-sizing:border-box;text-align:center;cursor:text}
        .doc-code-lang-menu{position:fixed;z-index:502;width:168px;max-height:260px;display:flex;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #EBECF0;border-radius:8px;box-shadow:0 12px 24px -8px rgba(36,36,36,0.14);padding:4px;box-sizing:border-box}
        .doc-code-lang-list{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column}
        .doc-code-lang-item{height:30px;padding:0 10px;border-radius:6px;display:flex;align-items:center;font-size:12px;color:#131212;cursor:pointer;font-family:ui-monospace,Menlo,monospace;flex-shrink:0}
        .doc-code-lang-item:hover{background:#F7F8FA}
        .doc-code-lang-item.is-active{background:#EBECF0;font-weight:500}
      `}</style>
    </div>
  );
}
