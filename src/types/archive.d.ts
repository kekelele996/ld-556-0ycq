import type { FamilyMember } from './family'

export type ReadinessItemKey = 'birthPlace' | 'bio' | 'avatar' | 'stories' | 'photos' | 'legacy'

export interface ReadinessItem {
  key: ReadinessItemKey
  label: string
  done: boolean
  detail: string
}

export interface MemberReadiness {
  member: FamilyMember
  items: ReadinessItem[]
  missing: ReadinessItem[]
  percent: number
}

export interface ReadinessSignals {
  storyCount: number
  photoCount: number
  validPlanCount: number
}
