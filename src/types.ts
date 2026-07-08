export type AnsiColor =
  | 'default'
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'bright-black'
  | 'bright-red'
  | 'bright-green'
  | 'bright-yellow'
  | 'bright-blue'
  | 'bright-magenta'
  | 'bright-cyan'
  | 'bright-white'

export type BarStyle = 'blocks' | 'shade' | 'segments' | 'dots' | 'thin' | 'ascii'

export type BarColorMode = 'solid' | 'threshold' | 'gradient'

export type ElementType =
  | 'model'
  | 'cwd-basename'
  | 'cwd-path'
  | 'project-dir'
  | 'git-branch'
  | 'cost'
  | 'duration'
  | 'lines-changed'
  | 'context-pct'
  | 'context-bar'
  | 'tokens'
  | 'output-style'
  | 'version'
  | 'session-name'
  | 'vim-mode'
  | 'rate-5h'
  | 'rate-7d'
  | 'rate-5h-bar'
  | 'rate-7d-bar'
  | 'time'
  | 'text'
  | 'sep'

export interface ElementConfig {
  color: AnsiColor
  bold: boolean
  dim: boolean
  prefix: string
  suffix: string
  /** free-form payload: content for `text`, glyph for `sep` */
  extra: string
  /** bar elements only */
  barStyle: BarStyle
  barWidth: number
  barColorMode: BarColorMode
}

export interface ElementInstance {
  id: string
  type: ElementType
  config: ElementConfig
}

/** The status line document: rows of elements (each row = one printed line). */
export interface Doc {
  rows: ElementInstance[][]
}

export interface ElementDef {
  type: ElementType
  label: string
  hint: string
  category: 'session' | 'workspace' | 'usage' | 'decor'
  defaults: Partial<ElementConfig>
  /** render preview text from mock data (without prefix/suffix) */
  preview: (config: ElementConfig) => string
  /**
   * bash emit: returns { setup: lines needed once per type, value: expression
   * usable inside double quotes, e.g. `${seg_model}` }
   */
  emit: (config: ElementConfig) => { setup: string[]; value: string }
}
