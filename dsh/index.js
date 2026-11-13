import Schema from '@deepseek-ai/schemastery'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

export const name = 'hs-main'
export const inject = ['webServer', 'connection']
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

/**
 * 资料目录口径与客户端一致（lib/client.js isForbiddenDir）：
 * 主目录本身 / 桌面 / 下载根目录 / tmp 不作为资料目录，服务端再判一遍。
 */
const HOME_EXACT = /^(\/Users\/[^/]+|\/home\/[^/]+|\/root|[A-Za-z]:\\Users\\[^\\]+)$/i
const FORBIDDEN_DIR = /((Desktop|桌面)$|(Downloads?|下载(夹)?)$|^(\/tmp|\/private\/tmp|\/var\/folders\/|\/private\/var\/folders\/))/i
const isForbiddenDir = (dir) => HOME_EXACT.test(dir) || FORBIDDEN_DIR.test(dir)

export const Config = Schema.object({
  /* 接线前置：宿主经 cordis.patch.yml 的 config.root: !!js dshHomePath('hs') 注入。 */
  root: Schema.string().required(),
})

/** 服务端 JSON 应答（与 health 同款头，禁缓存）。 */
function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/** 当前资料目录：以 config.root 为基线，用户切换后持久化到 <dir>/data-root.json。 */
let dataRoot = null
function persistRoot(dir) {
  try {
    mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}/data-root.json`,
      JSON.stringify({ dir, updatedOn: new Date().toISOString().slice(0, 10) }, null, 2) + '\n')
  } catch { /* 写不进去也不挡选择：下次启动仍以 config.root 为基线 */ }
  return dir
}

export function apply(ctx, config = {}) {
  if (!ctx.webServer?.register) throw new Error('Desktop webServer.register is unavailable')

  /** 鉴权：宿主要求登录时直接回传拒绝状态。 */
  const authReject = (req) => {
    if (typeof ctx.connection?.requestRejection !== 'function') return undefined
    return ctx.connection.requestRejection(req)
  }

  const root = config?.root
  if (typeof root !== 'string' || root.trim() === '') {
    /* 不裸 throw 白屏：登记一个返回可读错误的健康接口，让前端能显示原因。 */
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact', path: '/api/hs/health',
      handler(req, res) {
        res.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
        res.end(JSON.stringify({ error: 'root 未配置', detail: 'cordis.patch.yml 需要 config.root: !!js dshHomePath(...)' }))
      },
    }), 'hs health (unconfigured)')
    return
  }
  dataRoot = root

  /* ---- 患者档案（M0 最小真实实现：M3 迁移到 schema/0001 冻结） ----
   * demo 与真实并存：种子档案 is_demo=1（合成示例），新建档案 is_demo=0。 */
  mkdirSync(root, { recursive: true })
  const db = new DatabaseSync(`${root}/hs.sqlite`)
  db.exec('CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, meta TEXT, is_demo INTEGER NOT NULL DEFAULT 0, created_on TEXT NOT NULL)')
  const seed = db.prepare('SELECT COUNT(*) AS n FROM subjects').get()
  if (!seed?.n) {
    const ins = db.prepare('INSERT INTO subjects (profile_key, name, meta, is_demo, created_on) VALUES (?,?,?,?,?)')
    ins.run('demo-a', '示例档案 A（刚确诊）', '合成示例 · 仅演示', 1, new Date().toISOString().slice(0, 10))
    ins.run('demo-b', '示例档案 B（长期随访）', '合成示例 · 仅演示', 1, new Date().toISOString().slice(0, 10))
  }

  const listProfiles = () => db.prepare('SELECT profile_key, name, meta, is_demo, created_on FROM subjects ORDER BY rowid DESC').all()

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/api/hs/subjects',
    handler(req, res) {
      const rejection = authReject(req)
      if (rejection !== undefined) return sendJson(res, rejection, { error: 'Authentication required' })
      if (req.method === 'GET') return sendJson(res, 200, { profiles: listProfiles() })
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })
      let body = ''
      req.on('data', (chunk) => { body += chunk; if (body.length > 4096) req.destroy() })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}')
          const name = typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 40) : ''
          if (!name) return sendJson(res, 400, { error: '档案名不能为空' })
          const meta = typeof parsed.meta === 'string' ? parsed.meta.trim().slice(0, 60) : null
          const key = `local-${Date.now().toString(36)}`
          db.prepare('INSERT INTO subjects (profile_key, name, meta, is_demo) VALUES (?,?,?,0)').run(key, name, meta)
          sendJson(res, 200, { profileKey: key, name, meta, isDemo: false })
        } catch (error) {
          sendJson(res, 400, { error: '创建失败：' + ((error && error.message) || error) })
        }
      })
    },
  }), 'hs subjects')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/api/hs/health',
    handler(req, res) {
      const rejection = authReject(req)
      if (rejection !== undefined) return sendJson(res, rejection, { error: 'Authentication required' })
      if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })
      sendJson(res, 200, { ok: true, version: manifest.version, apiVersion: 'v1', capabilities: ['health', 'data-root'] })
    },
  }), 'hs health')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: '/api/hs/root',
    handler(req, res) {
      const rejection = authReject(req)
      if (rejection !== undefined) return sendJson(res, rejection, { error: 'Authentication required' })
      if (req.method === 'GET') return sendJson(res, 200, { dir: dataRoot })
      if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })
      let body = ''
      req.on('data', (chunk) => { body += chunk; if (body.length > 4096) req.destroy() })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}')
          const dir = typeof parsed.dir === 'string' ? parsed.dir.trim() : ''
          if (!dir) return sendJson(res, 400, { error: '目录不能为空' })
          if (isForbiddenDir(dir)) {
            return sendJson(res, 400, { error: '这个位置不能当资料目录（主目录本身 / 桌面 / 下载根目录 / tmp）' })
          }
          dataRoot = persistRoot(dir)
          sendJson(res, 200, { dir: dataRoot })
        } catch (error) {
          sendJson(res, 400, { error: '目录切换失败：' + ((error && error.message) || error) })
        }
      })
    },
  }), 'hs data-root')
}
