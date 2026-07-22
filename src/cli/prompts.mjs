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

export function moveSelection(currentIndex, keyName, optionCount) {
  if (optionCount <= 0) return 0
  if (keyName === 'up' || keyName === 'left') {
    return (currentIndex - 1 + optionCount) % optionCount
  }
  if (keyName === 'down' || keyName === 'right') {
    return (currentIndex + 1) % optionCount
  }
  return currentIndex
}

function renderOptions(options, selectedIndex) {
  options.forEach((opt, index) => {
    const hint = opt.hint ? `  ${opt.hint}` : ''
    if (index === selectedIndex) {
      process.stdout.write(`\x1b[1;36m❯ ${opt.label}${hint}\x1b[0m\n`)
    } else {
      process.stdout.write(`  ${opt.label}${hint}\n`)
    }
  })
}

function selectWithArrowKeys(message, options, defaultIndex) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new Error('当前终端不支持交互式方向键菜单，请在可交互终端中运行安装命令')
  }

  return new Promise((resolve, reject) => {
    let selectedIndex = defaultIndex
    const previousRawMode = Boolean(process.stdin.isRaw)

    function cleanup() {
      process.stdin.off('keypress', onKeypress)
      process.stdin.setRawMode(previousRawMode)
      process.stdin.pause()
    }

    function redraw() {
      process.stdout.write(`\x1b[${options.length}A\x1b[0J`)
      renderOptions(options, selectedIndex)
    }

    function onKeypress(_input, key = {}) {
      if (key.ctrl && key.name === 'c') {
        cleanup()
        reject(new Error('用户取消安装'))
        return
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup()
        process.stdout.write('\n')
        resolve(options[selectedIndex].value)
        return
      }
      const nextIndex = moveSelection(selectedIndex, key.name, options.length)
      if (nextIndex !== selectedIndex) {
        selectedIndex = nextIndex
        redraw()
      }
    }

    console.log('')
    console.log(message)
    renderOptions(options, selectedIndex)
    console.log('\x1b[2m使用 ↑/↓ 或 ←/→ 切换，Enter 确认\x1b[0m')

    // 清除提示行后把光标恢复到选项区域，后续重绘不会残留旧选项。
    process.stdout.write('\x1b[1A\x1b[0J')
    readline.emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('keypress', onKeypress)
  })
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
  const answers = loadTestAnswers()
  if (answers.length > 0) {
    const raw = answers.shift().trim()
    const selected = raw === '' ? defaultIndex : Number(raw) - 1
    if (!Number.isInteger(selected) || selected < 0 || selected >= options.length) {
      throw new Error(`测试选项超出范围：${raw}`)
    }
    console.log(`\n${message}`)
    console.log(`测试选择：${options[selected].label}`)
    return options[selected].value
  }
  return selectWithArrowKeys(message, options, defaultIndex)
}

// y/N 确认，默认 no。
export async function confirm(message, { defaultYes = false } = {}) {
  const suffix = defaultYes ? '(Y/n)' : '(y/N)'
  const raw = (await ask(`\n${message} ${suffix}：`)).trim().toLowerCase()
  if (raw === '') return defaultYes
  return raw === 'y' || raw === 'yes'
}
