#!/usr/bin/env python3
"""
read_data.py — turn any CSV/XLSX into board-ready findings for the working session.

  python3 read_data.py <file> [--sheet NAME] [--out DIR]

Writes to DIR (default ./out):
  findings.json  what the board loader reads (overview, columns, findings, questions)
  summary.md     the same, readable, for a quick look before laying it out
  rows.csv       a clean copy with a row number, so every finding can point at rows

It finds patterns with plain statistics, not guesses. Every finding carries the
numbers behind it and up to five example row numbers, so in the room anyone can
ask "show me" and get the rows. Judgment — which findings matter — stays with
the people in the room; this script only puts the evidence on the table.
"""
import argparse, json, math, re, sys
from pathlib import Path
import pandas as pd

OUTCOME_HINTS = re.compile(r'status|outcome|result|state|stage', re.I)
NEGATIVE_WORDS = re.compile(r'cancel|no.?show|fail|lost|declin|reject|churn|missed|abandon|late|overdue|error', re.I)
CAPACITY_HINTS = re.compile(r'capacity|limit|max|seats|size|quota|target', re.I)
COUNT_HINTS = re.compile(r'attend|actual|occupan|headcount|people|guests|participants', re.I)


def load(path, sheet=None):
    p = Path(path)
    if p.suffix.lower() in ('.xlsx', '.xlsm', '.xls'):
        return pd.read_excel(p, sheet_name=sheet or 0)
    for enc in ('utf-8', 'utf-8-sig', 'latin-1'):
        try:
            return pd.read_csv(p, encoding=enc, sep=None, engine='python')
        except UnicodeDecodeError:
            continue
    raise SystemExit(f'Could not read {path}')


def classify(s: pd.Series):
    """id · date · number · category · text"""
    non_null = s.dropna()
    if non_null.empty:
        return 'empty'
    n, u = len(non_null), non_null.nunique()
    if pd.api.types.is_numeric_dtype(s):
        if u == n and n > 50 and re.search(r'id$|_id|number|no$', s.name, re.I):
            return 'id'
        return 'number' if u > 12 else 'category'
    sample = non_null.astype(str).head(200)
    parsed = pd.to_datetime(sample, errors='coerce', format='mixed')
    if parsed.notna().mean() > 0.9 and sample.str.len().median() >= 6:
        return 'date'
    if u == n and n > 50:
        return 'id'
    if u <= max(30, n * 0.05):
        return 'category'
    return 'text'


def pct(x):
    return f'{x * 100:.0f}%'


def rows_for(mask, df, k=5):
    return [int(i) for i in df.index[mask][:k]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file'); ap.add_argument('--sheet'); ap.add_argument('--out', default='out')
    a = ap.parse_args()
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)

    df = load(a.file, a.sheet)
    df.columns = [str(c).strip() for c in df.columns]
    df.index = range(1, len(df) + 1)  # row numbers match a spreadsheet, minus the header
    kinds = {c: classify(df[c]) for c in df.columns}

    for c, k in kinds.items():
        if k == 'date':
            df[c] = pd.to_datetime(df[c], errors='coerce', format='mixed')

    # ---------------------------------------------------------------- columns
    columns = []
    for c, k in kinds.items():
        s = df[c]
        info = {'name': c, 'kind': k, 'missing': pct(s.isna().mean()), 'unique': int(s.nunique())}
        if k == 'number':
            info.update(min=float(s.min()), median=float(s.median()), max=float(s.max()))
        elif k == 'category':
            vc = s.value_counts().head(5)
            info['top'] = [{'value': str(v), 'share': pct(n / s.notna().sum())} for v, n in vc.items()]
        elif k == 'date':
            info.update(first=str(s.min().date()), last=str(s.max().date()))
        columns.append(info)

    dates = [c for c, k in kinds.items() if k == 'date']
    numeric = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c]) and kinds[c] != 'id']
    cats = [c for c, k in kinds.items() if k == 'category' and c not in numeric]
    nums = [c for c, k in kinds.items() if k == 'number']
    findings = []

    def add(kind, title, detail, evidence, rows=None, strength=1.0):
        findings.append({'kind': kind, 'title': title, 'detail': detail,
                         'evidence': evidence, 'rows': rows or [], 'strength': round(strength, 2)})

    # ------------------------------------------------- 1. outcome hot spots
    # A low-cardinality column that looks like an outcome (status, result…).
    # For each "negative" value, find segments where it happens at 2x+ the overall rate.
    for oc in [c for c in cats if OUTCOME_HINTS.search(c) or df[c].astype(str).str.contains(NEGATIVE_WORDS).any()]:
        values = df[oc].dropna().astype(str)
        for bad in [v for v in values.unique() if NEGATIVE_WORDS.search(v)]:
            hit = df[oc].astype(str) == bad
            overall = hit.mean()
            if overall == 0:
                continue
            add('rate', f'{bad}: {pct(overall)} overall',
                f'{int(hit.sum())} of {len(df)} rows are "{bad}".',
                {'rate': pct(overall), 'count': int(hit.sum())}, rows_for(hit, df), 0.4)
            seg_cols = [c for c in cats if c != oc and 2 <= df[c].nunique() <= 40]
            for d in dates:
                df[f'__{d}_weekday'] = df[d].dt.day_name().str[:3]
                seg_cols.append(f'__{d}_weekday')
            for sc in seg_cols:
                g = df.groupby(sc)[oc].apply(lambda x: (x.astype(str) == bad).mean())
                n = df.groupby(sc).size()
                for seg, r in g.items():
                    if n[seg] >= 20 and r >= 2 * overall and r - overall >= 0.05:
                        label = sc.replace('__', '').replace('_weekday', ' (weekday)')
                        m = hit & (df[sc] == seg)
                        add('hotspot', f'{bad} is {r / overall:.1f}x higher for {label} = {seg}',
                            f'{pct(r)} vs {pct(overall)} overall, across {int(n[seg])} rows.',
                            {'segment': f'{label} = {seg}', 'rate': pct(r), 'overall': pct(overall), 'rows': int(n[seg])},
                            rows_for(m, df), (r / overall) * math.log10(n[seg]))
            # two-way: segment × weekday, catches "Mondays at one building"
            for sc in [c for c in cats if c != oc and 2 <= df[c].nunique() <= 15]:
                for d in dates:
                    wk = f'__{d}_weekday'
                    g = df.groupby([sc, wk])[oc].apply(lambda x: (x.astype(str) == bad).mean())
                    n = df.groupby([sc, wk]).size()
                    for (s1, s2), r in g.items():
                        if n[(s1, s2)] >= 20 and r >= 3 * overall and r - overall >= 0.1:
                            m = hit & (df[sc] == s1) & (df[wk] == s2)
                            add('hotspot', f'{bad} spikes for {sc} = {s1} on {s2}',
                                f'{pct(r)} vs {pct(overall)} overall, across {int(n[(s1, s2)])} rows.',
                                {'segment': f'{sc} = {s1}, {s2}', 'rate': pct(r), 'overall': pct(overall), 'rows': int(n[(s1, s2)])},
                                rows_for(m, df), (r / overall) * math.log10(n[(s1, s2)]) * 1.2)
    df = df[[c for c in df.columns if not c.startswith('__')]]

    # ------------------------------------------------------- 2. time shape
    for d in dates:
        wd = df[d].dt.day_name().str[:3].value_counts()
        if len(wd) >= 3:
            top, low = wd.idxmax(), wd.idxmin()
            if wd.max() >= 1.3 * wd.min():
                add('time', f'Busiest on {top}, quietest on {low}',
                    f'{int(wd.max())} rows on {top} vs {int(wd.min())} on {low}.',
                    {'by_weekday': {k: int(v) for k, v in wd.items()}}, [], wd.max() / max(wd.min(), 1))
        span = (df[d].max() - df[d].min()).days
        if span >= 56:
            wk = df.set_index(d).resample('W').size()
            days = df.set_index(d).resample('W')[df.columns[0]].apply(lambda x: x.index.normalize().nunique())
            wk = wk[days >= days.max() * 0.8]
            if len(wk) >= 6:
                first, last = wk.iloc[:3].mean(), wk.iloc[-3:].mean()
                if first and abs(last - first) / first >= 0.2:
                    word = 'up' if last > first else 'down'
                    add('trend', f'Volume {word} {pct(abs(last - first) / first)} over the period',
                        f'About {first:.0f} a week at the start, {last:.0f} at the end.',
                        {'first_3_weeks_avg': round(first, 1), 'last_3_weeks_avg': round(last, 1)}, [], 1.5)

    # --------------------------------------------------- 3. concentration
    for c in cats:
        vc = df[c].value_counts(normalize=True)
        if 4 <= len(vc) <= 40 and vc.iloc[0] >= 0.35:
            add('concentration', f'{vc.index[0]} makes up {pct(vc.iloc[0])} of {c}',
                f'The next largest is {vc.index[1]} at {pct(vc.iloc[1])}.',
                {'top': str(vc.index[0]), 'share': pct(vc.iloc[0])}, rows_for(df[c] == vc.index[0], df), vc.iloc[0] * 3)

    # ------------------------------------------------- 4. underused things
    for c in cats:
        vc = df[c].value_counts()
        if 5 <= len(vc) <= 60:
            med = vc.median()
            for name, n in vc.items():
                if n <= 0.3 * med:
                    add('low-use', f'{name} is barely used',
                        f'{int(n)} rows, against a typical {med:.0f} for a {c}.',
                        {'column': c, 'count': int(n), 'median': float(med)}, rows_for(df[c] == name, df), med / max(n, 1))

    # ------------------------------------------ 5. fit: count vs capacity
    caps = [c for c in numeric if CAPACITY_HINTS.search(c)]
    counts = [c for c in numeric if COUNT_HINTS.search(c) and c not in caps]
    for cc in caps:
        for ac in counts:
            both = df[[cc, ac]].dropna()
            if len(both) < 30:
                continue
            fill = (both[ac] / both[cc]).clip(upper=2)
            small = fill < 0.5
            add('fit', f'Half-empty: {pct(small.mean())} of uses fill under half the {cc}',
                f'Median fill is {pct(fill.median())} ({ac} ÷ {cc}).',
                {'median_fill': pct(fill.median()), 'under_half': pct(small.mean())},
                [int(i) for i in both.index[small][:5]], small.mean() * 4)
            if cats:
                by = df.loc[both.index].assign(_fill=fill).groupby(cats[0] if len(cats) == 1 else
                     max(cats, key=lambda c: df[c].nunique() if df[c].nunique() <= 40 else 0))['_fill'].median().sort_values()
                worst = by.head(3)
                add('fit', f'Lowest fill: {", ".join(f"{k} ({pct(v)})" for k, v in worst.items())}',
                    'These are booked for far fewer people than they hold.',
                    {'lowest_fill': {str(k): pct(v) for k, v in worst.items()}}, [], 1.2)

    # ----------------------------------------------------------- 6. outliers
    for c in nums:
        s = df[c].dropna()
        if s.std() and len(s) > 30:
            z = (s - s.mean()) / s.std()
            out_rows = s.index[z.abs() > 3]
            if 0 < len(out_rows) <= len(s) * 0.02:
                add('outlier', f'{len(out_rows)} unusual values in {c}',
                    f'More than three standard deviations from the typical {s.median():g}.',
                    {'max': float(s.max()), 'median': float(s.median())}, [int(i) for i in out_rows[:5]], 0.8)

    # ---------------------------------------------------------- questions
    questions = []
    for col in columns:
        miss = float(col['missing'].rstrip('%'))
        if miss >= 5:
            questions.append(f'{col["name"]} is blank in {col["missing"]} of rows. Is that meaningful (e.g. cancelled) or missing data?')
    if dates:
        d = dates[0]
        questions.append(f'The data runs {df[d].min().date()} to {df[d].max().date()}. Is that a normal period, or is there seasonality we can\'t see?')
    questions.append('Who looks at this today, and what do they decide with it?')
    questions.append('What is NOT in this data that the decision needs? (cost, satisfaction, who booked vs who came)')

    findings.sort(key=lambda f: -f['strength'])
    # hotspots: single-segment ones first, keyed by the segment's value (so
    # "weekday = Mon" and "date (weekday) = Mon" count once); then at most two
    # two-way ones per outcome, skipping any whose entity is already covered.
    def seg_values(f):
        return [part.split(' = ')[-1] for part in f['evidence']['segment'].split(', ')]
    singles = [f for f in findings if f['kind'] == 'hotspot' and ', ' not in f['evidence']['segment']]
    doubles = [f for f in findings if f['kind'] == 'hotspot' and ', ' in f['evidence']['segment']]
    seen, keep_hot, per_outcome = set(), [], {}
    for f in singles:
        key = (f['title'].split(' ')[0], seg_values(f)[0])
        if key not in seen:
            seen.add(key); keep_hot.append(f)
    for f in sorted(doubles, key=lambda f: -f['evidence']['rows']):
        outcome = f['title'].split(' ')[0]
        if (outcome, seg_values(f)[0]) in seen or per_outcome.get(outcome, 0) >= 2:
            continue
        per_outcome[outcome] = per_outcome.get(outcome, 0) + 1
        seen.add((outcome, seg_values(f)[0])); keep_hot.append(f)
    deduped = keep_hot + [f for f in findings if f['kind'] != 'hotspot']
    deduped.sort(key=lambda f: -f['strength'])
    findings = deduped
    # keep the board readable: best 12, no more than 4 of a kind
    kept, per_kind = [], {}
    for f in findings:
        if per_kind.get(f['kind'], 0) < (5 if f['kind'] == 'hotspot' else 3) and len(kept) < 12:
            kept.append(f); per_kind[f['kind']] = per_kind.get(f['kind'], 0) + 1

    overview = {'file': Path(a.file).name, 'rows': len(df), 'columns': len(df.columns)}
    if dates:
        overview['from'] = str(df[dates[0]].min().date()); overview['to'] = str(df[dates[0]].max().date())

    result = {'overview': overview, 'columns': columns, 'findings': kept, 'questions': questions}
    (out / 'findings.json').write_text(json.dumps(result, indent=2, default=str))
    df.assign(**{c: df[c].dt.date for c in dates}).to_csv(out / 'rows.csv', index_label='row')

    md = [f'# {overview["file"]}', f'{overview["rows"]} rows · {overview["columns"]} columns' +
          (f' · {overview["from"]} → {overview["to"]}' if dates else ''), '', '## Findings']
    for i, f in enumerate(kept, 1):
        md.append(f'{i}. **{f["title"]}** — {f["detail"]}' + (f' Rows: {", ".join(map(str, f["rows"]))}' if f['rows'] else ''))
    md += ['', '## Questions'] + [f'- {q}' for q in questions] + ['', '## Columns']
    md += [f'- {c["name"]} ({c["kind"]}, {c["unique"]} unique, {c["missing"]} blank)' for c in columns]
    (out / 'summary.md').write_text('\n'.join(md))
    print('\n'.join(md[:4 + len(kept)]))


if __name__ == '__main__':
    main()
