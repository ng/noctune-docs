// Adapters return encoded audio. The pipeline owns timing, caching and rendering.
const adapters = new Map()
export function registerProvider(name, adapter) {
  if (!name || typeof adapter?.synthesize !== 'function' || typeof adapter?.validate !== 'function')
    throw Error('Invalid speech adapter')
  adapters.set(name, adapter)
}
export function getProvider(name) {
  const adapter = adapters.get(name)
  if (!adapter) throw Error(`Unknown speech provider: ${name}`)
  return adapter
}
async function audioResponse(url, headers, body, fetchImpl, extension = 'wav') {
  let response
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    })
  } catch {
    throw Error('Speech request failed or timed out; check connectivity and provider status')
  }
  // Never print response bodies: providers can echo credentials or input text.
  if (!response.ok) throw Error(`Speech provider returned HTTP ${response.status}`)
  if (!/^(audio\/|application\/octet-stream)/i.test(response.headers.get('content-type') || ''))
    throw Error('Speech provider returned non-audio content')
  const bytes = Buffer.from(await response.arrayBuffer())
  if (!bytes.length) throw Error('Speech provider returned empty audio')
  return { bytes, extension }
}
function requireKey(env, name) {
  if (!env[name]?.trim()) throw Error(`Set ${name} in your local tutorial environment file`)
  return env[name]
}
registerProvider('deepgram', {
  validate(config, env) {
    requireKey(env, 'DEEPGRAM_API_KEY')
    if (!/^(flux-|aura-)/.test(config.model))
      throw Error('Deepgram model must be a full flux-* or aura-* voice model ID')
    if (config.voice || config.instructions)
      throw Error(
        'Deepgram uses a voice in its model ID; separate voice/instructions are unsupported',
      )
  },
  async synthesize({ text, config, env, fetchImpl = fetch }) {
    this.validate(config, env)
    const version = config.model.startsWith('flux-') ? 'v2' : 'v1'
    const url = new URL(`https://api.deepgram.com/${version}/speak`)
    for (const [key, value] of Object.entries({
      model: config.model,
      encoding: 'flac',
      sample_rate: '48000',
    }))
      url.searchParams.set(key, value)
    return audioResponse(
      url,
      { Authorization: `Token ${env.DEEPGRAM_API_KEY}` },
      { text },
      fetchImpl,
      'flac',
    )
  },
})
registerProvider('openai', {
  validate(config, env) {
    requireKey(env, 'OPENAI_API_KEY')
    if (!config.voice) throw Error('Set TUTORIAL_TTS_VOICE for OpenAI')
    if (config.instructions && !config.model.startsWith('gpt-4o-mini-tts'))
      throw Error('Instructions require an OpenAI model that supports them')
  },
  async synthesize({ text, config, env, fetchImpl = fetch }) {
    this.validate(config, env)
    return audioResponse(
      'https://api.openai.com/v1/audio/speech',
      { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      {
        model: config.model,
        voice: config.voice,
        input: text,
        response_format: 'wav',
        ...(config.instructions ? { instructions: config.instructions } : {}),
      },
      fetchImpl,
    )
  },
})
