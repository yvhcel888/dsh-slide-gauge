/**
 * DSH 滑动测梁仪 — 浏览器端
 * 逻辑对照 D:\滑动测量仪\main.py（1200×700 场景按面板宽度缩放）
 */
;(function () {
  if (typeof document === 'undefined') return
  if (window.__dshSlideGaugeLoaded) return
  window.__dshSlideGaugeLoaded = true

  var W = 1200
  var H = 700
  var STATES = ['梁神', '梁圣', '梁子', '牢梁']
  // 原版边界（场景坐标）
  var BOUND_L = 157
  var BOUND_R = 1048
  var S_LIANG = 100
  var S_BIAO = 200
  var CLY_W = 1139.25
  var CLY_H = 380.62
  var JYN_W = 1537 / 4
  var JYN_H = 1023 / 4

  // 初始中心（与 main.py 一致）
  var init = {
    liang: { cx: 600, cy: 325 },
    biao: { cx: 602, cy: 350 },
    cly: { cx: 600, cy: 500 },
    jyn: { cx: 600, cy: 500 },
  }

  var opened = false
  var dragging = false
  var STORAGE_KEY = 'dsh-slide-gauge/v1'
  var liangX = init.liang.cx - S_LIANG / 2
  var liangY = init.liang.cy - S_LIANG / 2
  var biaoX = init.biao.cx - S_BIAO / 2
  var biaoY = init.biao.cy - S_BIAO / 2
  var mouseStartX = 0
  var liangStartX = 0
  var biaoStartX = 0
  var sceneMX = 0
  var showJyn = false

  function loadSavedPos() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      var s = JSON.parse(raw)
      if (!s || typeof s !== 'object') return
      if (isFinite(s.liangX)) liangX = Number(s.liangX)
      if (isFinite(s.biaoX)) biaoX = Number(s.biaoX)
      if (isFinite(s.liangY)) liangY = Number(s.liangY)
      if (isFinite(s.biaoY)) biaoY = Number(s.biaoY)
      // 轻量夹紧，避免脏数据把角色甩出场外
      liangX = clamp(liangX, BOUND_L - 200, BOUND_R + 200)
      biaoX = clamp(biaoX, BOUND_L - 300, BOUND_R + 300)
    } catch (err) {}
  }

  function savePos() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          liangX: liangX,
          liangY: liangY,
          biaoX: biaoX,
          biaoY: biaoY,
          state: statusBar(),
          updatedAt: Date.now(),
        }),
      )
    } catch (err) {}
  }

  loadSavedPos()

  function statusBar() {
    var left = liangX
    var right = liangX + S_LIANG
    if (left <= 365) return STATES[0]
    if (left > 365 && right <= 601) return STATES[1]
    if (left > 601 && right <= 860) return STATES[2]
    return STATES[3]
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v))
  }

  // —— DOM ——
  var root = document.createElement('div')
  root.id = 'dsh-slide-gauge-root'
  root.innerHTML =
    '<button type="button" class="sg-fab" title="滑动测梁仪" aria-label="打开滑动测梁仪">测</button>' +
    '<div class="sg-panel" hidden>' +
    '  <div class="sg-titlebar">' +
    '    <span class="sg-title">滑动测梁仪</span>' +
    '    <button type="button" class="sg-close" aria-label="关闭">×</button>' +
    '  </div>' +
    '  <div class="sg-stage-wrap">' +
    '    <canvas class="sg-stage" width="1200" height="700"></canvas>' +
    '  </div>' +
    '  <div class="sg-hint">按住角色左右拖动 · 拖到边界看鲸鱼娘 · 位置会记住上次状态</div>' +
    '</div>'

  var style = document.createElement('style')
  style.textContent = [
    '#dsh-slide-gauge-root{position:fixed;right:18px;bottom:18px;z-index:2147483000;font-family:KaiTi,STKaiti,"楷体","Noto Serif SC",serif;}',
    '#dsh-slide-gauge-root .sg-fab{width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:linear-gradient(145deg,#1e3a5f,#0f172a);color:#f8fafc;font-size:18px;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35);}',
    '#dsh-slide-gauge-root .sg-fab:hover{filter:brightness(1.12);}',
    '#dsh-slide-gauge-root .sg-panel{position:fixed;right:18px;bottom:74px;width:min(640px,calc(100vw - 24px));background:#0b1220;border:1px solid rgba(148,163,184,.28);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.45);overflow:hidden;color:#e2e8f0;}',
    '#dsh-slide-gauge-root .sg-panel[hidden]{display:none;}',
    '#dsh-slide-gauge-root .sg-titlebar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(15,23,42,.95);border-bottom:1px solid rgba(148,163,184,.18);}',
    '#dsh-slide-gauge-root .sg-title{font-size:14px;letter-spacing:.08em;}',
    '#dsh-slide-gauge-root .sg-close{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#94a3b8;font-size:18px;line-height:1;cursor:pointer;}',
    '#dsh-slide-gauge-root .sg-close:hover{background:rgba(148,163,184,.15);color:#f1f5f9;}',
    '#dsh-slide-gauge-root .sg-stage-wrap{display:flex;justify-content:center;background:#000;}',
    '#dsh-slide-gauge-root .sg-stage{display:block;width:100%;height:auto;touch-action:none;cursor:grab;}',
    '#dsh-slide-gauge-root .sg-stage:active{cursor:grabbing;}',
    '#dsh-slide-gauge-root .sg-hint{padding:8px 12px 10px;font-size:12px;color:#94a3b8;text-align:center;}',
  ].join('')
  document.head.appendChild(style)
  document.body.appendChild(root)

  var fab = root.querySelector('.sg-fab')
  var panel = root.querySelector('.sg-panel')
  var closeBtn = root.querySelector('.sg-close')
  var canvas = root.querySelector('.sg-stage')
  var ctx2d = canvas.getContext('2d')

  var imgs = {
    biao: loadImage('/dsh-slide-gauge/asset.png?id=biao'),
    cly: loadImage('/dsh-slide-gauge/asset.png?id=cly'),
    jyn: loadImage('/dsh-slide-gauge/asset.png?id=jyn'),
    // 约定不打包 liang.png；404 时用占位头像
    liang: loadImage('/dsh-slide-gauge/asset.png?id=liang'),
  }

  function loadImage(src) {
    var im = new Image()
    im.src = src
    im.addEventListener('load', function () {
      draw()
    })
    im.addEventListener('error', function () {
      im.__failed = true
      draw()
    })
    return im
  }

  function setOpen(v) {
    opened = !!v
    panel.hidden = !opened
    fab.setAttribute('aria-expanded', opened ? 'true' : 'false')
    if (opened) draw()
  }

  fab.addEventListener('click', function () {
    setOpen(!opened)
  })
  closeBtn.addEventListener('click', function () {
    setOpen(false)
  })

  function scenePoint(evt) {
    var rect = canvas.getBoundingClientRect()
    var sx = (evt.clientX - rect.left) * (W / rect.width)
    var sy = (evt.clientY - rect.top) * (H / rect.height)
    return { x: sx, y: sy }
  }

  function hitLiang(p) {
    return p.x >= liangX && p.x <= liangX + S_LIANG && p.y >= liangY && p.y <= liangY + S_LIANG
  }

  canvas.addEventListener('pointerdown', function (evt) {
    var p = scenePoint(evt)
    sceneMX = p.x
    if (!hitLiang(p)) return
    dragging = true
    mouseStartX = p.x
    liangStartX = liangX
    biaoStartX = biaoX
    try {
      canvas.setPointerCapture(evt.pointerId)
    } catch (err) {}
    evt.preventDefault()
  })

  // 拖动中节流写入，避免只关页面不松手时丢位置
  var lastSaveAt = 0
  canvas.addEventListener('pointermove', function (evt) {
    var p = scenePoint(evt)
    sceneMX = p.x
    if (!dragging) {
      draw()
      return
    }
    // 对应 main.py：
    // dx = max(157, min(1048, mouse_x)); dx = mouse_start_x - dx
    // liang.x = liang_start - dx; biao.x = biao_start - dx
    var clamped = clamp(p.x, BOUND_L, BOUND_R)
    var dx = mouseStartX - clamped
    liangX = liangStartX - dx
    biaoX = biaoStartX - dx
    showJyn = sceneMX <= BOUND_L || sceneMX >= BOUND_R
    var now = Date.now()
    if (now - lastSaveAt > 200) {
      lastSaveAt = now
      savePos()
    }
    draw()
  })

  function endDrag(evt) {
    if (!dragging) return
    dragging = false
    showJyn = false
    savePos()
    try {
      if (evt && evt.pointerId != null) canvas.releasePointerCapture(evt.pointerId)
    } catch (err) {}
    draw()
  }

  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  canvas.addEventListener('pointerleave', function (evt) {
    if (dragging) endDrag(evt)
  })

  function drawPlaceholderLiang(c, x, y) {
    var r = S_LIANG / 2
    var cx = x + r
    var cy = y + r
    c.save()
    // 底
    c.beginPath()
    c.arc(cx, cy, r - 1, 0, Math.PI * 2)
    var g = c.createLinearGradient(x, y, x + S_LIANG, y + S_LIANG)
    g.addColorStop(0, '#38bdf8')
    g.addColorStop(1, '#6366f1')
    c.fillStyle = g
    c.fill()
    c.lineWidth = 3
    c.strokeStyle = '#e2e8f0'
    c.stroke()
    // 头像字
    c.fillStyle = '#0f172a'
    c.font = 'bold 42px KaiTi, STKaiti, serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('梁', cx, cy + 2)
    c.restore()
  }

  function drawLiang(c) {
    var im = imgs.liang
    if (im && !im.__failed && im.complete && im.naturalWidth > 0) {
      c.drawImage(im, liangX, liangY, S_LIANG, S_LIANG)
    } else {
      drawPlaceholderLiang(c, liangX, liangY)
    }
  }

  function drawBiao(c) {
    var im = imgs.biao
    if (im && im.complete && im.naturalWidth > 0) {
      c.drawImage(im, biaoX, biaoY, S_BIAO, S_BIAO)
    } else {
      c.save()
      c.strokeStyle = '#f59e0b'
      c.lineWidth = 4
      c.strokeRect(biaoX + 8, biaoY + 8, S_BIAO - 16, S_BIAO - 16)
      c.fillStyle = 'rgba(245,158,11,.15)'
      c.fillRect(biaoX + 8, biaoY + 8, S_BIAO - 16, S_BIAO - 16)
      c.restore()
    }
  }

  function drawCly(c) {
    var im = imgs.cly
    var x = init.cly.cx - CLY_W / 2
    var y = init.cly.cy - CLY_H / 2
    if (im && im.complete && im.naturalWidth > 0) {
      c.drawImage(im, x, y, CLY_W, CLY_H)
    } else {
      c.save()
      c.fillStyle = '#1e293b'
      c.strokeStyle = '#475569'
      c.lineWidth = 3
      c.beginPath()
      c.roundRect
        ? c.roundRect(x, y, CLY_W, CLY_H, 18)
        : c.rect(x, y, CLY_W, CLY_H)
      c.fill()
      c.stroke()
      // 刻度
      c.strokeStyle = '#94a3b8'
      c.lineWidth = 2
      for (var i = 0; i <= 20; i++) {
        var tx = x + 40 + ((CLY_W - 80) * i) / 20
        var th = i % 5 === 0 ? 28 : 14
        c.beginPath()
        c.moveTo(tx, y + 40)
        c.lineTo(tx, y + 40 + th)
        c.stroke()
      }
      c.fillStyle = '#cbd5e1'
      c.font = '18px KaiTi, STKaiti, serif'
      c.textAlign = 'center'
      c.fillText('滑动测梁仪', init.cly.cx, y + 100)
      c.restore()
    }
  }

  function drawJyn(c) {
    if (!showJyn) return
    var im = imgs.jyn
    var x = init.jyn.cx - JYN_W / 2
    var y = init.jyn.cy - JYN_H / 2
    if (im && im.complete && im.naturalWidth > 0) {
      c.drawImage(im, x, y, JYN_W, JYN_H)
    } else {
      c.save()
      c.fillStyle = 'rgba(56,189,248,.35)'
      c.beginPath()
      c.ellipse(init.jyn.cx, init.jyn.cy, JYN_W / 2, JYN_H / 2, 0, 0, Math.PI * 2)
      c.fill()
      c.restore()
    }
  }

  function draw() {
    if (!opened) return
    var c = ctx2d
    c.clearRect(0, 0, W, H)
    c.fillStyle = '#000000'
    c.fillRect(0, 0, W, H)

    // 状态文字（红，楷体感）
    var st = statusBar()
    c.fillStyle = '#ef4444'
    c.font = '30px KaiTi, STKaiti, "楷体", serif'
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
    c.fillText('当前状态是' + st, 100, 100)

    // 图层顺序同 main.py：测梁仪 → 标 → 梁 →（边界）鲸鱼娘
    drawCly(c)
    drawBiao(c)
    drawLiang(c)
    drawJyn(c)

    // 边界提示线（轻量辅助，不干扰原版观感）
    c.save()
    c.strokeStyle = 'rgba(148,163,184,.25)'
    c.setLineDash([6, 6])
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(BOUND_L, 40)
    c.lineTo(BOUND_L, H - 40)
    c.moveTo(BOUND_R, 40)
    c.lineTo(BOUND_R, H - 40)
    c.stroke()
    c.restore()
  }

  // 面板打开后再画一次
  setOpen(false)
})()
