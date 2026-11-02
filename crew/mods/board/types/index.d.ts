export type Agent = {
  role: string
  state: string
  phase?: string
  summary?: string
  done?: number
  total?: number
  order?: number
  updatedMs: number
  broken?: boolean
}
export type Ticket = { name: string; agents: Agent[]; newestMs: number }
export type Board = { tickets: Ticket[]; now: number }

declare module 'claude-code' {
  interface PluginState {
    'crew-board': { board: Board; frame: number; focus: string; style: string }
  }
}
