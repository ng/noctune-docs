export function AIDraft() {
  return (
    <div
      role="note"
      aria-label="AI-drafted content"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.3rem 0.75rem',
        marginBottom: '1.25rem',
        borderRadius: 9999,
        background: 'rgba(251, 191, 36, 0.12)',
        border: '1px solid rgba(251, 146, 60, 0.35)',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: 'inherit',
        lineHeight: 1.4,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'rgb(234, 179, 8)',
        }}
      />
      AI-drafted · review before use
    </div>
  )
}
