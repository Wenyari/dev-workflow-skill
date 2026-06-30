#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const AUTO_HEADER = '<!-- AUTO-GENERATED. Do not edit. Regenerate from source files. -->'

function parseArgs(argv) {
  const args = { routeDir: null, service: null, out: null, check: false }
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--route-dir=')) args.routeDir = arg.slice('--route-dir='.length)
    else if (arg.startsWith('--service=')) args.service = arg.slice('--service='.length)
    else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length)
    else if (arg === '--check') args.check = true
  }
  return args
}

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(full))
    else out.push(full)
  }
  return out.sort()
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : ''
}

function rel(file) {
  return file ? path.relative(process.cwd(), file) : ''
}

function extractComponentProps(file) {
  const source = read(file)
  const out = []
  const interfaceRe = /export\s+interface\s+([A-Z][A-Za-z0-9]*Props)\s*{([\s\S]*?)\n}/g
  let m
  while ((m = interfaceRe.exec(source)) !== null) {
    out.push(`${m[1]} { ${m[2].replace(/\s+/g, ' ').trim()} }`)
  }
  const typeRe = /export\s+type\s+([A-Z][A-Za-z0-9]*Props)\s*=\s*([^;\n]+)/g
  while ((m = typeRe.exec(source)) !== null) out.push(`${m[1]} = ${m[2].trim()}`)
  return out
}

function extractExports(source, keyword) {
  const re = new RegExp(`export\\s+${keyword}\\s+([A-Za-z0-9_]+)`, 'g')
  const out = []
  let m
  while ((m = re.exec(source)) !== null) out.push(m[1])
  return out
}

function extractServiceFunctions(file) {
  const source = read(file)
  const out = []
  const re = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/g
  let m
  while ((m = re.exec(source)) !== null) out.push(`${m[1]}(${m[2].replace(/\s+/g, ' ').trim()})`)
  return out
}

function renderList(items) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- 未发现'
}

function renderTable(rows, empty) {
  return rows.length > 0 ? rows.join('\n') : empty
}

function buildSummary({ routeDir, service }) {
  const files = collectFiles(routeDir)
  const routeFile = path.join(routeDir, 'route.tsx')
  const componentFiles = files.filter(
    (file) =>
      file.endsWith('.tsx') &&
      path.basename(file) !== 'route.tsx' &&
      path.basename(file) !== 'index.tsx'
  )
  const typesFile = path.join(routeDir, 'types.ts')
  const constantsFile = path.join(routeDir, 'constants.ts')
  const serviceFile = service && fs.existsSync(service) ? service : null

  const componentRows = componentFiles.map((file) => {
    const props = extractComponentProps(file)
    return `| ${path.basename(file, '.tsx')} | ${rel(file)} | ${props.length > 0 ? props.join('<br/>') : '-'} | ${props.length > 0 ? 'OK' : 'NO_PROPS_EXPORT'} |`
  })
  const serviceRows = serviceFile
    ? extractServiceFunctions(serviceFile).map(
        (signature) => `| ${signature.split('(')[0]} | ${rel(serviceFile)} | \`${signature}\` |`
      )
    : []
  const typeRows = fs.existsSync(typesFile)
    ? [
        ...extractExports(read(typesFile), 'interface'),
        ...extractExports(read(typesFile), 'type')
      ].map((name) => `| ${name} | ${rel(typesFile)} |`)
    : []
  const constRows = fs.existsSync(constantsFile)
    ? extractExports(read(constantsFile), 'const').map(
        (name) => `| ${name} | ${rel(constantsFile)} |`
      )
    : []

  const pending = []
  if (!fs.existsSync(routeFile)) pending.push('route.tsx 未发现')
  if (!fs.existsSync(typesFile)) pending.push('types.ts 未发现')
  if (!fs.existsSync(constantsFile)) pending.push('constants.ts 未发现')
  if (!serviceFile) pending.push('service 文件未指定或未发现')

  return `${AUTO_HEADER}

# foundation-summary：${path.basename(routeDir)}

## 1. 生成信息

- routeDir：${rel(routeDir)}
- generatedAt：${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}
- generator：.agent/skills/devFlow/scripts/generate_foundation_summary.mjs

## 2. 文件事实

### route

${fs.existsSync(routeFile) ? `- ${rel(routeFile)}` : '- 未发现'}

### components

${renderList(componentFiles.map(rel))}

### service

${serviceFile ? `- ${rel(serviceFile)}` : '- 未发现'}

### types

${fs.existsSync(typesFile) ? `- ${rel(typesFile)}` : '- 未发现'}

### constants

${fs.existsSync(constantsFile) ? `- ${rel(constantsFile)}` : '- 未发现'}

## 3. 组件 props

| 组件 | 文件 | Props | 解析状态 |
|---|---|---|---|
${renderTable(componentRows, '| - | - | - | 未发现组件 |')}

## 4. service 函数签名

| 函数 | 文件 | 签名 |
|---|---|---|
${renderTable(serviceRows, '| - | - | 未发现 service 函数 |')}

## 5. types 导出

| 类型 | 文件 |
|---|---|
${renderTable(typeRows, '| - | 未发现类型导出 |')}

## 6. constants 导出

| 常量 | 文件 |
|---|---|
${renderTable(constRows, '| - | 未发现常量导出 |')}

## 7. figmaSync 允许修改范围

- 布局。
- CSS。
- Apex UI 组件选型和 props。
- 局部展示结构。
- PLAN.md 和 figma-plan.css。

## 8. figmaSync 禁止修改范围

- 路由路径。
- service 契约。
- API 请求基础封装。
- 类型语义。
- 页面核心状态模型。
- 业务组件边界。
- 权限逻辑。
- Wujie bridge。
- src/routeTree.gen.ts。

## 9. 待确认项

${renderList(pending)}
`
}

function main() {
  const args = parseArgs(process.argv)
  if (!args.routeDir || !fs.existsSync(args.routeDir)) {
    console.error('[foundation-summary] missing or invalid --route-dir')
    process.exit(1)
  }
  const out = args.out ?? path.join(args.routeDir, 'foundation-summary.md')
  const next = buildSummary({ routeDir: args.routeDir, service: args.service })
  const prev = fs.existsSync(out) ? fs.readFileSync(out, 'utf-8') : null
  if (args.check) {
    if (normalizeForCompare(prev) !== normalizeForCompare(next)) {
      console.error(`[foundation-summary] out of date: ${out}`)
      process.exit(1)
    }
    console.log(`[foundation-summary] up to date: ${out}`)
    return
  }
  fs.writeFileSync(out, next)
  console.log(`[foundation-summary] wrote ${out}`)
  if (prev && prev !== next)
    console.log('[foundation-summary] changed from previous snapshot; ask Human to confirm impact.')
}

main()

function normalizeForCompare(text) {
  return String(text ?? '').replace(/generatedAt：.+/g, 'generatedAt：<ignored>')
}
