#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

function parseArgs(argv) {
  const args = {
    routeDir: null,
    service: null,
    types: null,
    constants: null,
    json: false
  }
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--route-dir=')) args.routeDir = arg.slice('--route-dir='.length)
    else if (arg.startsWith('--service=')) args.service = arg.slice('--service='.length)
    else if (arg.startsWith('--types=')) args.types = arg.slice('--types='.length)
    else if (arg.startsWith('--constants=')) args.constants = arg.slice('--constants='.length)
    else if (arg === '--json') args.json = true
  }
  return args
}

function exists(filePath) {
  return Boolean(filePath && fs.existsSync(filePath))
}

function isKebabCase(value) {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)
}

function isPascalCase(value) {
  return /^[A-Z][A-Za-z0-9]*\.tsx$/.test(value)
}

function exportsPascalComponent(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8')
  return (
    /export\s+function\s+[A-Z][A-Za-z0-9]*\s*\(/.test(source) ||
    /export\s+const\s+[A-Z][A-Za-z0-9]*\s*=/.test(source)
  )
}

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full))
    else out.push(full)
  }
  return out
}

async function checkRouteTreeModified() {
  const gitDir = '.git'
  if (!fs.existsSync(gitDir)) return { status: 'unknown', modified: false }
  try {
    const { execSync } = await import('node:child_process')
    const output = execSync('git status --porcelain -- src/routeTree.gen.ts', { encoding: 'utf-8' })
    return { status: 'ok', modified: output.trim().length > 0 }
  } catch {
    return { status: 'unknown', modified: false }
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const checks = []

  if (!args.routeDir) {
    checks.push({ name: 'routeDir', ok: false, message: 'missing --route-dir' })
  } else {
    checks.push({
      name: 'routeDirExists',
      ok: fs.existsSync(args.routeDir),
      message: args.routeDir
    })
    const rel = path.relative('src/routes', args.routeDir)
    const segments = rel.split(path.sep).filter(Boolean)
    checks.push({
      name: 'routeDirNaming',
      ok: !rel.startsWith('..') && segments.every(isKebabCase),
      message: rel
    })
    checks.push({
      name: 'routeFileExists',
      ok: exists(path.join(args.routeDir, 'route.tsx')),
      message: path.join(args.routeDir, 'route.tsx')
    })

    const componentFiles = collectFiles(args.routeDir).filter(
      (file) =>
        file.endsWith('.tsx') &&
        path.basename(file) !== 'route.tsx' &&
        path.basename(file) !== 'index.tsx'
    )
    const componentExports = componentFiles.filter(exportsPascalComponent)
    const badComponents = componentExports.filter((file) => !isPascalCase(path.basename(file)))
    checks.push({
      name: 'componentFileNaming',
      ok: badComponents.length === 0,
      message:
        badComponents.length === 0
          ? `${componentExports.length} component files checked`
          : badComponents
    })
  }

  const typesPath = args.types ?? (args.routeDir ? path.join(args.routeDir, 'types.ts') : null)
  const constantsPath =
    args.constants ?? (args.routeDir ? path.join(args.routeDir, 'constants.ts') : null)
  checks.push({ name: 'typesExists', ok: exists(typesPath), message: typesPath })
  checks.push({ name: 'constantsExists', ok: exists(constantsPath), message: constantsPath })
  if (args.service)
    checks.push({ name: 'serviceExists', ok: exists(args.service), message: args.service })

  const routeTree = await checkRouteTreeModified()
  checks.push({
    name: 'routeTreeNotModified',
    ok: !routeTree.modified,
    message: routeTree.status === 'unknown' ? 'git status unavailable' : 'src/routeTree.gen.ts'
  })

  const result = {
    ok: checks.every((check) => check.ok),
    checks
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  for (const check of checks) {
    console.log(
      `${check.ok ? 'PASS' : 'FAIL'} ${check.name}: ${Array.isArray(check.message) ? check.message.join(', ') : check.message}`
    )
  }
  process.exit(result.ok ? 0 : 1)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
