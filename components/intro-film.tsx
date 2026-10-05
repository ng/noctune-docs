import styles from './tutorial-video.module.css'

// The 60-second LinkedIn overview film, already published and verified on the
// marketing asset CDN. It is silent with captions burned in, so no track is needed.
const FILM =
  'https://marketing-assets.noctune.ai/assets/e06ef3a6023bc02c6c828f79578dc8eb890c5ebc114d0a61224b8038fef76376/noctune-linkedin-landscape.mp4'

export function IntroFilm() {
  return (
    <figure className={styles.figure}>
      <video
        className={styles.video}
        src={FILM}
        poster="/intro-film-poster.webp"
        controls
        playsInline
        preload="metadata"
        width={1920}
        height={1080}
        aria-label="noctune in 60 seconds: recording, SOAP drafts, review, discharge, client replies, and Sentinel"
      />
      <figcaption className={styles.caption}>noctune in 60 seconds · no sound needed</figcaption>
    </figure>
  )
}
