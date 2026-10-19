import json, re, glob, os, sys
os.chdir('/home/user/wfm-rescue-web')
pairs = json.load(open(sys.argv[1] if len(sys.argv)>1 else 'qa/i18n/es-en.json'))

table = {}
for es, en in pairs.items():
    if es == 'Nombre / Name':
        table[es] = ('Nombre', 'Name')
    else:
        table[es] = (es, en)
files = [f for f in glob.glob('src/app/**/*.tsx', recursive=True) + glob.glob('src/components/**/*.tsx', recursive=True)]
stats = {}
changed_files = []
for f in files:
    src = open(f, encoding='utf-8').read()
    orig = src
    used = False
    for es, (ces, cen) in table.items():
        n_es = es
        lit = json.dumps(ces, ensure_ascii=False)
        lit_en = json.dumps(cen, ensure_ascii=False)
        call = f"tx({lit}, {lit_en})"
        for variant in {n_es, n_es.replace('"', '\\"')}:
            # JSX text node
            pat = re.compile(r'>(\s*)' + re.escape(variant) + r'(\s*)<')
            src, n1 = pat.subn(lambda m: f">{m.group(1)}{{{call}}}{m.group(2)}<", src)
            # JSX attribute value
            pat2 = re.compile(r'(\s[\w:-]+)="' + re.escape(variant) + '"')
            src, n2 = pat2.subn(lambda m: f"{m.group(1)}={{{call}}}", src)
            # JS string literal (double or single quote)
            if len(variant) > 20:
                pat3 = re.compile(r'(?<![\w])"' + re.escape(variant) + '"')
                src, n3 = pat3.subn(lambda m: call, src)
            else:
                n3 = 0
            if n1 or n2 or n3:
                used = True
                stats[es] = stats.get(es, 0) + n1 + n2 + n3
    if src != orig:
        # add hook + import
        if 'useTx' not in orig:
            src = 'import { useTx } from "@/lib/tx";\n' + src
        m = re.search(r'export (default )?function \w+\s*\(', src)
        if m and 'const tx = useTx()' not in src:
            br = re.search(r'\)\s*(:\s*[^{=]+)?\{', src[m.end():])
            if br:
                pos = m.end() + br.end()
                src = src[:pos] + '\n  const tx = useTx();' + src[pos:]
        if not src.startswith('"use client"') and not src.startswith("'use client'") and 'use client' not in orig[:200]:
            src = '"use client";\n' + src
        open(f, 'w', encoding='utf-8').write(src)
        changed_files.append(f)
missing = [es for es in table if es not in stats]
print('changed files:', len(changed_files))
for f in changed_files: print('  ', f)
print('replacements:', sum(stats.values()), 'keys matched:', len(stats), 'of', len(table))
print('MISSING:', missing)
