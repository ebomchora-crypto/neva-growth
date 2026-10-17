#!/usr/bin/env python3
"""Ferramenta de migração (uso único): insere `await` em chamadas de banco e converte wrap(...) em handlers async."""
import re, sys

def find_close(s, i):
    depth = 0; q = None; esc = False; tmpl = []
    j = i
    while j < len(s):
        c = s[j]
        if q:
            if esc: esc = False
            elif c == '\\': esc = True
            elif q == '`' and c == '$' and s[j+1:j+2] == '{':
                tmpl.append(depth); depth += 1; j += 1; q = None
            elif c == q: q = None
        else:
            if c in '\'"`': q = c
            elif c == '(' or c == '{' or c == '[':
                depth += 1
            elif c == ')' or c == '}' or c == ']':
                depth -= 1
                if tmpl and depth == tmpl[-1] and c == '}':
                    tmpl.pop(); q = '`'
                if depth == 0 and c == ')' : return j
        j += 1
    return -1

def awaitify(src, names, skip_prefix=0):
    pat = re.compile(r'(?<![\w.$])(' + '|'.join(names) + r')\(')
    out = []; pos = 0; i = skip_prefix
    out.append(src[:skip_prefix]); pos = skip_prefix
    while True:
        m = pat.search(src, pos)
        if not m: break
        start = m.start(); op = m.end() - 1
        cl = find_close(src, op)
        if cl < 0: break
        before = src[:start]
        if before.endswith('function ') or before.endswith('await '):
            out.append(src[pos:cl+1]); pos = cl+1; continue
        # chamadas aninhadas dentro dos argumentos também precisam de await
        inner = awaitify(src[op+1:cl], names)
        call = src[start:op+1] + inner + ')'
        nxt = src[cl+1:cl+4]
        if nxt.startswith('.') or nxt.startswith('?.'):
            call = '(await ' + call + ')'
        else:
            call = 'await ' + call
        out.append(src[pos:start]); out.append(call); pos = cl+1
    out.append(src[pos:])
    return ''.join(out)

def unwrap(src):
    lines = src.split('\n'); out = []; pending = False
    for ln in lines:
        if 'wrap((req, res) =>' in ln or 'wrap(async (req, res) =>' in ln:
            ln = ln.replace('wrap(async (req, res) =>', 'async (req, res) =>').replace('wrap((req, res) =>', 'async (req, res) =>'); pending = True
        elif pending and ln.startswith('}));'):
            ln = '});' + ln[4:]; pending = False
        out.append(ln)
    return '\n'.join(out)

if __name__ == '__main__':
    path = sys.argv[1]; names = sys.argv[2].split(','); skip = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    s = open(path).read()
    s = unwrap(s)
    s = awaitify(s, names, skip)
    open(path, 'w').write(s)
