import { useState } from 'react'

const APP_URL = 'https://bahon.jafran.online'

export function useShare() {
  const [copied, setCopied] = useState(false)

  async function share() {
    const data = {
      title: 'Bahon — বাহন',
      text: 'Free vehicle fuel & service tracker. Works offline, no account needed.',
      url: APP_URL,
    }

    if (typeof navigator.share === 'function' && navigator.canShare?.(data)) {
      await navigator.share(data)
    } else {
      await navigator.clipboard.writeText(APP_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return { share, copied }
}
