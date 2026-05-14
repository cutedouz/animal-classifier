import assert from 'node:assert/strict'
import { contentJsonToSafeFields, loadTeacherClassSubmissionReview } from '../src/lib/teacher/teacher-submission-review'

const visibleTask = {
  isVisible: true,
  taskTemplateVersion: {
    id: 'task-version-1',
    taskCode: 'A1',
    title: '永續行動提案',
    responseLevel: 'individual',
    displayOrder: 1,
    taskFields: [{ fieldName: 'answer', fieldLabel: '作答內容' }],
  },
}

const hiddenTask = {
  isVisible: false,
  taskTemplateVersion: { taskCode: 'HIDDEN', title: '隱藏任務', responseLevel: 'individual', displayOrder: 0, taskFields: [] },
}

const submittedAt = new Date('2026-05-01T08:00:00.000Z')

function prismaFor(classRecord: any, teacherProfile: any = { id: 'teacher-profile-1' }) {
  return {
    teacherProfile: { findFirst: async () => teacherProfile },
    class: { findFirst: async ({ where }: any) => where.teacherProfileId === teacherProfile?.id ? classRecord : null },
  }
}

const classRecord = {
  id: 'class-1',
  name: '六年甲班',
  code: '6A',
  rosterStudents: [
    { seatNo: '10', studentProfile: { id: 'student-10', studentName: '王十', groupMembers: [{ group: { name: '第二組' } }] } },
    { seatNo: '2', studentProfile: { id: 'student-2', studentName: '林二', groupMembers: [{ group: { name: '第一組' } }] } },
  ],
  groups: [
    { id: 'group-b', name: '第二組', members: [{ studentProfile: { seatNo: '10', studentName: '王十' } }] },
    { id: 'group-a', name: '第一組', members: [{ studentProfile: { seatNo: '2', studentName: '林二' } }] },
  ],
  courseTaskSettings: [hiddenTask, visibleTask],
  submissions: [
    { taskCode: 'A1', studentProfileId: 'student-2', status: 'draft', submissionVersions: [{ versionNumber: 1, isFinal: false, contentJson: { answer: '草稿' }, aiFeedbackLogs: [] }] },
    { taskCode: 'A1', studentProfileId: 'student-10', status: 'submitted', submissionVersions: [{ versionNumber: 2, isFinal: true, submittedAt, contentJson: { answer: '終稿' }, aiFeedbackLogs: [{ status: 'completed', createdAt: submittedAt }] }] },
    { taskCode: 'A1', groupId: 'group-a', status: 'draft', submissionVersions: [{ versionNumber: 1, isFinal: false, contentJson: { answer: '小組草稿' }, aiFeedbackLogs: [] }] },
    { taskCode: 'A1', groupId: 'group-b', status: 'submitted', submissionVersions: [{ versionNumber: 3, isFinal: true, submittedAt, contentJson: { answer: '小組終稿' }, aiFeedbackLogs: [] }] },
  ],
}

async function loaderExamples() {
  await assert.rejects(() => loadTeacherClassSubmissionReview({ teacherUserId: '', classId: 'class-1' }, prismaFor(classRecord)))
  await assert.rejects(() => loadTeacherClassSubmissionReview({ teacherUserId: 'teacher-user-1', classId: 'class-1' }, prismaFor(classRecord, null)))
  await assert.rejects(() => loadTeacherClassSubmissionReview({ teacherUserId: 'teacher-user-1', classId: 'class-1' }, { teacherProfile: { findFirst: async () => ({ id: 'other' }) }, class: { findFirst: async () => null } }))

  const review = await loadTeacherClassSubmissionReview({ teacherUserId: 'teacher-user-1', classId: 'class-1' }, prismaFor(classRecord))
  assert.equal(review.class.name, '六年甲班')
  assert.deepEqual(review.tasks.map((task) => task.taskCode), ['A1'])
  assert.deepEqual(review.individualRows.map((row: any) => row.seatNo), ['2', '10'])
  assert.equal(review.individualRows[0].taskStatuses[0].status, 'draft')
  assert.equal(review.individualRows[1].taskStatuses[0].status, 'submitted')
  assert.equal(review.individualRows[1].taskStatuses[0].submittedAt?.toISOString(), submittedAt.toISOString())
  assert.equal(review.individualRows[1].taskStatuses[0].hasAiFeedback, true)
  assert.deepEqual(review.groupRows.map((row: any) => row.groupName), ['第一組', '第二組'])
  assert.equal(review.groupRows[0].taskStatuses[0].status, 'draft')
  assert.equal(review.groupRows[1].taskStatuses[0].status, 'submitted')
}

function privacyExamples() {
  const safeFields = contentJsonToSafeFields({ answer: '安全內容', participantCode: 'P001', anonymousCode: 'A001', password: 'secret', password_hash: 'hash', rawResponseJson: { unsafe: true }, email: 'x@example.com' }, [{ fieldName: 'answer', fieldLabel: '作答內容' }])
  const serialized = JSON.stringify(safeFields)
  assert.equal(serialized.includes('安全內容'), true)
  assert.equal(serialized.includes('participantCode'), false)
  assert.equal(serialized.includes('anonymousCode'), false)
  assert.equal(serialized.includes('secret'), false)
  assert.equal(serialized.includes('rawResponseJson'), false)
}

void loaderExamples
void privacyExamples
