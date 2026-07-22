import type { Metadata } from 'next'
import { IOS_SUPPORT_EMAIL } from '../../../../lib/ios-support'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Noctune for iOS Support',
  description:
    'Support for existing Noctune users on iPhone and iPad, including recording, uploads, notes, and account deletion.',
  alternates: {
    canonical: '/ios/support',
  },
}

const helpTopics = [
  {
    number: '01',
    title: 'Sign in with an existing account',
    body: (
      <>
        On the <strong>Sign in to Noctune</strong> screen, use the Apple or Google identity already
        connected to your account. For email access, choose{' '}
        <strong>Sign in with email instead</strong>, enter your email and password, then choose{' '}
        <strong>Sign in</strong>. If your credentials are not accepted, check your connection,
        re-enter them, and contact support if the problem continues.
      </>
    ),
  },
  {
    number: '02',
    title: 'Record and allow microphone access',
    body: (
      <>
        Choose the center <strong>Record</strong> tab, select a patient and note templates, then
        begin recording. The first time, allow Noctune to use the microphone. If access was denied,
        open iOS <strong>Settings → Privacy &amp; Security → Microphone</strong>, enable Noctune,
        return to the app, and try again. Silence calls before a long visit; a call or another audio
        interruption can pause the recording.
      </>
    ),
  },
  {
    number: '03',
    title: 'Add audio from your device',
    body: (
      <>
        In <strong>Record</strong>, select a patient, choose <strong>Choose From Phone</strong>, and
        pick one or more audio files. Use <strong>Add More Files</strong> when needed, then choose{' '}
        <strong>Upload</strong>. Keep Noctune open with a stable connection until the app shows{' '}
        <strong>Uploaded</strong>. If it says <strong>Couldn&apos;t upload</strong>, choose{' '}
        <strong>Retry</strong>.
      </>
    ),
  },
  {
    number: '04',
    title: 'Background recording and Live Activity',
    body: (
      <>
        A recording you begin can continue while Noctune is in the background or the screen is
        locked. The Live Activity shows elapsed time and the current state; tap it to return to the
        recording. If an interruption pauses capture, return to Noctune and choose{' '}
        <strong>Resume recording</strong>. The Live Activity reports the app&apos;s recording; it
        does not capture audio on its own.
      </>
    ),
  },
  {
    number: '05',
    title: 'Follow processing and recover from a failure',
    body: (
      <>
        A normal encounter moves through <strong>Queued</strong>, <strong>Transcribing</strong>,{' '}
        <strong>Generating SOAP Note</strong>, and <strong>Ready</strong>. The encounter refreshes
        as work completes. If it shows <strong>Processing failed</strong>, open it and choose{' '}
        <strong>Retry</strong>. If it shows <strong>On hold</strong>, the audio is saved but cannot
        be processed at that time; email support with the approximate encounter time and do not
        include identifying clinical information.
      </>
    ),
  },
  {
    number: '06',
    title: 'Review the transcript, note, and source audio',
    body: (
      <>
        Open <strong>Encounters</strong> and choose the encounter. Move among{' '}
        <strong>Transcript</strong>, <strong>SOAP</strong>, <strong>Discharge</strong>, and{' '}
        <strong>Messages</strong>. The source-audio player stays available above{' '}
        <strong>Transcript</strong> and <strong>SOAP</strong>. Tap a timestamp in the transcript or
        generated note to seek to the matching moment in the source audio.
      </>
    ),
  },
]

export default function IOSSupportPage() {
  return (
    <main id="main-content" className={styles.main}>
      <section className={styles.hero} data-support-section="top">
        <div className={styles.eyebrow}>Help on iPhone and iPad</div>
        <h1>Noctune for iOS Support</h1>
        <p className={styles.intro}>
          Noctune for iOS is a companion for existing Noctune service accounts. Veterinary teams can
          capture appointment audio, send it for processing, and review transcripts and generated
          clinical notes from an iPhone or iPad.
        </p>
        <div className={styles.platforms} aria-label="Supported device families">
          <span>iPhone</span>
          <span>iPad</span>
        </div>
      </section>

      <aside
        className={styles.disclaimer}
        aria-labelledby="clinical-review-heading"
        data-card-treatment="tinted-callout"
        data-card-width="full"
        data-support-section="clinical-review"
      >
        <div className={styles.disclaimerMark} aria-hidden="true" data-callout-icon="review-note">
          <svg viewBox="0 0 24 24" fill="none" focusable="false">
            <path d="M5 4.5h14v11H9l-4 4z" />
            <path d="m9.5 12.25 5.75-5.75 2.25 2.25-5.75 5.75-3 .75z" />
          </svg>
        </div>
        <div className={styles.disclaimerBody}>
          <h2 id="clinical-review-heading">Clinical review is required</h2>
          <p>
            Generated notes are drafts for review by a veterinary professional. They are not an
            independent diagnosis, treatment, prescription, or medical advice. Review, edit, and
            approve every note before use in a clinical record.
          </p>
        </div>
      </aside>

      <section
        id="contact"
        className={styles.contact}
        aria-labelledby="contact-heading"
        data-card-treatment="contact-cta"
        data-card-width="full"
        data-support-section="contact"
      >
        <div className={styles.contactIntro}>
          <div className={styles.sectionLabel}>Contact</div>
          <h2 id="contact-heading">Get help from Noctune</h2>
          <p>
            For help with the iOS app or access to an existing account, include your device model,
            iOS version, app version, and the approximate time of the problem.
          </p>
        </div>
        <div className={styles.contactAction}>
          <a
            href={`mailto:${IOS_SUPPORT_EMAIL}?subject=Noctune%20for%20iOS%20Support`}
            data-contact-action="email"
          >
            <svg
              className={styles.contactActionIcon}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M4 6.5h16v11H4z" />
              <path d="m4.75 7.25 7.25 5.5 7.25-5.5" />
            </svg>
            <span>{IOS_SUPPORT_EMAIL}</span>
          </a>
          <p className={styles.contactPrivacy}>
            <svg
              className={styles.contactPrivacyIcon}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M12 3.5 5.5 6v4.75c0 4.35 2.6 8.15 6.5 9.75 3.9-1.6 6.5-5.4 6.5-9.75V6z" />
            </svg>
            <span>Do not send recordings or identifying clinical information by email.</span>
          </p>
        </div>
      </section>

      <section className={styles.help} aria-labelledby="help-heading">
        <div className={styles.sectionHeading}>
          <div className={styles.sectionLabel}>Using the app</div>
          <h2 id="help-heading">Common tasks and troubleshooting</h2>
        </div>
        <div className={styles.topicGrid}>
          {helpTopics.map((topic) => (
            <section className={styles.topic} key={topic.number}>
              <div className={styles.topicNumber} aria-hidden="true">
                {topic.number}
              </div>
              <h3>{topic.title}</h3>
              <p>{topic.body}</p>
            </section>
          ))}
        </div>
      </section>

      <section
        id="account-deletion"
        className={styles.deletion}
        aria-labelledby="deletion-heading"
        data-support-section="account-deletion"
      >
        <div className={styles.deletionIntro}>
          <div className={styles.sectionLabel}>Account controls</div>
          <h2 id="deletion-heading">Delete your account in the iOS app</h2>
          <p>
            Deletion is permanent and signs you out. The confirmation explains that encounters and
            clinical records are retained under Noctune&apos;s retention policy.
          </p>
        </div>
        <ol className={styles.steps}>
          <li>
            Tap the workspace or avatar control in the top-right corner, then choose{' '}
            <strong>Profile &amp; settings</strong>.
          </li>
          <li>
            Scroll below <strong>Sign out</strong> and choose <strong>Delete account</strong>.
          </li>
          <li>
            In the <strong>Delete account?</strong> confirmation, review the retention notice and
            choose the red <strong>Delete account</strong> action. Choose <strong>Cancel</strong> to
            keep the account.
          </li>
          <li>
            After a successful request, Noctune signs you out automatically. If the app says{' '}
            <strong>Couldn&apos;t delete account</strong>, check your connection, try again, or
            email support.
          </li>
        </ol>
      </section>
    </main>
  )
}
