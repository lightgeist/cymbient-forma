import { configureRuntime } from '@sheet/platform'

const hostedWeb = import.meta.env.VITE_FORMA_WEB === 'true' || import.meta.env.VITE_FORMA_HOSTED === '1'
configureRuntime(
  hostedWeb
    ? {
        platform: 'web',
        apiOrigin: '',
        appOrigin: '',
        openExternal: (url) => { window.open(url, '_blank', 'noopener,noreferrer') },
      }
    : {
        platform: 'desktop',
        appOrigin: import.meta.env.VITE_SHEET_APP_ORIGIN ?? 'http://127.0.0.1:4100',
        openExternal: (url) => {
          void fetch('/desktop/open', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url }),
          })
        },
      },
)
