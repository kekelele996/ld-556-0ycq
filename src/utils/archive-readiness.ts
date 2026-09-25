import type { ArchiveItem, MemberArchiveReport } from '@/types/archive'
import type { FamilyMember } from '@/types/family'
import type { LegacyPlan } from '@/types/legacy'
import type { Photo } from '@/types/photo'
import type { Story } from '@/types/story'

export const ARCHIVE_ITEM_LABELS: Record<ArchiveItem['key'], string> = {
  birthPlace: '出生地',
  bio: '简介',
  avatar: '头像',
  stories: '故事',
  photos: '照片',
  legacy: '有效遗产规划'
}

function memberStories(memberId: string, stories: Story[]) {
  return stories.filter((story) => story.memberId === memberId)
}

function memberPhotos(memberId: string, photos: Photo[]) {
  return photos.filter((photo) => photo.memberId === memberId || photo.people.includes(memberId))
}

function activePlans(memberId: string, plans: LegacyPlan[]) {
  return plans.filter((plan) => plan.memberId === memberId && plan.status === 'finalized')
}

export function buildMemberArchiveReport(
  member: FamilyMember,
  stories: Story[],
  photos: Photo[],
  plans: LegacyPlan[]
): MemberArchiveReport {
  const storyCount = memberStories(member.id, stories).length
  const photoCount = memberPhotos(member.id, photos).length
  const planCount = activePlans(member.id, plans).length

  const items: ArchiveItem[] = [
    {
      key: 'birthPlace',
      label: ARCHIVE_ITEM_LABELS.birthPlace,
      done: Boolean(member.birthPlace.trim()),
      detail: member.birthPlace.trim() ? member.birthPlace : '未记录出生地'
    },
    {
      key: 'bio',
      label: ARCHIVE_ITEM_LABELS.bio,
      done: Boolean(member.bio.trim()),
      detail: member.bio.trim() ? '已撰写简介' : '未撰写简介'
    },
    {
      key: 'avatar',
      label: ARCHIVE_ITEM_LABELS.avatar,
      done: Boolean(member.avatar.trim()),
      detail: member.avatar.trim() ? '已设置头像' : '未设置头像'
    },
    {
      key: 'stories',
      label: ARCHIVE_ITEM_LABELS.stories,
      done: storyCount > 0,
      detail: storyCount > 0 ? `${storyCount} 篇故事` : '还没有关联故事'
    },
    {
      key: 'photos',
      label: ARCHIVE_ITEM_LABELS.photos,
      done: photoCount > 0,
      detail: photoCount > 0 ? `${photoCount} 张照片` : '还没有关联照片'
    },
    {
      key: 'legacy',
      label: ARCHIVE_ITEM_LABELS.legacy,
      done: planCount > 0,
      detail: planCount > 0 ? `${planCount} 份已定稿规划` : '没有已定稿的遗产规划'
    }
  ]

  const doneCount = items.filter((item) => item.done).length
  return {
    member,
    items,
    doneCount,
    totalCount: items.length,
    percent: Math.round((doneCount / items.length) * 100),
    missing: items.filter((item) => !item.done)
  }
}

export function buildArchiveReports(
  members: FamilyMember[],
  stories: Story[],
  photos: Photo[],
  plans: LegacyPlan[]
): MemberArchiveReport[] {
  return members
    .map((member) => buildMemberArchiveReport(member, stories, photos, plans))
    .sort((a, b) => a.percent - b.percent || a.member.generation - b.member.generation)
}

export function overallArchivePercent(reports: MemberArchiveReport[]): number {
  const total = reports.reduce((sum, report) => sum + report.totalCount, 0)
  if (!total) return 0
  const done = reports.reduce((sum, report) => sum + report.doneCount, 0)
  return Math.round((done / total) * 100)
}
