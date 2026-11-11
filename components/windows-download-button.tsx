import { WINDOWS_APP_DOWNLOAD_URL } from '../lib/windows-app'

import styles from './windows-download-button.module.css'

/** Downloads the latest per-user noctune for Windows installer. */
export function WindowsDownloadButton() {
  return (
    <a href={WINDOWS_APP_DOWNLOAD_URL} className={styles.button}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
      </svg>
      Download noctune for Windows
    </a>
  )
}
