import type { FamilyMember } from './family'

export type ArchiveItemKey = 'birthPlace' | 'bio' | 'avatar' | 'stories' | 'photos' | 'legacy'

export interface ArchiveItem {
  key: ArchiveItemKey
  label: string
  done: boolean
  detail: string
}

export interface MemberArchiveReport {
  member: FamilyMember
  items: ArchiveItem[]
  doneCount: number
  totalCount: number
  percent: number
  missing: ArchiveItem[]
}

export type RelationFixType = 'child-linked' | 'parent-linked' | 'invalid-parent' | 'invalid-spouse' | 'invalid-child' | 'duplicate-child'

export interface RelationFix {
  type: RelationFixType
  memberId: string
  detail: string
}

export interface RelationConflict {
  memberId: string
  detail: string
}

export interface RelationRepairResult {
  members: FamilyMember[]
  fixes: RelationFix[]
  conflicts: RelationConflict[]
}
