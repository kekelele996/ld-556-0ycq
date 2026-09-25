import { strict as assert } from 'node:assert'
import { defaultMembers, defaultStories, defaultPhotos, defaultLegacyPlans } from '../src/constants/default-templates'
import type { FamilyMember } from '../src/types/family'
import { Gender } from '../src/constants/enums'
import { repairRelations } from '../src/utils/relation-repair'
import { buildArchiveReports, overallArchivePercent } from '../src/utils/archive-readiness'

function member(partial: Partial<FamilyMember> & { id: string; name: string }): FamilyMember {
  return {
    gender: Gender.OTHER,
    birthDate: '',
    deathDate: '',
    birthPlace: '',
    bio: '',
    avatar: '',
    parentId: '',
    spouseIds: [],
    childrenIds: [],
    generation: 1,
    ...partial
  }
}

// 1. 父母记了子女、子女没记父母 → 按子女记录补 parentId
{
  const parent = member({ id: 'a', name: '甲', childrenIds: ['b'] })
  const child = member({ id: 'b', name: '乙' })
  const result = repairRelations([parent, child])
  const fixedChild = result.members.find((m) => m.id === 'b')!
  assert.equal(fixedChild.parentId, 'a')
  assert.equal(result.fixes.filter((f) => f.type === 'parent-linked').length, 1)
  assert.equal(result.conflicts.length, 0)
  // 输入不被修改
  assert.equal(child.parentId, '')
}

// 2. 子女记了父母、父母没记子女 → 按父母记录补 childrenIds
{
  const parent = member({ id: 'a', name: '甲' })
  const child = member({ id: 'b', name: '乙', parentId: 'a' })
  const result = repairRelations([parent, child])
  const fixedParent = result.members.find((m) => m.id === 'a')!
  assert.deepEqual(fixedParent.childrenIds, ['b'])
  assert.equal(result.fixes.filter((f) => f.type === 'child-linked').length, 1)
}

// 3. 失效编号清理：parentId / spouseIds / childrenIds 指向不存在的成员，重复子女去重
{
  const broken = member({ id: 'a', name: '甲', parentId: 'ghost-p', spouseIds: ['ghost-s'], childrenIds: ['ghost-c', 'ghost-c'] })
  const result = repairRelations([broken])
  const fixed = result.members[0]
  assert.equal(fixed.parentId, '')
  assert.deepEqual(fixed.spouseIds, [])
  assert.deepEqual(fixed.childrenIds, [])
  assert.deepEqual(
    result.fixes.map((f) => f.type).sort(),
    ['invalid-child', 'invalid-parent', 'invalid-spouse']
  )
}

// 4. 冲突：两边都记了子女但父母记录指向别人 → 两份都保留并说明原因
{
  const claimant = member({ id: 'a', name: '甲', childrenIds: ['c'] })
  const recorded = member({ id: 'b', name: '乙', childrenIds: ['c'] })
  const child = member({ id: 'c', name: '丙', parentId: 'b' })
  const result = repairRelations([claimant, recorded, child])
  assert.equal(result.conflicts.length, 1)
  assert.match(result.conflicts[0].detail, /均已保留/)
  assert.equal(result.members.find((m) => m.id === 'c')!.parentId, 'b')
  assert.deepEqual(result.members.find((m) => m.id === 'a')!.childrenIds, ['c'])
  assert.equal(result.fixes.length, 0)
}

// 5. 默认模板数据：两位祖辈都记了林建国为子女，单 parentId 模型下应报冲突且不改动
{
  const result = repairRelations(defaultMembers)
  assert.equal(result.fixes.length, 0)
  assert.equal(result.conflicts.length, 2)
  assert.ok(result.conflicts.every((c) => c.detail.includes('均已保留')))
}

// 6. 档案整备汇总：完成度、待补项、有效遗产规划只算已定稿
{
  const reports = buildArchiveReports(defaultMembers, defaultStories, defaultPhotos, defaultLegacyPlans)
  assert.equal(reports.length, defaultMembers.length)
  const ancestor = reports.find((r) => r.member.id === 'm-ancestor')!
  const byKey = Object.fromEntries(ancestor.items.map((item) => [item.key, item.done]))
  assert.deepEqual(byKey, { birthPlace: true, bio: true, avatar: false, stories: true, photos: true, legacy: false })
  assert.equal(ancestor.percent, 67)
  assert.deepEqual(ancestor.missing.map((item) => item.key), ['avatar', 'legacy'])
  // 草稿不算有效遗产规划，定稿后算
  const finalized = buildArchiveReports(defaultMembers, defaultStories, defaultPhotos, [
    { ...defaultLegacyPlans[0], memberId: 'm-ancestor', status: 'finalized' as const }
  ])
  assert.equal(finalized.find((r) => r.member.id === 'm-ancestor')!.items.find((i) => i.key === 'legacy')!.done, true)
  // 完成度低的排前面，整体百分比在 0-100
  assert.ok(reports[0].percent <= reports[reports.length - 1].percent)
  const overall = overallArchivePercent(reports)
  assert.ok(overall > 0 && overall < 100)
}

console.log('archive-readiness & relation-repair assertions passed')
