import assert from 'node:assert/strict'
import test from 'node:test'

import { applyIosLineMarkers } from '../lib/ios-line-markers.ts'

test('lines without markers pass through unchanged', () => {
  const input = '# Terms of Service\n\n- You retain ownership of all clinical data.'
  assert.equal(applyIosLineMarkers(input), input)
})

test('a marked line is replaced entirely by the marker content', () => {
  const input = '## 8. Fees and Billing <!-- ios-line: ## 8. Service Access -->'
  assert.equal(applyIosLineMarkers(input), '## 8. Service Access')
})

test('an empty marker drops the line', () => {
  const input = ['- kept line', '- dropped line <!-- ios-line: -->', '- also kept'].join('\n')
  assert.equal(applyIosLineMarkers(input), ['- kept line', '- also kept'].join('\n'))
})

test('the canonical fees section renders without commercial wording', () => {
  const canonical = [
    '## 8. Fees and Billing <!-- ios-line: ## 8. Service Access -->',
    '',
    '- Use of the Service may be subject to fees as described in your subscription plan. <!-- ios-line: - The features available to your account are determined by the service agreement under which your account was provisioned. -->',
    '- We reserve the right to modify pricing with reasonable notice. <!-- ios-line: -->',
    '',
    '## 9. Termination',
  ].join('\n')

  const rendered = applyIosLineMarkers(canonical)

  assert.equal(
    rendered,
    [
      '## 8. Service Access',
      '',
      '- The features available to your account are determined by the service agreement under which your account was provisioned.',
      '',
      '## 9. Termination',
    ].join('\n'),
  )
  assert.doesNotMatch(rendered, /subscription|billing|pricing|fees/i)
})
