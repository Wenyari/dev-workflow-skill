// agent 名 → 目标目录映射
// 目录路径均以「用户仓库根目录」为基准，且以斜杠结尾便于拼接。
export const AGENTS = {
  claude: {
    id: 'claude',
    label: 'Claude Code',
    targetDir: '.claude/'
  },
  codex: {
    id: 'codex',
    label: 'Codex',
    targetDir: '.agents/'
  }
}

export const AGENT_ORDER = ['claude', 'codex']
