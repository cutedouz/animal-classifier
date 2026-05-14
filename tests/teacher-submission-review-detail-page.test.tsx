import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const individual = readFileSync('src/app/teacher/classes/[classId]/submissions/individual/[studentProfileId]/[taskCode]/page.tsx', 'utf8')
const group = readFileSync('src/app/teacher/classes/[classId]/submissions/group/[groupId]/[taskCode]/page.tsx', 'utf8')
const loader = readFileSync('src/lib/teacher/teacher-submission-review.ts', 'utf8')

assert.equal(individual.includes('學生姓名'), true)
assert.equal(individual.includes('任務名稱'), true)
assert.equal(individual.includes('此學生目前只有草稿，尚未提交終稿。'), true)
assert.equal(group.includes('小組作答內容'), true)
assert.equal(group.includes('成員'), true)
assert.equal(loader.includes('rawResponseJson'), true)
assert.equal(loader.includes('participantCode'), true)
assert.equal(loader.includes('contentJsonToSafeFields'), true)
assert.equal(individual.includes('無法檢視此學生作答'), true)
