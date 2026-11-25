/** The inputs a test changes while the overlay host stays mounted. */
export interface Scene {
  shell: boolean
  drawer: boolean
  modal: boolean
  showModal: boolean
  mode: 'action' | 'controls' | 'dropdown' | 'pair' | 'confirm'
  controls: boolean
  onClose: (event?: unknown) => void
  onLowerClose: (event?: unknown) => void
  onShellClick: (event: MouseEvent) => void
  closeOnEscape: boolean
  preventScroll: boolean
}
