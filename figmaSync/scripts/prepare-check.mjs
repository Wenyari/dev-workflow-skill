/**
 * Prepare Check
 *
 * 检查 figmaSync 原生 CSS 工作流依赖的技术栈与资源。分级输出：
 *   - blocker: 缺失会阻塞 plan/apply
 *   - warning: 不影响运行但建议修复
 *   - info:    诊断信息
 *
 * 用法:
 *   pnpm figma:prepare
 *   pnpm figma:prepare --json
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const CHECKS = [
  checkNodeVersion,
  checkPackageManager,
  checkRequiredDeps,
  checkRequiredDevDeps,
  checkThemeCss,
  checkPackageScripts,
  checkGitignore,
  checkApexUiAvailable,
  checkCommonComponentSources,
  checkAssetSources,
  checkRouterConvention,
  checkFigmaMcpHint
]

function main() {
  const json = process.argv.includes('--json')
  const results = []
  for (const fn of CHECKS) {
    try {
      const r = fn()
      if (Array.isArray(r)) results.push(...r)
      else if (r) results.push(r)
    } catch (err) {
      results.push({
        level: 'blocker',
        name: fn.name,
        message: `check threw: ${err.message}`
      })
    }
  }

  const blockers = results.filter((r) => r.level === 'blocker')
  const warnings = results.filter((r) => r.level === 'warning')
  const infos = results.filter((r) => r.level === 'info')

  if (json) {
    console.log(JSON.stringify({ blockers, warnings, infos }, null, 2))
  } else {
    printHuman(results)
    console.log()
    console.log(
      `[figma:prepare] ${blockers.length} blocker · ${warnings.length} warning · ${infos.length} info`
    )
  }

  process.exit(blockers.length > 0 ? 1 : 0)
}

function printHuman(results) {
  const groups = { blocker: '❌', warning: '⚠️ ', info: 'ℹ️ ' }
  for (const level of ['blocker', 'warning', 'info']) {
    const items = results.filter((r) => r.level === level)
    if (items.length === 0) continue
    console.log(`\n${groups[level]} ${level.toUpperCase()}`)
    for (const r of items) {
      console.log(`  · [${r.name}] ${r.message}`)
      if (r.fix) console.log(`      fix → ${r.fix}`)
    }
  }
  if (results.every((r) => r.level === 'info')) {
    console.log('\n✅ All checks passed.')
  }
}

function checkNodeVersion() {
  const v = process.versions.node
  const major = Number(v.split('.')[0])
  if (major < 18) {
    return {
      level: 'blocker',
      name: 'node-version',
      message: `Node ${v} 太旧；要求 ≥ 18`,
      fix: '升级 Node 到 18+'
    }
  }
  return { level: 'info', name: 'node-version', message: `Node ${v} OK` }
}

function checkPackageManager() {
  try {
    const v = execSync('pnpm -v', { encoding: 'utf-8' }).trim()
    return { level: 'info', name: 'pnpm', message: `pnpm ${v} OK` }
  } catch {
    return {
      level: 'blocker',
      name: 'pnpm',
      message: 'pnpm 未安装',
      fix: 'corepack enable && corepack prepare pnpm@latest --activate'
    }
  }
}

function readPackageJson() {
  const p = path.join(ROOT, 'package.json')
  if (!fs.existsSync(p)) throw new Error('package.json missing in project root')
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

function checkRequiredDeps() {
  const pkg = readPackageJson()
  const deps = pkg.dependencies ?? {}
  const required = ['@frontend/apex-ui--react']
  return required.map((name) =>
    deps[name]
      ? { level: 'info', name: `dep:${name}`, message: `${name}@${deps[name]} OK` }
      : {
          level: 'blocker',
          name: `dep:${name}`,
          message: `缺少 dependency ${name}`,
          fix: `pnpm add ${name}`
        }
  )
}

function checkRequiredDevDeps() {
  const pkg = readPackageJson()
  const deps = pkg.devDependencies ?? {}
  const required = ['@babel/parser', '@babel/traverse', 'globby']
  return required.map((name) =>
    deps[name]
      ? { level: 'info', name: `devDep:${name}`, message: `${name}@${deps[name]} OK` }
      : {
          level: 'warning',
          name: `devDep:${name}`,
          message: `缺少 devDependency ${name}，部分报告能力可能受影响`,
          fix: `pnpm add -D ${name}`
        }
  )
}

function checkThemeCss() {
  const srcDir = path.join(ROOT, 'theme', 'dark')
  const requiredCss = ['primitives.css', 'aliases.css']
  const missingCss = requiredCss.filter((file) => !fs.existsSync(path.join(srcDir, file)))
  if (missingCss.length > 0) {
    return {
      level: 'blocker',
      name: 'theme-css',
      message: `theme/dark 缺少：${missingCss.join(', ')}`,
      fix: '先补齐 /theme CSS variables 源文件'
    }
  }
  return { level: 'info', name: 'theme-css', message: 'theme/dark CSS variables 源 OK' }
}

const REQUIRED_SCRIPTS = ['figma:report', 'figma:verify-plan']

function checkPackageScripts() {
  const pkg = readPackageJson()
  const scripts = pkg.scripts ?? {}
  return REQUIRED_SCRIPTS.map((name) =>
    scripts[name]
      ? { level: 'info', name: `script:${name}`, message: `script "${name}" OK` }
      : {
          level: 'blocker',
          name: `script:${name}`,
          message: `package.json scripts 缺少 "${name}"`,
          fix: '参考 figmaSync SKILL.md 速查表补齐 scripts'
        }
  )
}

const REQUIRED_GITIGNORE = [
  '.agent/skills/figmaSync/.session-log.jsonl',
  '.agent/skills/figmaSync/session-report-plan.md',
  '.agent/skills/figmaSync/session-report-apply.md'
]

function checkGitignore() {
  const p = path.join(ROOT, '.gitignore')
  if (!fs.existsSync(p)) {
    return {
      level: 'warning',
      name: 'gitignore',
      message: '.gitignore 不存在',
      fix: '至少忽略 figmaSync session 文件'
    }
  }
  const text = fs.readFileSync(p, 'utf-8')
  const missing = REQUIRED_GITIGNORE.filter((line) => !text.includes(line))
  if (missing.length > 0) {
    return {
      level: 'warning',
      name: 'gitignore',
      message: `.gitignore 缺项：${missing.join(', ')}`,
      fix: '把缺失行追加到 .gitignore'
    }
  }
  return { level: 'info', name: 'gitignore', message: '.gitignore OK' }
}

function checkApexUiAvailable() {
  const llms = path.join(ROOT, 'node_modules/@frontend/apex-ui--react/dist/llms.txt')
  if (!fs.existsSync(llms)) {
    return {
      level: 'warning',
      name: 'apex-ui-llms',
      message: 'apex-ui llms.txt 找不到，组件复用判断会受影响',
      fix: 'pnpm install 重新安装 @frontend/apex-ui--react'
    }
  }
  return { level: 'info', name: 'apex-ui-llms', message: 'apex-ui llms.txt 可用' }
}

function checkCommonComponentSources() {
  const commonDir = path.join(ROOT, 'src', 'common')
  if (!fs.existsSync(commonDir)) {
    return {
      level: 'warning',
      name: 'common-components',
      message: 'src/common 不存在，plan 阶段无法扫描 common component 复用机会'
    }
  }
  return { level: 'info', name: 'common-components', message: 'src/common 可扫描' }
}

function checkAssetSources() {
  const candidates = [
    'assets',
    'icons',
    'public',
    path.join('src', 'assets'),
    path.join('src', 'icons')
  ]
  const existing = candidates.filter((item) => fs.existsSync(path.join(ROOT, item)))
  if (existing.length === 0) {
    return {
      level: 'warning',
      name: 'assets',
      message: '未发现常见 assets/icons 目录，icon 匹配可能全部进入待确认'
    }
  }
  return { level: 'info', name: 'assets', message: `可扫描资产目录：${existing.join(', ')}` }
}

function checkRouterConvention() {
  const pkg = readPackageJson()
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  const detected = []
  if (deps['@tanstack/react-router']) detected.push('TanStack Router')
  if (deps['react-router-dom'] || deps['react-router']) detected.push('React Router')
  if (deps.next) detected.push('Next.js App Router')

  if (detected.length === 0) {
    return {
      level: 'info',
      name: 'router',
      message: '未识别到路由库；PLAN.md 中 targetFile 由用户决定'
    }
  }
  const router = detected.join(' + ')
  let hint = ''
  if (detected.includes('TanStack Router')) {
    hint = ' → file-based 路由：targetFile 用 `src/routes/<feature>/route.tsx`'
  } else if (detected.includes('Next.js App Router')) {
    hint = ' → App Router：targetFile 用 `app/<feature>/page.tsx`'
  } else if (detected.includes('React Router')) {
    hint = ' → 常见约定 `src/pages/<feature>/index.tsx`'
  }
  return { level: 'info', name: 'router', message: `检测到 ${router}${hint}` }
}

function checkFigmaMcpHint() {
  return {
    level: 'info',
    name: 'figma-mcp',
    message: 'Figma MCP 可用性由 AI 在 plan 阶段调用 whoami 试探，shell 无法判断'
  }
}

main()
