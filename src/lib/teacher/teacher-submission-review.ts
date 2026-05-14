export type SubmissionReviewStatus = 'not_started' | 'draft' | 'submitted'

type PrismaLike = Record<string, any>

type LoadBaseInput = {
  teacherUserId: string
  classId: string
}

type DetailInput = LoadBaseInput & {
  taskCode: string
}

export type SafeContentField = {
  key: string
  label: string
  value: string
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'participantCode',
  'anonymousCode',
  'userId',
  'studentProfileId',
  'groupId',
  'rosterStudentId',
  'email',
  'hash',
  'passwordHash',
  'password_hash',
  'rawResponseJson',
])

function getDefaultPrisma(): PrismaLike {
  throw new Error('Prisma client is required for teacher submission review loaders.')
}

function requireText(value: string | undefined, fieldName: string) {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`)
  }
  return value.trim()
}

function numericSeatNo(value: unknown) {
  const parsed = Number(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
}

function bySeatNo<T extends { seatNo?: string | null; studentName?: string | null }>(a: T, b: T) {
  const seatDiff = numericSeatNo(a.seatNo) - numericSeatNo(b.seatNo)
  if (seatDiff !== 0) return seatDiff
  return String(a.seatNo ?? '').localeCompare(String(b.seatNo ?? ''), 'zh-Hant') ||
    String(a.studentName ?? '').localeCompare(String(b.studentName ?? ''), 'zh-Hant')
}

function cleanString(value: unknown, fallback = '—') {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  if (typeof value === 'number') return String(value)
  return fallback
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function sortTasks(settings: any[]) {
  return [...settings]
    .filter((setting) => setting?.isVisible !== false && setting?.visible !== false)
    .map((setting) => {
      const version = setting.taskTemplateVersion ?? setting.taskTemplate ?? setting.task ?? setting
      return {
        id: version.id ?? setting.taskTemplateVersionId ?? setting.taskTemplateId,
        taskCode: cleanString(version.taskCode ?? version.code ?? setting.taskCode, ''),
        title: cleanString(version.title ?? version.name ?? setting.title, '未命名任務'),
        responseLevel: cleanString(version.responseLevel ?? setting.responseLevel, 'individual'),
        displayOrder: Number(version.displayOrder ?? setting.displayOrder ?? 0),
        fields: Array.isArray(version.taskFields) ? version.taskFields : Array.isArray(version.fields) ? version.fields : [],
      }
    })
    .filter((task) => task.taskCode)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.taskCode.localeCompare(b.taskCode))
}

function latestVersion(versions: any[], finalOnly = false) {
  const candidates = versions.filter((version) => !finalOnly || version?.isFinal === true)
  return [...candidates].sort((a, b) => Number(b.versionNumber ?? 0) - Number(a.versionNumber ?? 0))[0] ?? null
}

function aiLogs(version: any) {
  if (!version) return []
  return version.aiFeedbackLogs ?? version.aiFeedbackLog ?? version.feedbackLogs ?? []
}

function buildAiFeedbackSummary(finalVersion: any, draftVersion: any) {
  const version = finalVersion ?? draftVersion
  const logs = [...aiLogs(finalVersion), ...(finalVersion ? [] : aiLogs(draftVersion))]
  const latestLog = [...logs].sort((a, b) => (toDate(b.createdAt ?? b.updatedAt)?.getTime() ?? 0) - (toDate(a.createdAt ?? a.updatedAt)?.getTime() ?? 0))[0] ?? null
  return {
    hasAiFeedback: logs.length > 0,
    lastFeedbackAt: toDate(latestLog?.createdAt ?? latestLog?.updatedAt),
    status: cleanString(latestLog?.status ?? (logs.length > 0 ? 'completed' : 'not_started'), logs.length > 0 ? 'completed' : 'not_started'),
    versionNumber: version?.versionNumber ?? null,
  }
}

function classifySubmission(submission: any) {
  if (!submission) {
    return { status: 'not_started' as const, latestVersionNumber: null, submittedAt: null, finalVersion: null, draftVersion: null, hasAiFeedback: false }
  }

  const versions = Array.isArray(submission.submissionVersions) ? submission.submissionVersions : Array.isArray(submission.versions) ? submission.versions : []
  const finalVersion = latestVersion(versions, true)
  const draftVersion = latestVersion(versions, false)
  const status: SubmissionReviewStatus = submission.status === 'submitted' || finalVersion ? 'submitted' : 'draft'
  const feedbackVersion = finalVersion ?? draftVersion

  return {
    status,
    latestVersionNumber: (finalVersion ?? draftVersion)?.versionNumber ?? null,
    submittedAt: finalVersion ? toDate(finalVersion.submittedAt) : null,
    finalVersion,
    draftVersion,
    hasAiFeedback: aiLogs(feedbackVersion).length > 0,
  }
}

function findSubmission(submissions: any[], taskCode: string, owner: { studentProfileId?: string; groupId?: string }) {
  return submissions.find((submission) => {
    const submissionTaskCode = submission.taskCode ?? submission.taskTemplateVersion?.taskCode ?? submission.taskTemplate?.code
    const taskMatches = submissionTaskCode === taskCode
    const studentMatches = owner.studentProfileId ? String(submission.studentProfileId) === String(owner.studentProfileId) : true
    const groupMatches = owner.groupId ? String(submission.groupId) === String(owner.groupId) : true
    return taskMatches && studentMatches && groupMatches
  }) ?? null
}

function getStudentName(row: any) {
  return cleanString(row.studentName ?? row.name ?? row.displayName ?? row.rosterStudent?.studentName ?? row.rosterStudent?.name, '未命名學生')
}

function normalizeRosterStudent(row: any) {
  const profile = row.studentProfile ?? row.profile ?? row
  const groupLinks = profile.groupMembers ?? profile.groups ?? row.groupMembers ?? []
  const groupNames = groupLinks.map((link: any) => cleanString(link.group?.name ?? link.groupName ?? link.name, '')).filter(Boolean).sort((a: string, b: string) => a.localeCompare(b, 'zh-Hant'))
  return {
    studentProfileId: String(profile.id ?? row.studentProfileId ?? ''),
    seatNo: cleanString(row.seatNo ?? profile.seatNo, ''),
    studentName: getStudentName(row),
    groupNames,
  }
}

function normalizeGroup(group: any) {
  const members = (group.members ?? group.groupMembers ?? [])
    .map((member: any) => {
      const student = member.studentProfile ?? member.student ?? member
      return {
        seatNo: cleanString(student.seatNo ?? member.seatNo, ''),
        studentName: getStudentName(student),
      }
    })
    .sort(bySeatNo)
  return {
    groupId: String(group.id),
    groupName: cleanString(group.name ?? group.groupName, '未命名小組'),
    members,
  }
}

async function loadOwnedClass(input: LoadBaseInput, prisma: PrismaLike) {
  const teacherUserId = requireText(input.teacherUserId, 'teacherUserId')
  const classId = requireText(input.classId, 'classId')

  const teacherProfile = await prisma.teacherProfile?.findFirst?.({
    where: { userId: teacherUserId, isActive: true },
    select: { id: true, userId: true, isActive: true },
  })

  if (!teacherProfile) throw new Error('Active teacher profile not found')

  const classRecord = await prisma.class?.findFirst?.({
    where: { id: classId, teacherProfileId: teacherProfile.id },
    include: {
      rosterStudents: { include: { studentProfile: { include: { groupMembers: { include: { group: true } } } } } },
      groups: { include: { members: { include: { studentProfile: true } } } },
      courseTaskSettings: { include: { taskTemplateVersion: { include: { taskFields: true } } } },
      submissions: { include: { submissionVersions: { include: { aiFeedbackLogs: true } }, taskTemplateVersion: true } },
    },
  })

  if (!classRecord) throw new Error('Class not found or not owned by teacher')
  return { teacherProfile, classRecord }
}

export async function loadTeacherClassSubmissionReview(input: LoadBaseInput, prisma: PrismaLike = getDefaultPrisma()) {
  const { classRecord } = await loadOwnedClass(input, prisma)
  const tasks = sortTasks(classRecord.courseTaskSettings ?? [])
  const submissions = classRecord.submissions ?? []
  const baseHref = `/teacher/classes/${input.classId}/submissions`

  const individualRows = (classRecord.rosterStudents ?? [])
    .map(normalizeRosterStudent)
    .filter((student: any) => student.studentProfileId)
    .sort(bySeatNo)
    .map((student: any) => ({
      ...student,
      taskStatuses: tasks.map((task) => {
        const result = classifySubmission(findSubmission(submissions, task.taskCode, { studentProfileId: student.studentProfileId }))
        return {
          taskCode: task.taskCode,
          status: result.status,
          latestVersionNumber: result.latestVersionNumber,
          submittedAt: result.submittedAt,
          hasAiFeedback: result.hasAiFeedback,
          detailHref: `${baseHref}/individual/${encodeURIComponent(student.studentProfileId)}/${encodeURIComponent(task.taskCode)}`,
        }
      }),
    }))

  const groupRows = (classRecord.groups ?? [])
    .map(normalizeGroup)
    .sort((a: any, b: any) => a.groupName.localeCompare(b.groupName, 'zh-Hant'))
    .map((group: any) => ({
      groupId: group.groupId,
      groupName: group.groupName,
      memberNames: group.members.map((member: any) => member.studentName),
      taskStatuses: tasks.map((task) => {
        const result = classifySubmission(findSubmission(submissions, task.taskCode, { groupId: group.groupId }))
        return {
          taskCode: task.taskCode,
          status: result.status,
          latestVersionNumber: result.latestVersionNumber,
          submittedAt: result.submittedAt,
          hasAiFeedback: result.hasAiFeedback,
          detailHref: `${baseHref}/group/${encodeURIComponent(group.groupId)}/${encodeURIComponent(task.taskCode)}`,
        }
      }),
    }))

  return {
    class: { id: String(classRecord.id), name: cleanString(classRecord.name, '未命名班級'), code: cleanString(classRecord.code, '') },
    tasks: tasks.map(({ taskCode, title, responseLevel, displayOrder }) => ({ taskCode, title, responseLevel, displayOrder })),
    individualRows,
    groupRows,
  }
}

function valueToText(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join('、')
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !isSensitiveKey(key))
    .map(([key, item]) => `${key}: ${valueToText(item)}`)
    .filter(Boolean)
    .join('；')
  return String(value)
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function isSensitiveKey(key: string) {
  const lowered = key.toLowerCase()
  return SENSITIVE_KEYS.has(key) || lowered.includes('password') || lowered.includes('token') || lowered.includes('hash') || lowered.includes('participantcode') || lowered.includes('anonymouscode') || lowered.includes('userid') || lowered.includes('studentprofileid') || lowered.includes('groupid') || lowered.includes('rosterstudentid') || lowered.includes('email')
}

export function contentJsonToSafeFields(contentJson: unknown, taskFields: any[] = []): SafeContentField[] {
  const parsedContent = typeof contentJson === 'string' ? safeParseJson(contentJson) : contentJson
  if (!parsedContent || typeof parsedContent !== 'object' || Array.isArray(parsedContent)) return []
  const content = parsedContent as Record<string, unknown>
  const fieldLabels = new Map(taskFields.map((field) => [String(field.fieldName ?? field.name ?? ''), cleanString(field.fieldLabel ?? field.label ?? field.fieldName ?? field.name, '')]))
  const orderedKeys = [...fieldLabels.keys(), ...Object.keys(content).filter((key) => !fieldLabels.has(key))]
  return Array.from(new Set(orderedKeys))
    .filter((key) => key && Object.prototype.hasOwnProperty.call(content, key) && !isSensitiveKey(key))
    .map((key) => ({ key, label: fieldLabels.get(key) || key, value: valueToText(content[key]) }))
    .filter((field) => field.value.length > 0)
}

async function loadDetail(input: DetailInput & { studentProfileId?: string; groupId?: string }, prisma: PrismaLike) {
  const { classRecord } = await loadOwnedClass(input, prisma)
  const task = sortTasks(classRecord.courseTaskSettings ?? []).find((candidate) => candidate.taskCode === input.taskCode)
  if (!task) throw new Error('Task not found or not visible')

  const submission = findSubmission(classRecord.submissions ?? [], task.taskCode, input.studentProfileId ? { studentProfileId: input.studentProfileId } : { groupId: input.groupId })
  const classified = classifySubmission(submission)
  const hasPostSubmitDraft = Boolean(classified.finalVersion && classified.draftVersion && Number(classified.draftVersion.versionNumber ?? 0) > Number(classified.finalVersion.versionNumber ?? 0))
  const displayVersion = classified.finalVersion ?? classified.draftVersion

  return {
    class: { id: String(classRecord.id), name: cleanString(classRecord.name, '未命名班級'), code: cleanString(classRecord.code, '') },
    task: { taskCode: task.taskCode, title: task.title, responseLevel: task.responseLevel, displayOrder: task.displayOrder },
    submissionStatus: classified.status,
    latestFinalVersion: classified.finalVersion ? { versionNumber: classified.finalVersion.versionNumber ?? null, submittedAt: toDate(classified.finalVersion.submittedAt) } : null,
    latestDraftVersion: classified.draftVersion ? { versionNumber: classified.draftVersion.versionNumber ?? null, submittedAt: toDate(classified.draftVersion.submittedAt) } : null,
    hasPostSubmitDraft,
    aiFeedbackSummary: buildAiFeedbackSummary(classified.finalVersion, classified.draftVersion),
    safeContentFields: contentJsonToSafeFields(displayVersion?.contentJson, task.fields),
  }
}

export async function loadTeacherIndividualSubmissionDetail(input: DetailInput & { studentProfileId: string }, prisma: PrismaLike = getDefaultPrisma()) {
  requireText(input.studentProfileId, 'studentProfileId')
  const { classRecord } = await loadOwnedClass(input, prisma)
  const student = (classRecord.rosterStudents ?? []).map(normalizeRosterStudent).find((candidate: any) => candidate.studentProfileId === input.studentProfileId)
  if (!student) throw new Error('Student not found in class')
  const detail = await loadDetail(input, prisma)
  return { ...detail, student: { seatNo: student.seatNo, studentName: student.studentName, groupNames: student.groupNames } }
}

export async function loadTeacherGroupSubmissionDetail(input: DetailInput & { groupId: string }, prisma: PrismaLike = getDefaultPrisma()) {
  requireText(input.groupId, 'groupId')
  const { classRecord } = await loadOwnedClass(input, prisma)
  const group = (classRecord.groups ?? []).map(normalizeGroup).find((candidate: any) => candidate.groupId === input.groupId)
  if (!group) throw new Error('Group not found in class')
  const detail = await loadDetail(input, prisma)
  return { ...detail, group: { groupName: group.groupName, members: group.members } }
}
