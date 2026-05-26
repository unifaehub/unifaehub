import { defineStore } from 'pinia'

export type ToastKind = 'success' | 'error' | 'info'

export type ToastItem = {
  id: number
  kind: ToastKind
  message: string
  createdAt: number
}

let nextId = 1

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as ToastItem[],
  }),
  actions: {
    push(kind: ToastKind, message: string, ttlMs = 3500) {
      const id = nextId++
      this.items.unshift({ id, kind, message, createdAt: Date.now() })
      window.setTimeout(() => this.remove(id), ttlMs)
      return id
    },
    success(message: string, ttlMs?: number) {
      return this.push('success', message, ttlMs)
    },
    error(message: string, ttlMs?: number) {
      return this.push('error', message, ttlMs)
    },
    info(message: string, ttlMs?: number) {
      return this.push('info', message, ttlMs)
    },
    remove(id: number) {
      this.items = this.items.filter((t) => t.id !== id)
    },
    clear() {
      this.items = []
    },
  },
})

