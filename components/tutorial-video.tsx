import published from '../tutorials/published.json'

import styles from './tutorial-video.module.css'

interface PublishedVideo {
  title: string
  platform: string
  series: number
  url: string
  poster: string
  captions: string
  width: number
  height: number
}

const videos: Record<string, PublishedVideo> = published.videos

/**
 * Plays a published tutorial from the docs media CDN with English captions.
 *
 * Renders nothing until `pnpm tutorials:publish --write` records the episode,
 * so pages can reference episodes that are still awaiting a full listen.
 */
export function TutorialVideo({ id, caption = true }: { id: string; caption?: boolean }) {
  const video = videos[id]
  if (!video) return null
  return (
    <figure className={styles.figure}>
      <video
        className={styles.video}
        controls
        playsInline
        preload="metadata"
        poster={video.poster}
        width={video.width}
        height={video.height}
        aria-label={video.title}
      >
        <source src={video.url} type="video/mp4" />
        <track kind="captions" src={video.captions} srcLang="en" label="English" default />
      </video>
      {caption && <figcaption className={styles.caption}>{video.title}</figcaption>}
    </figure>
  )
}
