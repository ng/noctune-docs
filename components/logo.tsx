export function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M16 10 L22 16 M32 10 L26 16" />
        <circle cx="24" cy="22" r="12" fill="currentColor" stroke="none" />
        <circle cx="20" cy="20" r="3" fill="#fff" />
        <circle cx="28" cy="20" r="3" fill="#fff" />
        <circle cx="20" cy="20" r="1.3" fill="currentColor" />
        <circle cx="28" cy="20" r="1.3" fill="currentColor" />
        <path d="M23 25 L24 27 L25 25 Z" fill="#fff" stroke="none" />
        <path d="M14 30 Q14 40 24 40 Q34 40 34 30" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Noctune</span>
        <span style={{ fontSize: 11, opacity: 0.65 }}>The AI for veterinary medicine</span>
      </div>
    </div>
  )
}
