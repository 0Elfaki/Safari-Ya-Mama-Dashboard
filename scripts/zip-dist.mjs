// Zips dash-dist/ with forward-slash paths (works on Linux hosts such as Hostinger).
// Windows' Compress-Archive writes "assets\file.js", which Linux unzips as flat files.
import { execFileSync } from 'node:child_process';
execFileSync('python', ['-c', `
import os, zipfile
src = 'dash-dist'
with zipfile.ZipFile('dash-dist.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(src):
        for f in files:
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, src).replace(os.sep, '/'))
print('dash-dist.zip written')
`], { stdio: 'inherit' });
