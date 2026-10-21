// figma-audit — read-only design-system audit of one Figma page (or one node).
//
// How to run: paste this whole file as the `code` of a Figma MCP `use_figma`
// call (fileKey = the file being audited). Edit CONFIG first. One page per
// call: to audit several pages, run it once per page, in parallel.
// It also runs in any plugin console that supports top-level await.
//
// It changes nothing. It returns a JSON summary with counts and capped
// samples (node id + name), so every finding can be opened in Figma.
//
// What it checks (the Ready-for-AI criteria, applied file-wide):
//   1. Detached instances          — frames that were once instances
//   2. Colours not bound           — solid fills/strokes with no variable and no style
//   3. Text with no text style     — text nodes with no style and no bound font size
//   4. Spacing not bound           — auto-layout padding / gap with a fixed value
//   5. Radius not bound            — corner radius with a fixed value
//   6. Property names              — "Property 1", "Option A" and other Figma defaults
//   7. Descriptions                — components / sets with an empty description
//   8. Focus state                 — interactive-looking component sets with no focus variant
//   9. Mode pins on fill-less layers — a variable mode set on something that draws no background
//  10. Instance overrides          — instances whose fills/strokes were overridden
//  11. Role mismatches             — e.g. a stroke bound to a text-colour variable
// Plus an inventory: variable collections (with a primitive / semantic
// guess per collection), local styles, and library vs local component use.
//
// What it can't see: whether a bound variable is the *right* one, contrast
// (use scripts/contrast.mjs on resolved values), anything visual.

const CONFIG = {
  pageName: '<page name, or null for the first page>',
  nodeId: null, // e.g. '123:456' to audit one frame or component set instead of a page
  sampleLimit: 15, // samples returned per check
  skipInsideInstances: true, // instance internals belong to their main component
  includeVariables: true, // inventory of variable collections (file-wide)
  // Which variable-name prefixes are allowed on which property. Adjust to the
  // file's own naming. A binding whose prefix isn't allowed is a role mismatch.
  roleRules: {
    strokes: /^(border|stroke|outline|state|focus|divider)/i,
    textFills: /^(text|content|foreground|fg|on-|state|link|icon)/i,
  },
  interactivePattern: /button|input|select|checkbox|radio|switch|toggle|tab|link|field|textarea|slider|chip/i,
  defaultNamePattern: /^(property|variant|option|value)\s*(\d+|[a-z])$/i, // "Property 1", "Option A"
};

// ---------------------------------------------------------------------------

const pages = figma.root.children;
let root;
if (CONFIG.nodeId) {
  root = await figma.getNodeByIdAsync(CONFIG.nodeId);
  if (!root) throw new Error(`Node ${CONFIG.nodeId} not found`);
  let p = root;
  while (p && p.type !== 'PAGE') p = p.parent;
  if (p) await figma.setCurrentPageAsync(p);
} else {
  const want = CONFIG.pageName && !CONFIG.pageName.startsWith('<') ? CONFIG.pageName : null;
  const page = want ? pages.find((p) => p.name === want) : pages[0];
  if (!page) throw new Error(`Page "${want}" not found. Pages: ${pages.map((p) => p.name).join(', ')}`);
  await figma.setCurrentPageAsync(page);
  root = page;
}

const checks = {};
const add = (check, node, detail) => {
  const c = (checks[check] = checks[check] || { count: 0, samples: [] });
  c.count++;
  if (c.samples.length < CONFIG.sampleLimit) {
    c.samples.push({ id: node.id, name: node.name, parent: node.parent ? node.parent.name : null, ...(detail ? { detail } : {}) });
  }
};

const insideInstance = (n) => {
  for (let p = n.parent; p && p.type !== 'PAGE'; p = p.parent) if (p.type === 'INSTANCE') return true;
  return false;
};

const visibleSolid = (paints) =>
  Array.isArray(paints) ? paints.filter((p) => p.type === 'SOLID' && p.visible !== false && (p.opacity ?? 1) > 0) : [];

const nodes = 'findAll' in root ? root.findAll(() => true) : [];
if (root.type !== 'PAGE') nodes.unshift(root);

const boundIds = new Map(); // variableId -> [{ node, field }]
const noteBinding = (alias, node, field) => {
  if (!alias || !alias.id) return;
  const list = boundIds.get(alias.id) || [];
  if (list.length < 50) list.push({ node, field });
  boundIds.set(alias.id, list);
};

let scanned = 0;
const instanceCounts = { library: 0, local: 0, unknown: 0 };
const instances = [];

for (const node of nodes) {
  if (CONFIG.skipInsideInstances && insideInstance(node)) continue;
  scanned++;

  // 1. Detached
  if ('detachedInfo' in node && node.detachedInfo) add('detachedInstances', node, node.detachedInfo.type);

  // 2. Colours
  for (const field of ['fills', 'strokes']) {
    if (!(field in node) || node[field] === figma.mixed) continue;
    const styleId = field === 'fills' ? node.fillStyleId : node.strokeStyleId;
    if (styleId && styleId !== figma.mixed) continue;
    for (const paint of visibleSolid(node[field])) {
      const bound = paint.boundVariables && paint.boundVariables.color;
      if (bound) {
        noteBinding(bound, node, node.type === 'TEXT' && field === 'fills' ? 'textFills' : field);
      } else if (!(field === 'strokes' && (!(node.strokeWeight > 0) || node.type === 'COMPONENT_SET'))) { // a set's purple outline is Figma's, not the design's
        const { r, g, b } = paint.color;
        const hex = '#' + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
        add(field === 'fills' ? 'unboundFills' : 'unboundStrokes', node, hex);
      }
    }
  }

  // 3. Text styles
  if (node.type === 'TEXT') {
    const bv = node.boundVariables || {};
    if (node.textStyleId === figma.mixed) add('textMixedStyles', node);
    else if (!node.textStyleId && !bv.fontSize) add('textWithoutStyle', node, `${node.fontSize === figma.mixed ? 'mixed' : node.fontSize}px`);
  }

  // 4. Spacing (auto-layout only)
  if ('layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE') {
    const bv = node.boundVariables || {};
    const unbound = [];
    for (const f of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) {
      if (node[f] > 0 && !bv[f]) unbound.push(`${f} ${node[f]}`);
    }
    const kids = 'children' in node ? node.children.filter((c) => c.visible !== false).length : 0;
    if (kids >= 2 && node.itemSpacing > 0 && !bv.itemSpacing && node.primaryAxisAlignItems !== 'SPACE_BETWEEN') {
      unbound.push(`gap ${node.itemSpacing}`);
    }
    if (unbound.length) add('unboundSpacing', node, unbound.join(', '));
  }

  // 5. Radius
  if ('cornerRadius' in node && node.type !== 'TEXT') {
    const bv = node.boundVariables || {};
    const anyBound = bv.cornerRadius || bv.topLeftRadius || bv.topRightRadius || bv.bottomLeftRadius || bv.bottomRightRadius;
    const r = node.cornerRadius;
    if (!anyBound && (r === figma.mixed || r > 0)) add('unboundRadius', node, r === figma.mixed ? 'mixed' : r);
  }

  // 9. Mode pins on fill-less layers
  const pins = node.explicitVariableModes ? Object.keys(node.explicitVariableModes) : [];
  if (pins.length && node.type !== 'PAGE') {
    const drawsBackground = 'fills' in node && node.fills !== figma.mixed && visibleSolid(node.fills).length + (node.fills || []).filter((p) => p.type !== 'SOLID' && p.visible !== false).length > 0;
    if (!drawsBackground && node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') add('modePinWithoutFill', node, `${pins.length} collection(s)`);
  }

  // 6–8. Components
  if (node.type === 'COMPONENT_SET' || (node.type === 'COMPONENT' && (!node.parent || node.parent.type !== 'COMPONENT_SET'))) {
    if (!node.description || !node.description.trim() || node.description.trim().toLowerCase() === node.name.toLowerCase()) {
      add('componentWithoutDescription', node);
    }
    const defs = node.componentPropertyDefinitions || {};
    const bad = [];
    const variantValues = [];
    for (const [key, def] of Object.entries(defs)) {
      const name = key.split('#')[0];
      if (CONFIG.defaultNamePattern.test(name)) bad.push(`property "${name}"`);
      if (def.type === 'VARIANT') {
        for (const v of def.variantOptions || []) {
          variantValues.push(v);
          if (CONFIG.defaultNamePattern.test(v)) bad.push(`value "${v}"`);
        }
      }
    }
    if (bad.length) add('defaultPropertyNames', node, bad.slice(0, 5).join(', '));
    if (node.type === 'COMPONENT_SET' && CONFIG.interactivePattern.test(node.name) && !variantValues.some((v) => /focus/i.test(v))) {
      add('interactiveWithoutFocusState', node);
    }
  }

  // 10. Instances
  if (node.type === 'INSTANCE') {
    instances.push(node);
    const overridden = (node.overrides || []).filter((o) => o.overriddenFields.some((f) => ['fills', 'strokes', 'fillStyleId', 'strokeStyleId'].includes(f)));
    if (overridden.length) add('instancePaintOverrides', node, `${overridden.length} layer(s)`);
  }
}

// Library vs local components in use (capped so big pages stay fast).
for (const inst of instances.slice(0, 1500)) {
  try {
    const main = await inst.getMainComponentAsync();
    if (!main) instanceCounts.unknown++;
    else if (main.remote) instanceCounts.library++;
    else instanceCounts.local++;
  } catch (e) {
    instanceCounts.unknown++;
  }
}

// 11. Role mismatches on bound variables
const variableNames = {};
for (const id of boundIds.keys()) {
  const v = await figma.variables.getVariableByIdAsync(id);
  variableNames[id] = v ? v.name : null;
}
for (const [id, uses] of boundIds) {
  const name = variableNames[id];
  if (!name) continue;
  for (const { node, field } of uses) {
    const rule = CONFIG.roleRules[field];
    if (rule && !rule.test(name)) add('roleMismatch', node, `${field} bound to ${name}`);
  }
}

// Inventory: variables and styles (file-wide)
let variables = null;
if (CONFIG.includeVariables) {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  variables = [];
  for (const c of collections) {
    let aliased = 0, raw = 0;
    const types = {};
    for (const id of c.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (!v) continue;
      types[v.resolvedType] = (types[v.resolvedType] || 0) + 1;
      const first = v.valuesByMode[c.modes[0].modeId];
      if (first && typeof first === 'object' && first.type === 'VARIABLE_ALIAS') aliased++;
      else raw++;
    }
    variables.push({
      collection: c.name,
      modes: c.modes.map((m) => m.name),
      variables: c.variableIds.length,
      types,
      aliasedToOtherVariables: aliased,
      rawValues: raw,
      layerGuess: aliased === 0 ? 'primitive (raw values)' : raw === 0 ? 'semantic or component (all aliases)' : aliased > raw ? `semantic, with ${raw} raw value(s) — check them` : 'mixed — check',
      hiddenFromPublishing: c.hiddenFromPublishing,
    });
  }
}
const styles = {
  paint: (await figma.getLocalPaintStylesAsync()).length,
  text: (await figma.getLocalTextStylesAsync()).length,
  effect: (await figma.getLocalEffectStylesAsync()).length,
};

return {
  scope: root.type === 'PAGE' ? `page "${root.name}"` : `${root.type} "${root.name}" (${root.id})`,
  pages: pages.map((p) => ({ id: p.id, name: p.name })),
  nodesScanned: scanned,
  findings: Object.fromEntries(Object.entries(checks).sort((a, b) => b[1].count - a[1].count)),
  componentUse: { instances: instances.length, ...instanceCounts, note: instances.length > 1500 ? 'library/local counted for the first 1500 only' : undefined },
  variables,
  styles,
  notes: [
    'Fills/strokes with a paint style count as bound.',
    'Spacing checks auto-layout frames only; absolute positions are not audited.',
    'Bound is necessary, not sufficient: a binding to the wrong variable passes every check here except roleMismatch.',
  ],
};
