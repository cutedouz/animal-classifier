#!/usr/bin/env node
import { randomBytes, scryptSync } from 'node:crypto'

const password = process.argv[2]

if (!password) {
  console.error('Usage: node scripts/create_teacher_password_hash.mjs "your-password"')
  process.exit(1)
}

const salt = randomBytes(16)
const cost = 16384
const blockSize = 8
const parallelization = 1
const keyLength = 64

const key = scryptSync(password, salt, keyLength, {
  N: cost,
  r: blockSize,
  p: parallelization,
})

const hash = [
  'scrypt',
  String(cost),
  String(blockSize),
  String(parallelization),
  salt.toString('base64url'),
  key.toString('base64url'),
].join('$')

console.log(hash)
