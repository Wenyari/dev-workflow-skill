// 纯 Node readline 交互，不引入第三方依赖。
// 用 module-level 单例 rl，避免多次 close/open 关闭 stdin 后无法再读。
// 测试模式：设 DWF_TEST_ANSWERS="1|y" 时按顺序消费答案，绕过 readline。
import readline from 'node:readline'

let rlInstance = null
let testAnswers = null

function loadTestAnswers() {
  if (testAnswers !== null) return testAnswers
  const raw = process.env.DWF_TEST_ANSWERS
  testAnswers = raw ? raw.split('|') : []
  return testAnswers
}

function getRl() {
  if (!rlInstance) {
    rlInstance = readline.createInterface({ input: process.stdin, output: process.stdout })
  }
  return rlInstance
}

function ask(question) {
  const answers = loadTestAnswers()
  if (answers.length > 0) {
    const next = answers.shift()
    process.stdout.write(`${question}${next}\n`)
    return Promise.resolve(next)
  }
  return new Promise(resolve => getRl().question(question, answer => resolve(answer)))
}

// 显式关闭：主流程结束时调用一次。
export function closePrompts() {
  if (rlInstance) {
    rlInstance.close()
    rlInstance = null
  }
}

// 单选，返回被选中项的 value。
// options: [{ value, label, hint? }]
export async function select(message, options, { defaultIndex = 0 } = {}) {
  console.log('')
  console.log(message)
  options.forEach((opt, i) => {
    const marker = i === defaultIndex ? '❯' : ' '
    const hint = opt.hint ? `  ${opt.hint}` : ''
    console.log(`  ${marker} ${i + 1}) ${opt.label}${hint}`)
  })
  while (true) {
    const raw = (await ask(`\n请输入编号 [1-${options.length}] (默认 ${defaultIndex + 1})：`)).trim()
    if (raw === '') return options[defaultIndex].value
    const n = Number(raw)
    if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1].value
    console.log(`  ⚠️  请输入 1 - ${options.length} 之间的整数`)
  }
}

// y/N 确认，默认 no。
export async function confirm(message, { defaultYes = false } = {}) {
  const suffix = defaultYes ? '(Y/n)' : '(y/N)'
  const raw = (await ask(`\n${message} ${suffix}：`)).trim().toLowerCase()
  if (raw === '') return defaultYes
  return raw === 'y' || raw === 'yes'
}
