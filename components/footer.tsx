const BRAND_URL = 'https://www.noctune.ai'
const BRAND_TEAL = '#2a7f78'

const linkStyle: React.CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  opacity: 0.75,
}

const headingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 12,
  opacity: 0.9,
}

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontSize: 13,
}

export function DocsFooter() {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2.5rem',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 1280,
        margin: '0 auto',
        padding: '1rem 0',
      }}
    >
      <div style={{ maxWidth: 280 }}>
        <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>Noctune</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          The AI for veterinary medicine.
        </div>
        <div style={{ fontSize: 12, opacity: 0.55, marginTop: 16 }}>
          © {new Date().getFullYear()} Noctune. All rights reserved.
        </div>
      </div>

      <div style={columnStyle}>
        <div style={headingStyle}>Product</div>
        <a href={`${BRAND_URL}/#features`} style={linkStyle}>
          Features
        </a>
        <a href={`${BRAND_URL}/#pricing`} style={linkStyle}>
          Pricing
        </a>
        <a href={`${BRAND_URL}/#faq`} style={linkStyle}>
          FAQ
        </a>
        <a href={`${BRAND_URL}/#students`} style={linkStyle}>
          For students
        </a>
      </div>

      <div style={columnStyle}>
        <div style={headingStyle}>Docs</div>
        <a href="/getting-started" style={linkStyle}>
          Get started
        </a>
        <a href="/encounters" style={linkStyle}>
          Encounters
        </a>
        <a href="/reference" style={linkStyle}>
          Technical reference
        </a>
      </div>

      <div style={columnStyle}>
        <div style={headingStyle}>Account</div>
        <a href={`${BRAND_URL}/sign-in`} style={{ ...linkStyle, color: BRAND_TEAL, opacity: 1 }}>
          Sign in
        </a>
        <a href="mailto:hello@noctune.ai" style={linkStyle}>
          Email us
        </a>
      </div>

      <div style={columnStyle}>
        <div style={headingStyle}>Legal</div>
        <a href={`${BRAND_URL}/privacy`} style={linkStyle}>
          Privacy
        </a>
        <a href={`${BRAND_URL}/terms`} style={linkStyle}>
          Terms
        </a>
      </div>
    </div>
  )
}
