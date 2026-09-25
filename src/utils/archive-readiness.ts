import type { FamilyMember } from '@/types/family'
import type { LegacyPlan } from '@/types/legacy'
import type { MemberReadiness, ReadinessItem, ReadinessItemKey, ReadinessSignals } from '@/types/archive'

export const readinessItemLabels: Record<ReadinessItemKey, string> = {
  birthPlace: '出生地',
  bio: '简介',
  avatar: '头像',
  stories: '家族故事',
  photos: '老照片',
  legacy: '有效遗产规划'
}

/** 有效遗产规划：已定稿（finalized）的规划；草稿尚未定稿、归档已退役，均不计入。 */
export function isValidLegacyPlan(plan: LegacyPlan) {
  return plan.status === 'finalized'
}

export function buildMemberReadiness(member: FamilyMember, signals: ReadinessSignals): MemberReadiness {
  const birthPlace = member.birthPlace.trim()
  const bio = member.bio.trim()
  const items: ReadinessItem[] = [
    { key: 'birthPlace', label: readinessItemLabels.birthPlace, done: Boolean(birthPlace), detail: birthPlace || '未记录' },
    { key: 'bio', label: readinessItemLabels.bio, done: Boolean(bio), detail: bio ? `已记录 ${bio.length} 字` : '未记录' },
    { key: 'avatar', label: readinessItemLabels.avatar, done: Boolean(member.avatar), detail: member.avatar ? '已上传' : '未上传' },
    { key: 'stories', label: readinessItemLabels.stories, done: signals.storyCount > 0, detail: signals.storyCount > 0 ? `${signals.storyCount} 篇` : '暂无故事' },
    { key: 'photos', label: readinessItemLabels.photos, done: signals.photoCount > 0, detail: signals.photoCount > 0 ? `${signals.photoCount} 张` : '暂无照片' },
    { key: 'legacy', label: readinessItemLabels.legacy, done: signals.validPlanCount > 0, detail: signals.validPlanCount > 0 ? `${signals.validPlanCount} 份已定稿` : '暂无定稿规划' }
  ]
  const missing = items.filter((item) => !item.done)
  const percent = Math.round(((items.length - missing.length) / items.length) * 100)
  return { member, items, missing, percent }
}
