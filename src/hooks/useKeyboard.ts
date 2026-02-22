import { useEffect } from 'react'

type KeyMap = Record<string, () => void>

/**
 * キーボードショートカットを登録する汎用フック
 *
 * INPUT / TEXTAREA にフォーカス中は無視する（leva入力との競合回避）。
 * keyMap のキーは KeyboardEvent.key の値（"1", "s" など、小文字）。
 */
export const useKeyboard = (keyMap: KeyMap) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const fn = keyMap[e.key.toLowerCase()]
      if (fn) {
        e.preventDefault()
        fn()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keyMap])
}
