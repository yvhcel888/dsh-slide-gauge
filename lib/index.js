import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
}

// assets：biao / cly / jyn 随包发布；liang.png 按约定不打包，若用户自备则优先
const ASSET_MAP = {
  biao: {
    files: [path.join(PACKAGE_ROOT, 'assets', 'biao.png')],
    mime: 'image/png',
  },
  cly: {
    files: [path.join(PACKAGE_ROOT, 'assets', 'cly.png')],
    mime: 'image/png',
  },
  jyn: {
    files: [path.join(PACKAGE_ROOT, 'assets', 'jyn.png')],
    mime: 'image/png',
  },
  // 可选：用户自行放入 assets/liang.png 后生效
  liang: {
    files: [path.join(PACKAGE_ROOT, 'assets', 'liang.png')],
    mime: 'image/png',
    optional: true,
  },
}

const WIDGET_FILE_CANDIDATES = [
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'slide-gauge.js'),
  path.join(PACKAGE_ROOT, 'lib', 'slide-gauge.js'),
  path.join(PACKAGE_ROOT, 'assets', 'slide-gauge.js'),
]
let widgetJsCache = null

function loadWidgetJs() {
  for (const p of WIDGET_FILE_CANDIDATES) {
    try {
      const st = fs.statSync(p)
      if (widgetJsCache && widgetJsCache.mtimeMs === st.mtimeMs && widgetJsCache.path === p) {
        return widgetJsCache.text
      }
      const text = fs.readFileSync(p, 'utf8')
      widgetJsCache = { text, mtimeMs: st.mtimeMs, path: p }
      return text
    } catch (err) {}
  }
  return widgetJsCache ? widgetJsCache.text : ''
}

function loadAsset(entry) {
  for (const p of entry.files) {
    try {
      const bytes = fs.readFileSync(p)
      if (bytes && bytes.length > 0) return bytes
    } catch (err) {}
  }
  return null
}

function assetIdFromUrl(url) {
  try {
    const u = new URL(url, 'http://localhost')
    return u.searchParams.get('id') || ''
  } catch (err) {
    return ''
  }
}

export default {
  name: 'slide-gauge',
  inject: ['webServer', 'connection'],
  apply(ctx) {
    function rejected(req, res) {
      try {
        const conn = ctx.get('connection') || ctx.connection
        if (!conn || typeof conn.requestRejection !== 'function') {
          if (!rejected.warned) {
            rejected.warned = true
            try {
              console.warn('[slide-gauge] 信任栅栏不可用：connection 服务缺失')
            } catch (err) {}
          }
          return false
        }
        const code = conn.requestRejection(req)
        if (code === undefined || code === null || code === false) return false
        res.statusCode = typeof code === 'number' ? code : 403
        res.end()
        return true
      } catch (err) {
        return false
      }
    }

    function registerRoute(route) {
      const inner = route && route.handler
      const wrapped = Object.assign({}, route, {
        handler: async (req, res) => {
          if (rejected(req, res)) return
          return inner(req, res)
        },
      })
      return ctx.webServer.register(wrapped)
    }

    const disposers = []

    disposers.push(
      registerRoute({
        kind: 'exact',
        path: '/dsh-slide-gauge/widget.js',
        handler: (req, res) => {
          res.writeHead(200, {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-store',
          })
          res.end(loadWidgetJs())
        },
      }),
    )

    disposers.push(
      registerRoute({
        kind: 'exact',
        path: '/dsh-slide-gauge/asset.png',
        handler: (req, res) => {
          try {
            const id = assetIdFromUrl(req.url)
            const entry = ASSET_MAP[id]
            if (!entry) {
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
              res.end('unknown asset')
              return
            }
            const bytes = loadAsset(entry)
            if (!bytes) {
              res.writeHead(entry.optional ? 404 : 500, {
                'Content-Type': 'text/plain; charset=utf-8',
              })
              res.end(entry.optional ? 'optional asset missing' : 'asset missing')
              return
            }
            res.writeHead(200, {
              'Content-Type': entry.mime,
              'Cache-Control': 'no-store',
              'Content-Length': String(bytes.length),
            })
            res.end(bytes)
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end('bad request')
          }
        },
      }),
    )

    disposers.push(
      ctx.webServer.tapIndex((html) => {
        if (html.indexOf('/dsh-slide-gauge/widget.js') !== -1) return html
        const tag = '<script defer src="/dsh-slide-gauge/widget.js"></script>'
        if (html.indexOf('</body>') !== -1) return html.replace('</body>', tag + '</body>')
        return html + tag
      }),
    )

    ctx.effect(() => () => {
      for (const d of disposers) {
        try {
          d()
        } catch (err) {}
      }
    })
  },
}
