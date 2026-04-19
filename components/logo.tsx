import Image from 'next/image'

export function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Image
        src="/noctune-logo.png"
        alt=""
        width={32}
        height={32}
        priority
        style={{ display: 'block', width: 32, height: 32 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Noctune</span>
        <span style={{ fontSize: 11, opacity: 0.65 }}>The AI for veterinary medicine</span>
      </div>
    </div>
  )
}
