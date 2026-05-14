import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/app/teacher/classes/[classId]/submissions/page.tsx', 'utf8')
assert.equal(source.includes('學生作答檢視'), true)
assert.equal(source.includes('個人任務作答狀態'), true)
assert.equal(source.includes('小組任務作答狀態'), true)
assert.equal(source.includes('尚未開始'), true)
assert.equal(source.includes('草稿'), true)
assert.equal(source.includes('已提交'), true)
assert.equal(source.includes('已取得'), true)
assert.equal(source.includes('尚未取得'), true)
assert.equal(source.includes('不提供評分、退回或修改學生作答'), true)
