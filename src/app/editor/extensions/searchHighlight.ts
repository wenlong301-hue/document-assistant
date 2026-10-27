// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type SearchHighlightState = {
  query: string;
  index: number;
  matches: Array<{ from: number; to: number }>;
};

export const searchHighlightKey = new PluginKey("docSearchHighlight");

const SKIP_TYPES = new Set(["codeBlock"]);

function collectMatches(doc: any, query: string): Array<{ from: number; to: number }> {
  const q = query.trim();
  if (!q) return [];
  const needle = q.toLowerCase();
  const matches: Array<{ from: number; to: number }> = [];
  doc.descendants((node: any, pos: number) => {
    if (SKIP_TYPES.has(node.type.name)) return false;
    if (!node.isText || !node.text) return;
    const hay = String(node.text).toLowerCase();
    let from = 0;
    while (from <= hay.length - needle.length) {
      const found = hay.indexOf(needle, from);
      if (found < 0) break;
      matches.push({ from: pos + found, to: pos + found + needle.length });
      from = found + Math.max(1, needle.length);
    }
  });
  return matches;
}

export const SearchHighlight = Extension.create({
  name: "searchHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchHighlightKey,
        state: {
          init: (): SearchHighlightState => ({ query: "", index: 0, matches: [] }),
          apply(tr, prev) {
            const meta = tr.getMeta(searchHighlightKey) as Partial<SearchHighlightState> | undefined;
            const query = meta && "query" in meta ? String(meta.query ?? "") : prev.query;
            const matches = !query ? [] : (tr.docChanged || (meta && "query" in meta) ? collectMatches(tr.doc, query) : prev.matches);
            let index = meta && typeof meta.index === "number" ? meta.index : prev.index;
            if (matches.length === 0) index = 0;
            else if (index >= matches.length) index = matches.length - 1;
            else if (index < 0) index = 0;
            return { query, index, matches };
          },
        },
        props: {
          decorations(state) {
            const data = searchHighlightKey.getState(state) as SearchHighlightState | undefined;
            if (!data?.matches?.length) return DecorationSet.empty;
            return DecorationSet.create(state.doc, data.matches.map((m, i) =>
              Decoration.inline(m.from, m.to, { class: i === data.index ? "doc-search-current" : "doc-search-hit" })
            ));
          },
        },
      }),
    ];
  },
});

export function getSearchState(editor: any): SearchHighlightState {
  return searchHighlightKey.getState(editor.state) || { query: "", index: 0, matches: [] };
}

export function setSearchQuery(editor: any, query: string, index = 0) {
  const { tr } = editor.state;
  editor.view.dispatch(tr.setMeta(searchHighlightKey, { query, index }));
}

export function setSearchIndex(editor: any, index: number) {
  const { tr } = editor.state;
  editor.view.dispatch(tr.setMeta(searchHighlightKey, { index }));
}

export function replaceCurrentMatch(editor: any, replacement: string) {
  const state = getSearchState(editor);
  const match = state.matches[state.index];
  if (!match) return false;
  const { from, to } = match;
  editor.chain().focus().insertContentAt({ from, to }, replacement || "").run();
  const nextIndex = state.index;
  setSearchQuery(editor, state.query, nextIndex);
  return true;
}

export function replaceAllMatches(editor: any, replacement: string) {
  const state = getSearchState(editor);
  if (!state.matches.length) return 0;
  const { tr } = editor.state;
  for (let i = state.matches.length - 1; i >= 0; i -= 1) {
    const m = state.matches[i];
    tr.insertText(replacement, m.from, m.to);
  }
  editor.view.dispatch(tr);
  setSearchQuery(editor, state.query, 0);
  return state.matches.length;
}
