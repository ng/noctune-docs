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
export function TutorialVideo({ id }: { id: string }) {
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
      <figcaption className={styles.caption}>{video.title}</figcaption>
    </figure>
  )
}

/** Every published tutorial, in series order. */
export function TutorialList() {
  const ids = Object.keys(videos).sort(
    (a, b) => videos[a].series - videos[b].series || a.localeCompare(b),
  )
  if (!ids.length)
    return (
      <p style={{ marginTop: '1.5rem' }}>
        Recording, review, templates, follow-up, and Sentinel walkthroughs are coming soon.
      </p>
    )
  return (
    <>
      {ids.map((id) => (
        <TutorialVideo key={id} id={id} />
      ))}
    </>
  )
}
