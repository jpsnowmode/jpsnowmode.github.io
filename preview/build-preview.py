#!/usr/bin/env python3
"""Regenerate preview-snow.html from index.html (preview only; not linked from the main page)."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
s = (root / 'index.html').read_text()
def rep(a, b, n=1):
    global s
    assert s.count(a) >= 1, a
    s = s.replace(a, b, n)
rep('<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta name="robots" content="noindex, nofollow">')
s = re.sub(r'<title>(.*?)</title>', r'<title>（預覽）\1</title>', s, count=1)
s = re.sub(r'<link rel="canonical"[^>]*>\n?', '', s)
s = re.sub(r'(<link rel="stylesheet" href="style\.css[^"]*">)', r'\1\n<link rel="stylesheet" href="preview/preview-snow.css?v=3">', s, count=1)
rep('<button type="submit" class="btn btn-main" id="wiz-send" hidden>送出預約需求</button>',
    '<button type="submit" class="btn btn-main" id="wiz-send" hidden>送出預約需求</button>\n'
    '          <button type="button" class="go-switch sx-send" id="sx-send" hidden aria-label="滑動送出預約需求">\n'
    '            <span class="go-fill" aria-hidden="true"></span>\n'
    '            <span class="go-knob" aria-hidden="true"><img src="img/logo/c-carve-knob.svg?v=silver" alt="" width="44" height="44" draggable="false"></span>\n'
    '            <span class="go-text" aria-hidden="true">滑動送出預約<i class="go-chev"><b>›</b><b>›</b><b>›</b></i></span>\n'
    '            <span class="sx-busy-t" aria-hidden="true">送出中…</span>\n'
    '          </button>')
overlay = '''<div class="sx-done" id="sx-done" hidden role="dialog" aria-modal="true" aria-labelledby="sx-title">
  <canvas id="sx-snow" aria-hidden="true"></canvas>
  <div class="sx-card">
    <p class="sx-kicker">BOOKING REQUEST SENT</p>
    <h2 class="sx-title" id="sx-title">SNOW MODE: <b>ON</b></h2>
    <p class="sx-sub">已收到你的預約需求</p>
    <p class="sx-ref"><small>預約編號</small><b id="sx-ref">SM-0000</b></p>
    <p class="sx-note">我們會用 <span id="sx-method">LINE</span> 與你聯繫，確認教練與時段。</p>
    <button type="button" class="sx-close" id="sx-close">完成</button>
    <p class="sx-mock">預覽版：不會真的送出預約</p>
  </div>
</div>
<p class="sx-badge" aria-hidden="true">PREVIEW・模擬送出</p>
'''
s = re.sub(r'(<script src="script\.js[^"]*"></script>)', lambda m: overlay + m.group(1) + '\n<script src="preview/preview-snow.js?v=2"></script>', s, count=1)
(root / 'preview-snow.html').write_text(s)
print('wrote preview-snow.html')
