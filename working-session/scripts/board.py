#!/usr/bin/env python3
"""
board.py — print the use_figma script for one action on the working-session board.
Claude runs the printed script with use_figma (FigJam file below). Every script
finds its targets by layer name inside ONE board section, so it works on any copy.

  python3 board.py <board name> findings <findings.json>   fill stage 1 "The data"
  python3 board.py <board name> read                        read the whole board back as JSON
  python3 board.py <board name> brief "<text>"              write the build brief
  python3 board.py <board name> shot <version 1-3>          get the image slot id for upload_assets
  python3 board.py <board name> change <version> "<text>"   add an orange change sticky under a version
  python3 board.py <board name> done <sticky id>            turn a change sticky green
  python3 board.py <board name> tickets "<text>"            write the tickets card

FigJam file key: tZci1rdqm67KWa55q9SLWk   Template board name: "Working session"
On the day, duplicate the template and give the copy its own name (e.g. "Equiem · 9 Oct").
"""
import json, sys

FILE_KEY = 'tZci1rdqm67KWa55q9SLWk'

PRELUDE = """
for (const s of ['Regular','Semi Bold','Bold','Medium']) await figma.loadFontAsync({family:'Inter', style:s});
const root = figma.currentPage.children.find(n => n.type === 'SECTION' && n.name === P.board);
if (!root) throw new Error('No board section named "' + P.board + '". Duplicate the template and name it, or check the name.');
const byName = (n) => root.findAll(x => x.name === n);
const one = (n) => { const r = byName(n); if (!r.length) throw new Error('Board is missing a layer named ' + n); return r[0]; };
const setText = async (node, txt) => { for (const seg of node.getStyledTextSegments(['fontName'])) await figma.loadFontAsync(seg.fontName); node.characters = txt; };
const h = (r,g,b) => ({r:r/255, g:g/255, b:b/255});
"""


def script(payload, body):
    return f"const P = {json.dumps(payload)};\n{PRELUDE}\n{body.strip()}"


def findings(board, path):
    data = json.load(open(path))
    ov = data['overview']
    overview = f"{ov['file']}\n{ov['rows']:,} rows · {ov['columns']} columns"
    if 'from' in ov:
        overview += f"\n{ov['from']} to {ov['to']}"
    overview += '\n\nColumns:\n' + '\n'.join(
        f"·  {c['name']}  ({c['kind']}" + (f", {c['missing']} blank" if c['missing'] != '0%' else '') + ')'
        for c in data['columns'])
    items = []
    for f in data['findings'][:9]:
        rows = f" Rows {', '.join(map(str, f['rows']))}." if f.get('rows') else ''
        items.append(f"{f['title']}\n\n{f['detail']}{rows}")
    questions = '\n\n'.join(f'·  {q}' for q in data['questions'])
    return script({'board': board, 'overview': overview, 'findings': items, 'questions': questions}, """
await setText(one('overview-body'), P.overview);
await setText(one('questions-body'), P.questions);
const area = one('findings-area');
const sec = area.parent;
for (const old of [...byName('finding-placeholder'), ...byName('finding')]) old.remove();
const made = [];
for (let i = 0; i < P.findings.length; i++) {
  const st = figma.createSticky();
  await figma.loadFontAsync(st.text.fontName);
  st.isWideWidth = true;
  st.text.characters = P.findings[i];
  await figma.loadFontAsync({family: st.text.fontName.family, style: 'Bold'});
  st.text.setRangeFontName(0, P.findings[i].indexOf('\\n'), {family: st.text.fontName.family, style: 'Bold'});
  st.fills = [{type:'SOLID', color:{r:1,g:1,b:1}}];
  st.name = 'finding';
  sec.appendChild(st);
  st.x = area.x + (i % 3) * (416 + 64);
  st.y = area.y + Math.floor(i / 3) * (240 + 64);
  made.push(st.id);
}
const ov = one('overview-body'), q = one('questions-body');
ov.parent.resizeWithoutConstraints(ov.parent.width, Math.max(320, ov.y + ov.height + 32));
q.parent.y = ov.parent.y + ov.parent.height + 40;
q.parent.resizeWithoutConstraints(q.parent.width, Math.max(240, q.y + q.height + 32));
return { findings: made.length };
""")


def read(board):
    return script({'board': board}, """
const COLORS = { 'FFFFFF':'white','E6E6E6':'gray','B3EFBD':'green','B3F4EF':'teal','A8DAFF':'blue','D3BDFF':'violet','FFA8DB':'pink','FFB8A8':'red','FFD3A8':'orange','FFE299':'yellow' };
const colour = (n) => { const f = n.fills && n.fills[0]; if (!f || f.type !== 'SOLID') return '?';
  const hex = [f.color.r, f.color.g, f.color.b].map(v => Math.round(v*255).toString(16).padStart(2,'0')).join('').toUpperCase(); return COLORS[hex] || hex; };
const abs = (n) => n.absoluteBoundingBox;
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const centre = (n) => { const b = abs(n); return {x: b.x + b.width/2, y: b.y + b.height/2}; };
const dist = (a, b) => { const p = centre(a), q = centre(b); return Math.hypot(p.x - q.x, p.y - q.y); };
const stageOf = (n) => { let p = n.parent; while (p && p.parent && p.parent.id !== root.id) p = p.parent; return p; };
const heading = (sec) => { const t = sec.children.filter(c => c.type === 'TEXT' && c.fontSize === 48); return t.map(x => x.characters).join(' '); };
const stages = root.children.filter(c => c.type === 'SECTION');
const stageName = {}; for (const s of stages) stageName[s.id] = heading(s);
const stickies = root.findAll(n => n.type === 'STICKY' && !/example|placeholder/.test(n.name) && !/^e\\.g\\./.test(n.text.characters));
const stamps = root.findAll(n => n.type === 'STAMP');
const findings = stickies.filter(s => s.name === 'finding');
const others = stickies.filter(s => s.name !== 'finding');
const out = { findings: [], frame: [], pick: {}, problem: '', brief: '', versions: {}, review: [], loose: [] };
for (const f of findings) out.findings.push({ id: f.id, text: f.text.characters.split('\\n')[0], votes: stamps.filter(s => overlaps(abs(s), abs(f))).length, reactions: [] });
for (const s of others) {
  const st = stageOf(s); const name = st ? stageName[st.id] : '';
  const item = { id: s.id, text: s.text.characters, colour: colour(s) };
  if (/data/i.test(name) && findings.length) {
    const near = findings.reduce((a, b) => dist(s, a) <= dist(s, b) ? a : b);
    out.findings.find(f => f.id === near.id).reactions.push(item);
  } else if (/frame/i.test(name)) {
    const qs = st.children.filter(c => c.type === 'TEXT' && c.fontSize === 32);
    const q = qs.filter(t => abs(t).x <= abs(s).x + 10).sort((a, b) => abs(b).x - abs(a).x)[0];
    out.frame.push({ question: q ? q.characters : '', ...item });
  } else if (/pick/i.test(name)) {
    const card = ['one-user','one-decision','one-screen','problem-card'].map(n => byName(n)[0]).find(c => c && overlaps(abs(c), abs(s)));
    const key = card ? card.name : 'other'; (out.pick[key] ??= []).push(item);
  } else if (/build/i.test(name)) {
    const v = [1,2,3].find(i => { const img = byName('version-' + i + '-image')[0]; return img && abs(s).x + 120 >= abs(img).x && abs(s).x < abs(img).x + abs(img).width; });
    const k = 'version ' + (v || '?'); (out.versions[k] ??= []).push({ ...item, change: s.name === 'change' });
  } else if (/review/i.test(name)) {
    const cols = st.children.filter(c => c.type === 'TEXT' && c.fontSize === 32);
    const c = cols.filter(t => abs(t).x <= abs(s).x + 10).sort((a, b) => abs(b).x - abs(a).x)[0];
    out.review.push({ column: c ? c.characters : '', ...item });
  } else out.loose.push({ stage: name, ...item });
}
out.findings.sort((a, b) => b.votes - a.votes);
out.problem = one('problem-sentence').characters;
out.brief = one('build-brief').characters;
const stamped = stamps.filter(s => !findings.some(f => overlaps(abs(s), abs(f))));
out.unplaced_votes = stamped.length;
return out;
""")


def brief(board, text):
    return script({'board': board, 'text': text}, """
const b = one('build-brief'); await setText(b, P.text);
b.fills = [{type:'SOLID', color:{r:0.07,g:0.07,b:0.07}}];
const card = b.parent; card.resizeWithoutConstraints(card.width, Math.max(240, b.y + b.height + 24));
return { ok: true };
""")


def shot(board, v):
    return script({'board': board, 'v': int(v)}, """
const img = one('version-' + P.v + '-image');
const hint = byName('version-' + P.v + '-hint')[0]; if (hint) hint.visible = false;
return { nodeId: img.id, next: 'upload_assets with nodeIds [' + img.id + '] and scaleMode FIT, then POST the PNG' };
""")


def change(board, v, text):
    return script({'board': board, 'v': int(v), 'text': text}, """
const label = one('version-' + P.v + '-changes');
const sec = label.parent;
const img = one('version-' + P.v + '-image');
for (const ex of byName('change-example')) ex.remove();
const mine = byName('change').filter(s => s.parent === sec && s.x >= img.x - 1 && s.x < img.x + img.width);
const i = mine.length;
const st = figma.createSticky(); await figma.loadFontAsync(st.text.fontName);
st.text.characters = P.text; st.name = 'change';
st.fills = [{type:'SOLID', color:h(0xff,0xd3,0xa8)}];
sec.appendChild(st);
st.x = img.x + (i % 4) * (240 + 60);
st.y = label.y + label.height + 16 + Math.floor(i / 4) * (240 + 24);
return { id: st.id, version: P.v, n: i + 1 };
""")


def done(board, sticky_id):
    return script({'board': board, 'id': sticky_id}, """
const st = await figma.getNodeByIdAsync(P.id);
if (!st || st.type !== 'STICKY') throw new Error('No sticky ' + P.id);
st.fills = [{type:'SOLID', color:h(0xb3,0xef,0xbd)}];
return { id: st.id, done: true };
""")


def tickets(board, text):
    return script({'board': board, 'text': text}, """
const b = one('tickets-body'); await setText(b, P.text);
b.fills = [{type:'SOLID', color:{r:0.07,g:0.07,b:0.07}}];
const card = b.parent; card.resizeWithoutConstraints(card.width, Math.max(560, b.y + b.height + 24));
return { ok: true };
""")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    board, action, *args = sys.argv[1:]
    fn = {'findings': findings, 'read': read, 'brief': brief, 'shot': shot,
          'change': change, 'done': done, 'tickets': tickets}.get(action)
    if not fn:
        sys.exit(__doc__)
    print(fn(board, *args))
