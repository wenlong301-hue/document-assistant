import { generateJSON, getSchema } from "@tiptap/core";
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProsemirrorJSON } from "@tiptap/y-tiptap";
import type { Schema } from "@tiptap/pm/model";
import type { Extensions } from "@tiptap/core";
import * as Y from "yjs";
import { createEditorExtensions } from "@/app/editor/rich-editor/extensions";
import { emptyParagraph, normalizeEditorHtml } from "@/app/editor/utils/html";
import type { DocContentMap } from "@/app/document/types";
import { fragmentFieldFor } from "./ydocBind";

let cachedExtensions: Extensions | null = null;
let cachedSchema: Schema | null = null;

function getCollabExtensions() {
  if (!cachedExtensions) cachedExtensions = createEditorExtensions(null) as Extensions;
  return cachedExtensions;
}

function getCollabSchema() {
  if (!cachedSchema) cachedSchema = getSchema(getCollabExtensions());
  return cachedSchema;
}

function isEmptyDocJson(json: unknown) {
  const content = json && typeof json === "object" ? (json as { content?: unknown }).content : null;
  if (!Array.isArray(content) || content.length === 0) return true;
  if (content.length !== 1) return false;
  const node = content[0] && typeof content[0] === "object" ? content[0] as { type?: string; content?: unknown } : {};
  return node.type === "paragraph" && (!node.content || (Array.isArray(node.content) && node.content.length === 0));
}

export function isCollabFragmentVisuallyEmpty(fragment: Y.XmlFragment) {
  if (fragment.length === 0) return true;
  try {
    return isEmptyDocJson(yXmlFragmentToProsemirrorJSON(fragment));
  } catch {
    return fragment.length === 0;
  }
}

export function seedCollabXmlFragments(ydoc: Y.Doc, content: DocContentMap) {
  const extensions = getCollabExtensions();
  const schema = getCollabSchema();
  ydoc.transact(() => {
    Object.entries(content || {}).forEach(([id, html]) => {
      if (!id || typeof html !== "string") return;
      const fragment = ydoc.getXmlFragment(fragmentFieldFor(id));
      if (!isCollabFragmentVisuallyEmpty(fragment)) return;
      const normalized = normalizeEditorHtml(html);
      if (normalized === emptyParagraph) return;
      try {
        const json = generateJSON(normalized, extensions);
        if (isEmptyDocJson(json)) return;
        if (fragment.length > 0) fragment.delete(0, fragment.length);
        prosemirrorJSONToYXmlFragment(schema, json, fragment);
      } catch (error) {
        console.error("seed collab fragment failed:", id, error);
      }
    });
  }, "local-seed");
}
