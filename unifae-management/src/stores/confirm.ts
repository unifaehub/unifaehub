import { defineStore } from 'pinia'

type ConfirmState =
  | {
      open: false
      title: string
      message: string
      confirmText: string
      cancelText: string
      tone: 'default' | 'danger'
      _resolve: null | ((v: boolean) => void)
    }
  | {
      open: true
      title: string
      message: string
      confirmText: string
      cancelText: string
      tone: 'default' | 'danger'
      _resolve: (v: boolean) => void
    }

export const useConfirmStore = defineStore('confirm', {
  state: (): ConfirmState => ({
    open: false,
    title: 'Confirmar',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    tone: 'default',
    _resolve: null,
  }),
  actions: {
    async confirm(opts: {
      title?: string
      message: string
      confirmText?: string
      cancelText?: string
      tone?: 'default' | 'danger'
    }): Promise<boolean> {
      if (this.open && this._resolve) {
        // cancela o diálogo anterior se houver (evita travar UI)
        this._resolve(false)
      }
      return await new Promise<boolean>((resolve) => {
        this.open = true
        this.title = opts.title ?? 'Confirmar'
        this.message = opts.message
        this.confirmText = opts.confirmText ?? 'Confirmar'
        this.cancelText = opts.cancelText ?? 'Cancelar'
        this.tone = opts.tone ?? 'default'
        this._resolve = resolve
      })
    },
    _close(v: boolean) {
      if (this._resolve) this._resolve(v)
      this.open = false
      this.message = ''
      this._resolve = null
      this.tone = 'default'
    },
    ok() {
      this._close(true)
    },
    cancel() {
      this._close(false)
    },
  },
})

