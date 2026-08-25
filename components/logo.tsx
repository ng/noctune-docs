import Image from 'next/image'

export function Logo() {
  return (
    <Image
      src="/noctune-logo-horizontal.png"
      alt="Noctune"
      width={452}
      height={120}
      priority
      className="noctune-logo"
      style={{ display: 'block', height: 28, width: 'auto' }}
    />
  )
}
