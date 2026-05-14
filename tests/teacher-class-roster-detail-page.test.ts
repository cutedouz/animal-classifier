import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/app/teacher/classes/[classId]/page.tsx', 'utf8')
assert.equal(source.includes('查看學生作答'), true)
assert.equal(source.includes('/submissions'), true)
assert.equal(source.includes('檢視學生個人任務與小組任務的提交狀態與作答內容。'), true)
