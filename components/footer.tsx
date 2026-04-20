import Image from 'next/image'

const BRAND_URL = 'https://noctune.ai'

const linkStyle: React.CSSProperties = {
  color: 'inherit',
  textDecoration: 'none',
  opacity: 0.7,
  fontSize: 14,
}

const headingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 20,
  opacity: 0.95,
}

const columnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

function FooterLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Image
        src="/noctune-logo.png"
        alt=""
        width={40}
        height={40}
        className="noctune-logo"
        style={{ display: 'block', width: 40, height: 40 }}
      />
      <span style={{ fontWeight: 700, fontSize: 22 }}>Noctune</span>
    </div>
  )
}

export function DocsFooter() {
  return (
    <div style={{ width: '100%', maxWidth: 1280, margin: '0 auto', padding: '1rem 0' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(240px, 1.5fr) repeat(3, minmax(140px, 1fr))',
          gap: '2.5rem',
        }}
      >
        <div>
          <FooterLogo />
          <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.55, marginTop: 18, maxWidth: 320 }}>
            The AI for veterinary medicine.
          </p>
        </div>

        <div style={columnStyle}>
          <div style={headingStyle}>Product</div>
          <a href={`${BRAND_URL}/#features`} style={linkStyle}>
            Features
          </a>
          <a href={`${BRAND_URL}/#pricing`} style={linkStyle}>
            Pricing
          </a>
          <a href={`${BRAND_URL}/#integrations`} style={linkStyle}>
            Integrations
          </a>
          <a href={`${BRAND_URL}/#updates`} style={linkStyle}>
            Updates
          </a>
        </div>

        <div style={columnStyle}>
          <div style={headingStyle}>Company</div>
          <a href={`${BRAND_URL}/about`} style={linkStyle}>
            About
          </a>
          <a href={`${BRAND_URL}/blog`} style={linkStyle}>
            Blog
          </a>
          <a href={`${BRAND_URL}/careers`} style={linkStyle}>
            Careers
          </a>
          <a href="mailto:jon@noctune.ai" style={linkStyle}>
            Contact
          </a>
        </div>

        <div style={columnStyle}>
          <div style={headingStyle}>Legal</div>
          <a href={`${BRAND_URL}/privacy`} style={linkStyle}>
            Privacy Policy
          </a>
          <a href={`${BRAND_URL}/terms`} style={linkStyle}>
            Terms of Service
          </a>
        </div>
      </div>

      <div
        style={{
          marginTop: '2.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid currentColor',
          borderColor: 'color-mix(in srgb, currentColor 15%, transparent)',
          fontSize: 13,
          opacity: 0.6,
        }}
      >
        © {new Date().getFullYear()} Noctune. All rights reserved.
      </div>
    </div>
  )
}
