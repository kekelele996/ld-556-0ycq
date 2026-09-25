import type { FamilyMember } from './family'

export type RelationIssueKind =
  | 'dead-parent-id'
  | 'dead-child-id'
  | 'dead-spouse-id'
  | 'duplicate-relation-id'
  | 'missing-parent-link'
  | 'missing-child-link'
  | 'parent-conflict'

export interface RelationIssue {
  kind: RelationIssueKind
  memberId: string
  relatedId: string
  /** true 表示保存时自动修复；false 表示冲突记录保留两份，仅提示人工确认 */
  autoFix: boolean
  message: string
}

export interface RelationRepairPlan {
  members: FamilyMember[]
  issues: RelationIssue[]
}
