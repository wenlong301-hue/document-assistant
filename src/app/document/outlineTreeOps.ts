import type { OutlineNode } from "./types";

export function removeNodeById(nodes: OutlineNode[], id: string): [OutlineNode[], OutlineNode | null] {
  let found: OutlineNode | null = null;
  const filter = (arr: OutlineNode[]): OutlineNode[] =>
    arr.reduce<OutlineNode[]>((acc, n) => {
      if (n.id === id) { found = n; return acc; }
      return [...acc, { ...n, children: filter(n.children) }];
    }, []);
  return [filter(nodes), found];
}

export function insertNodeBefore(nodes: OutlineNode[], node: OutlineNode, targetId: string): OutlineNode[] {
  const insert = (arr: OutlineNode[]): [OutlineNode[], boolean] => {
    const idx = arr.findIndex(n => n.id === targetId);
    if (idx !== -1) { const next = [...arr]; next.splice(idx, 0, node); return [next, true]; }
    let found = false;
    const result = arr.map(n => {
      if (found) return n;
      const [children, f] = insert(n.children);
      if (f) { found = true; return { ...n, children }; }
      return n;
    });
    return [result, found];
  };
  return insert(nodes)[0];
}

export function insertNodeAfter(nodes: OutlineNode[], node: OutlineNode, targetId: string): OutlineNode[] {
  const insert = (arr: OutlineNode[]): [OutlineNode[], boolean] => {
    const idx = arr.findIndex(n => n.id === targetId);
    if (idx !== -1) { const next = [...arr]; next.splice(idx + 1, 0, node); return [next, true]; }
    let found = false;
    const result = arr.map(n => {
      if (found) return n;
      const [children, f] = insert(n.children);
      if (f) { found = true; return { ...n, children }; }
      return n;
    });
    return [result, found];
  };
  return insert(nodes)[0];
}

export function filterOutlineNodes(nodes: OutlineNode[], query: string): OutlineNode[] {
  const q = query.toLowerCase();
  const walk = (arr: OutlineNode[]): OutlineNode[] => {
    const out: OutlineNode[] = [];
    for (const n of arr) {
      const self = n.name.toLowerCase().includes(q);
      const children = walk(n.children);
      if (self || children.length > 0) out.push({ ...n, children });
    }
    return out;
  };
  return walk(nodes);
}
