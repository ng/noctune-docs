import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const prerenderRoot = path.join(repositoryRoot, '.next/server/app')
const routesManifestPath = path.join(repositoryRoot, '.next/routes-manifest.json')

const supportHref = '/ios/support'
const privacyHref = '/ios/privacy'
const termsHref = '/ios/terms'
const supportEmail = 'support@noctune.com'

const permanentRedirects = new Map([
  ['/ios', supportHref],
  ['/ios-support', supportHref],
  ['/ios-support/privacy', privacyHref],
  ['/ios-support/terms', termsHref],
])

const requiredSupportCopy = [
  ['page heading', /\bNoctune for iOS Support\b/i],
  ['existing-account description', /\bexisting Noctune (?:service )?accounts?\b/i],
  ['sign-in help', /\b(?:sign[- ]in help|signing in|sign in with an existing account)\b/i],
  ['recording help', /\brecording\b/i],
  ['microphone access help', /\bmicrophone (?:access|permission)\b/i],
  ['audio-upload help', /\b(?:upload(?:ing)? audio|audio upload|add audio from your device)\b/i],
  ['background-recording help', /\bbackground recording\b/i],
  ['Live Activity help', /\bLive Activity\b/i],
  ['Queued processing state', /\bQueued\b/i],
  ['Transcribing processing state', /\bTranscribing\b/i],
  ['note-generation processing state', /\bGenerating (?:the |your )?(?:SOAP )?Note\b/i],
  ['Ready processing state', /\bReady\b/i],
  [
    'failed-processing help',
    /\bprocessing\b.*\b(?:fails?|failed|failure|retry|try again|contact support)\b/i,
  ],
  ['transcript help', /\btranscript\b/i],
  ['generated-note help', /\bgenerated note\b/i],
  ['timestamp-linked source-audio help', /\btimestamp\b.*\bsource audio\b/i],
  ['account-deletion section', /\b(?:account deletion|delete your account)\b/i],
  ['Profile deletion location', /\bProfile\b.*\bDelete account\b/i],
  [
    'deletion consequence',
    /\b(?:permanently deletes? your account|deletion is permanent)\b.*\bsigns? you out\b/i,
  ],
  ['irreversible-deletion warning', /\b(?:(?:cannot|can['’]t) be undone|deletion is permanent)\b/i],
  ['retention-policy warning', /\bretained (?:per|under)\b.{0,80}\bretention policy\b/i],
  ['draft-note warning', /\bgenerated notes?\b.{0,100}\bdrafts?\b/i],
  [
    'professional-review warning',
    /\b(?:review by a veterinary professional|veterinary[- ]professional review)\b/i,
  ],
  [
    'medical-scope warning',
    /\bnot (?:an? )?independent diagnosis\b.*\btreatment\b.*\bprescription\b.*\bmedical advice\b/i,
  ],
]

const prohibitedCommercialCopy = [
  ['Pro', /\bPro\b/i],
  ['plan', /\bplans?\b/i],
  ['Pricing', /\bpricing\b/i],
  ['Buy', /\bbuy\b/i],
  ['purchase', /\bpurchas(?:e|es|ed|ing)\b/i],
  ['trial', /\btrials?\b/i],
  ['subscription', /\bsubscriptions?\b/i],
  ['credit', /\bcredits?\b/i],
  ['unlimited', /\bunlimited\b/i],
  ['upgrade', /\bupgrades?\b/i],
  ['checkout', /\bcheck[- ]?out\b/i],
  ['billing', /\bbilling\b/i],
  ['payment', /\bpayments?\b/i],
  ['registration', /\b(?:registration|register|sign up)\b/i],
  ['Start', /\bstart\b/i],
]

test('prerenders an isolated, noncommercial iOS support and legal surface', async () => {
  await assertPermanentRedirects()

  const support = await readPrerenderedRoute(supportHref)
  assertPrerenderedDocument(supportHref, support)

  const supportText = visibleText(support.body)
  for (const [description, pattern] of requiredSupportCopy) {
    assert.match(supportText, pattern, `Missing required ${description} on ${supportHref}`)
  }

  assert.match(supportText, /\bContact\b.*\b(?:support|Get help from Noctune)\b/i)
  assert.match(supportText, new RegExp(`\\b${escapeRegExp(supportEmail)}\\b`, 'i'))

  for (const [term, pattern] of prohibitedCommercialCopy) {
    assert.doesNotMatch(
      supportText,
      pattern,
      `${supportHref} contains prohibited commercial copy (${term})`,
    )
  }

  const supportAnchors = extractAnchors(support.body)
  assert.ok(supportAnchors.length > 0, `${supportHref} should contain support/legal links`)
  assertSupportAnchors(supportAnchors)
  assert.ok(
    supportAnchors.some(
      ({ href, text }) => href === privacyHref && /\bPrivacy Policy\b/i.test(text),
    ),
    `${supportHref} must link to ${privacyHref} with a Privacy Policy label`,
  )
  assert.ok(
    supportAnchors.some(
      ({ href, text }) => href === termsHref && /\bTerms of Service\b/i.test(text),
    ),
    `${supportHref} must link to ${termsHref} with a Terms of Service label`,
  )
  assert.ok(
    supportAnchors.some(
      ({ href }) =>
        mailtoAddress(href, { allowedQueryKeys: new Set(['subject']) }) === supportEmail,
    ),
    `${supportHref} must provide a mailto link for ${supportEmail}`,
  )

  for (const [route, heading] of [
    [privacyHref, /\bPrivacy Policy\b/i],
    [termsHref, /\bTerms of Service\b/i],
  ]) {
    const legal = await readPrerenderedRoute(route)
    assertPrerenderedDocument(route, legal)

    const legalText = visibleText(legal.body)
    assert.match(legalText, heading, `${route} is missing its legal-document heading`)
    assert.match(legalText, /\bEffective Date\b/i, `${route} is missing its effective date`)
    assert.match(legalText, /\bVersion\b/i, `${route} is missing its document version`)
    assert.ok(legalText.length > 500, `${route} does not contain the canonical legal document`)
    assertLegalAnchors(route, legalText, extractAnchors(legal.body))
  }
})

async function assertPermanentRedirects() {
  const manifest = JSON.parse(await fs.readFile(routesManifestPath, 'utf8'))

  for (const [source, destination] of permanentRedirects) {
    const redirect = manifest.redirects.find((candidate) => candidate.source === source)
    assert.ok(redirect, `Missing permanent redirect from ${source} to ${destination}`)
    assert.equal(redirect.destination, destination, `${source} redirects to the wrong destination`)
    assert.equal(redirect.statusCode, 308, `${source} must use a permanent 308 redirect`)
  }
}

async function readPrerenderedRoute(route) {
  const relativeRoute = route.replace(/^\/+|\/+$/g, '') || 'index'
  const candidates = [
    path.join(prerenderRoot, `${relativeRoute}.html`),
    path.join(prerenderRoot, relativeRoute, 'index.html'),
  ]

  for (const htmlPath of candidates) {
    try {
      const [html, metadataText] = await Promise.all([
        fs.readFile(htmlPath, 'utf8'),
        fs.readFile(htmlPath.replace(/\.html$/, '.meta'), 'utf8'),
      ])
      const body = extractBody(html, route)
      return {
        body,
        html,
        htmlPath,
        metadata: JSON.parse(metadataText),
      }
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
  }

  assert.fail(
    `Expected ${route} to be prerendered at ${candidates.join(' or ')}. Run pnpm build first.`,
  )
}

function assertPrerenderedDocument(route, document) {
  assert.match(document.html, /<!doctype html>/i, `${route} output is not an HTML document`)
  assert.equal(
    String(document.metadata?.headers?.['x-nextjs-prerender']),
    '1',
    `${route} is not marked as a Next.js prerender`,
  )

  const canonical = [...document.html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => ({
      href: attributeValue(tag, 'href'),
      rel: attributeValue(tag, 'rel'),
    }))
    .find(({ rel }) => rel?.toLowerCase().split(/\s+/).includes('canonical'))

  assert.ok(canonical?.href, `${route} is missing a canonical URL`)
  assert.equal(
    canonical.href,
    `https://docs.noctune.ai${route}`,
    `${route} has an unexpected canonical URL`,
  )

  const viewport = [...document.html.matchAll(/<meta\b[^>]*>/gi)]
    .map(([tag]) => ({
      content: attributeValue(tag, 'content'),
      name: attributeValue(tag, 'name'),
    }))
    .find(({ name }) => name?.toLowerCase() === 'viewport')

  assert.ok(viewport, `${route} is missing a viewport meta tag`)
  assert.match(viewport.content ?? '', /\bwidth=device-width\b/i)
  assert.match(viewport.content ?? '', /\binitial-scale=1(?:\.0)?\b/i)

  const renderedBody = stripNonVisibleElements(document.body)
  const renderedText = visibleText(renderedBody)
  assert.match(renderedBody, /<main\b/i, `${route} should use a semantic main landmark`)
  assert.match(
    renderedBody,
    /\bdata-layout=["']ios-support["']/i,
    `${route} is missing the dedicated iOS support layout marker`,
  )
  assert.doesNotMatch(renderedBody, /\bnextra-sidebar\b/i, `${route} exposes the docs sidebar`)
  assert.doesNotMatch(
    renderedText,
    /\bNoctune docs are in preview\b/i,
    `${route} exposes the normal docs banner`,
  )
  assert.doesNotMatch(
    renderedText,
    /\bQuestion\? Give us feedback\b/i,
    `${route} exposes the normal docs feedback chrome`,
  )
}

function assertSupportAnchors(anchors) {
  const allowedInternalHrefs = new Set([supportHref, privacyHref, termsHref])

  for (const anchor of anchors) {
    if (allowedInternalHrefs.has(anchor.href)) continue

    const address = mailtoAddress(anchor.href, { allowedQueryKeys: new Set(['subject']) })
    if (address === supportEmail) continue

    assert.fail(
      `${supportHref} contains disallowed anchor ${JSON.stringify(anchor.href)} (${JSON.stringify(anchor.text)})`,
    )
  }
}

function assertLegalAnchors(route, legalText, anchors) {
  const allowedInternalHrefs = new Set([supportHref, privacyHref, termsHref])

  for (const anchor of anchors) {
    if (allowedInternalHrefs.has(anchor.href)) continue

    const address = mailtoAddress(anchor.href, { allowedQueryKeys: new Set(['subject']) })
    if (address?.endsWith('@noctune.com')) {
      if (address === supportEmail) continue
      assert.match(
        legalText,
        new RegExp(`\\b${escapeRegExp(address)}\\b`, 'i'),
        `${route} mailto address must also be visible in the legal copy`,
      )
      continue
    }

    assert.fail(
      `${route} contains disallowed anchor ${JSON.stringify(anchor.href)} (${JSON.stringify(anchor.text)})`,
    )
  }
}

function mailtoAddress(href, { allowedQueryKeys = new Set() } = {}) {
  if (!href.toLowerCase().startsWith('mailto:')) return undefined

  const parsed = new URL(href)
  assert.equal(parsed.protocol, 'mailto:', `Invalid mailto href: ${href}`)
  assert.equal(parsed.hash, '', `Mailto href must not contain a fragment: ${href}`)
  for (const key of parsed.searchParams.keys()) {
    assert.ok(
      allowedQueryKeys.has(key),
      `Mailto href contains disallowed query key ${key}: ${href}`,
    )
  }

  let address
  try {
    address = decodeURIComponent(parsed.pathname)
  } catch {
    assert.fail(`Mailto href contains invalid percent encoding: ${href}`)
  }
  assert.match(address, /^[A-Z0-9._%+-]+@[A-Z0-9.-]+$/i, `Invalid mailto address: ${href}`)
  return address.toLowerCase()
}

function extractBody(html, route) {
  const match = html.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)
  assert.ok(match, `${route} prerender is missing a body element`)
  return match[1]
}

function extractAnchors(body) {
  const anchors = []
  const markup = stripNonVisibleElements(body)

  for (const match of markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const href = attributeValue(match[1], 'href')
    assert.ok(href, `Rendered anchor is missing href: ${match[0].slice(0, 160)}`)
    anchors.push({ href, text: visibleText(match[2]) })
  }

  return anchors
}

function attributeValue(markup, name) {
  const escapedName = escapeRegExp(name)
  const pattern = new RegExp(
    '(?:^|\\s)' + escapedName + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\'=<>`]+))',
    'i',
  )
  const match = markup.match(pattern)
  if (!match) return undefined
  return decodeHtmlEntities(match[1] ?? match[2] ?? match[3])
}

function visibleText(html) {
  return decodeHtmlEntities(
    stripNonVisibleElements(html)
      .replace(/<br\b[^>]*\/?\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripNonVisibleElements(html) {
  return html
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    bull: '•',
    copy: '©',
    gt: '>',
    hellip: '…',
    ldquo: '“',
    lsquo: '‘',
    lt: '<',
    mdash: '—',
    middot: '·',
    nbsp: '\u00a0',
    ndash: '–',
    quot: '"',
    rdquo: '”',
    reg: '®',
    rsquo: '’',
    trade: '™',
  }

  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z][\da-z]+);/gi, (entity, key) => {
    if (!key.startsWith('#')) return named[key.toLowerCase()] ?? entity

    const hexadecimal = key[1]?.toLowerCase() === 'x'
    const codePoint = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10)
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return '\ufffd'

    try {
      return String.fromCodePoint(codePoint)
    } catch {
      return '\ufffd'
    }
  })
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
