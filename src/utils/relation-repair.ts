import type { FamilyMember } from '@/types/family'
import type { RelationIssue, RelationRepairPlan } from '@/types/relation-repair'

function unique(ids: string[]) {
  return [...new Set(ids)]
}

/**
 * 基于现有成员记录推导关系修复方案（纯函数，不改动入参）：
 * 1. 清掉失效编号：parentId / childrenIds / spouseIds 中指向不存在成员或自身的编号，顺带对列表去重；
 * 2. 补齐双向父母子女关系：只记了一边的，按另一边已有的记录回填（成员列表顺序在先者优先）；
 * 3. 原有内容冲突（子女的 parentId 与另一成员的子女列表指向不同父母）时两边记录都保留，
 *    只生成 parent-conflict 说明，不自动改写，需人工确认后在成员页调整。
 */
export function planRelationRepair(members: FamilyMember[]): RelationRepairPlan {
  const repaired = members.map((member) => ({ ...member, spouseIds: [...member.spouseIds], childrenIds: [...member.childrenIds] }))
  const byId = new Map(repaired.map((member) => [member.id, member]))
  const issues: RelationIssue[] = []
  const nameOf = (id: string) => byId.get(id)?.name || id
  const reparented = new Map<string, string>()

  // 第一步：清理失效编号与重复编号
  for (const member of repaired) {
    if (member.parentId && (member.parentId === member.id || !byId.has(member.parentId))) {
      const reason = member.parentId === member.id ? '指向自身' : '对应的成员不存在'
      issues.push({
        kind: 'dead-parent-id',
        memberId: member.id,
        relatedId: member.parentId,
        autoFix: true,
        message: `${member.name} 的父母编号「${member.parentId}」已失效（${reason}），保存时清空`
      })
      member.parentId = ''
    }

    const deadChildIds = unique(member.childrenIds.filter((id) => id === member.id || !byId.has(id)))
    for (const id of deadChildIds) {
      issues.push({
        kind: 'dead-child-id',
        memberId: member.id,
        relatedId: id,
        autoFix: true,
        message: `${member.name} 的子女编号「${id}」已失效，保存时移除`
      })
    }
    const children = unique(member.childrenIds.filter((id) => id !== member.id && byId.has(id)))
    if (children.length !== member.childrenIds.length) {
      if (!deadChildIds.length) {
        issues.push({
          kind: 'duplicate-relation-id',
          memberId: member.id,
          relatedId: member.id,
          autoFix: true,
          message: `${member.name} 的子女列表存在重复编号，保存时去重`
        })
      }
      member.childrenIds = children
    }

    const deadSpouseIds = unique(member.spouseIds.filter((id) => id === member.id || !byId.has(id)))
    for (const id of deadSpouseIds) {
      issues.push({
        kind: 'dead-spouse-id',
        memberId: member.id,
        relatedId: id,
        autoFix: true,
        message: `${member.name} 的配偶编号「${id}」已失效，保存时移除`
      })
    }
    const spouses = unique(member.spouseIds.filter((id) => id !== member.id && byId.has(id)))
    if (spouses.length !== member.spouseIds.length) {
      if (!deadSpouseIds.length) {
        issues.push({
          kind: 'duplicate-relation-id',
          memberId: member.id,
          relatedId: member.id,
          autoFix: true,
          message: `${member.name} 的配偶列表存在重复编号，保存时去重`
        })
      }
      member.spouseIds = spouses
    }
  }

  // 第二步：按子女列表回填缺失的 parentId；两边父母记录不一致时保留两份并说明
  for (const member of repaired) {
    for (const childId of member.childrenIds) {
      const child = byId.get(childId)
      if (!child) continue
      if (!child.parentId) {
        child.parentId = member.id
        reparented.set(child.id, member.id)
        issues.push({
          kind: 'missing-parent-link',
          memberId: child.id,
          relatedId: member.id,
          autoFix: true,
          message: `${child.name} 未记录父母，按 ${member.name} 的子女列表补齐父母为 ${member.name}`
        })
      } else if (child.parentId !== member.id) {
        issues.push({
          kind: 'parent-conflict',
          memberId: child.id,
          relatedId: member.id,
          autoFix: false,
          message: `${child.name} 的父母已记录为 ${nameOf(child.parentId)}，但 ${member.name} 的子女列表也包含 ${child.name}；两边记录都保留，请人工确认后再调整`
        })
      }
    }
  }

  // 第三步：按 parentId 回填缺失的子女列表
  for (const member of repaired) {
    if (!member.parentId) continue
    const parent = byId.get(member.parentId)
    if (parent && !parent.childrenIds.includes(member.id)) {
      parent.childrenIds.push(member.id)
      issues.push({
        kind: 'missing-child-link',
        memberId: member.id,
        relatedId: parent.id,
        autoFix: true,
        message: `${member.name} 记录的父母是 ${parent.name}，但 ${parent.name} 的子女列表缺少 ${member.name}，保存时补上`
      })
    }
  }

  // 第四步：新补齐父母关系的成员，世代编号不能小于等于父母
  for (const [childId, parentId] of reparented) {
    const child = byId.get(childId)
    const parent = byId.get(parentId)
    if (child && parent && child.generation <= parent.generation) child.generation = parent.generation + 1
  }

  return { members: repaired, issues }
}
