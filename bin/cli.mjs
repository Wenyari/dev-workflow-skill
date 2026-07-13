#!/usr/bin/env node
// @dev-workflow/skill 入口
// 第一版只做纯交互，无 argv 解析。
import { run } from '../src/cli/install.mjs'

run().catch(err => {
  console.error('\n❌ 安装失败：', err && err.message ? err.message : err)
  process.exit(1)
})
