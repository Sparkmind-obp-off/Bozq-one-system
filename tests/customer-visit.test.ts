import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeWhatsapp } from '../src/index'

test('WhatsApp normalization creates stable Indonesian identity keys', () => {
  assert.equal(normalizeWhatsapp('0812-3456-7890'), '6281234567890')
  assert.equal(normalizeWhatsapp('+62 812 3456 7890'), '6281234567890')
  assert.equal(normalizeWhatsapp('81234567890'), '6281234567890')
  assert.equal(normalizeWhatsapp(''), null)
})

test('customer identity must not be inferred from name alone', () => {
  assert.equal(normalizeWhatsapp('Budi'), null)
  assert.equal(normalizeWhatsapp('081234567890'), '6281234567890')
})
