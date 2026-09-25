import type { RelationConflict, RelationFix, RelationRepairResult } from '@/types/archive'
import type { FamilyMember } from '@/types/family'

/**
 * 关系整备：
 * 1. 清掉失效编号（parentId / spouseIds / childrenIds 指向不存在的成员或自身）。
 * 2. 父母子女关系只记一边时，按现有记录补齐另一边（parentId ↔ childrenIds）。
 * 3. 两边记录冲突时不覆盖任何一方，保留两份并记录原因，交由人工核对。
 */
export function repairRelations(members: FamilyMember[]): RelationRepairResult {
  const fixes: RelationFix[] = []
  const conflicts: RelationConflict[] = []
  const draft = new Map<string, FamilyMember>(
    members.map((member) => [
      member.id,
      { ...member, spouseIds: [...member.spouseIds], childrenIds: [...member.childrenIds] }
    ])
  )

  const nameOf = (id: string) => draft.get(id)?.name ?? id

  // 第一步：清理失效编号
  for (const member of draft.values()) {
    if (member.parentId && (member.parentId === member.id || !draft.has(member.parentId))) {
      fixes.push({
        type: 'invalid-parent',
        memberId: member.id,
        detail: `「${member.name}」的父母编号 ${member.parentId} 已失效，已清空。`
      })
      member.parentId = ''
    }
    const validSpouses = member.spouseIds.filter((id) => id !== member.id && draft.has(id))
    if (validSpouses.length !== member.spouseIds.length) {
      const removed = member.spouseIds.filter((id) => !validSpouses.includes(id))
      fixes.push({
        type: 'invalid-spouse',
        memberId: member.id,
        detail: `「${member.name}」的配偶编号 ${removed.join('、')} 已失效，已移除。`
      })
      member.spouseIds = validSpouses
    }
    const validChildren = member.childrenIds.filter((id) => id !== member.id && draft.has(id))
    if (validChildren.length !== member.childrenIds.length) {
      const removed = member.childrenIds.filter((id) => !validChildren.includes(id))
      fixes.push({
        type: 'invalid-child',
        memberId: member.id,
        detail: `「${member.name}」的子女编号 ${removed.join('、')} 已失效，已移除。`
      })
      member.childrenIds = validChildren
    }
    const dedupedChildren = [...new Set(member.childrenIds)]
    if (dedupedChildren.length !== member.childrenIds.length) {
      fixes.push({
        type: 'duplicate-child',
        memberId: member.id,
        detail: `「${member.name}」的子女列表存在重复编号，已去重。`
      })
      member.childrenIds = dedupedChildren
    }
  }

  // 第二步：按 parentId 记录，为父/母补上子女
  for (const member of draft.values()) {
    if (!member.parentId) continue
    const parent = draft.get(member.parentId)
    if (parent && !parent.childrenIds.includes(member.id)) {
      parent.childrenIds.push(member.id)
      fixes.push({
        type: 'child-linked',
        memberId: parent.id,
        detail: `按「${member.name}」的父母记录，为「${parent.name}」补上子女「${member.name}」。`
      })
    }
  }

  // 第三步：按 childrenIds 记录，为子女补上父母；冲突时两边都保留
  for (const member of draft.values()) {
    for (const childId of member.childrenIds) {
      const child = draft.get(childId)
      if (!child) continue
      if (!child.parentId) {
        child.parentId = member.id
        fixes.push({
          type: 'parent-linked',
          memberId: child.id,
          detail: `按「${member.name}」的子女记录，为「${child.name}」补上父母「${member.name}」。`
        })
      } else if (child.parentId !== member.id) {
        conflicts.push({
          memberId: child.id,
          detail: `「${member.name}」的子女列表包含「${child.name}」，但「${child.name}」的父母记录是「${nameOf(child.parentId)}」。两条记录均已保留、未做改动，请到成员详情页核对后手动调整。`
        })
      }
    }
  }

  return { members: members.map((member) => draft.get(member.id)!), fixes, conflicts }
}
