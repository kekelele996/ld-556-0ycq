"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const default_templates_1 = require("../src/constants/default-templates");
const enums_1 = require("../src/constants/enums");
const relation_repair_1 = require("../src/utils/relation-repair");
const archive_readiness_1 = require("../src/utils/archive-readiness");
function member(partial) {
    return {
        gender: enums_1.Gender.OTHER,
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
    };
}
// 1. 父母记了子女、子女没记父母 → 按子女记录补 parentId
{
    const parent = member({ id: 'a', name: '甲', childrenIds: ['b'] });
    const child = member({ id: 'b', name: '乙' });
    const result = (0, relation_repair_1.repairRelations)([parent, child]);
    const fixedChild = result.members.find((m) => m.id === 'b');
    node_assert_1.strict.equal(fixedChild.parentId, 'a');
    node_assert_1.strict.equal(result.fixes.filter((f) => f.type === 'parent-linked').length, 1);
    node_assert_1.strict.equal(result.conflicts.length, 0);
    // 输入不被修改
    node_assert_1.strict.equal(child.parentId, '');
}
// 2. 子女记了父母、父母没记子女 → 按父母记录补 childrenIds
{
    const parent = member({ id: 'a', name: '甲' });
    const child = member({ id: 'b', name: '乙', parentId: 'a' });
    const result = (0, relation_repair_1.repairRelations)([parent, child]);
    const fixedParent = result.members.find((m) => m.id === 'a');
    node_assert_1.strict.deepEqual(fixedParent.childrenIds, ['b']);
    node_assert_1.strict.equal(result.fixes.filter((f) => f.type === 'child-linked').length, 1);
}
// 3. 失效编号清理：parentId / spouseIds / childrenIds 指向不存在的成员，重复子女去重
{
    const broken = member({ id: 'a', name: '甲', parentId: 'ghost-p', spouseIds: ['ghost-s'], childrenIds: ['ghost-c', 'ghost-c'] });
    const result = (0, relation_repair_1.repairRelations)([broken]);
    const fixed = result.members[0];
    node_assert_1.strict.equal(fixed.parentId, '');
    node_assert_1.strict.deepEqual(fixed.spouseIds, []);
    node_assert_1.strict.deepEqual(fixed.childrenIds, []);
    node_assert_1.strict.deepEqual(result.fixes.map((f) => f.type).sort(), ['invalid-child', 'invalid-parent', 'invalid-spouse']);
}
// 4. 冲突：两边都记了子女但父母记录指向别人 → 两份都保留并说明原因
{
    const claimant = member({ id: 'a', name: '甲', childrenIds: ['c'] });
    const recorded = member({ id: 'b', name: '乙', childrenIds: ['c'] });
    const child = member({ id: 'c', name: '丙', parentId: 'b' });
    const result = (0, relation_repair_1.repairRelations)([claimant, recorded, child]);
    node_assert_1.strict.equal(result.conflicts.length, 1);
    node_assert_1.strict.match(result.conflicts[0].detail, /均已保留/);
    node_assert_1.strict.equal(result.members.find((m) => m.id === 'c').parentId, 'b');
    node_assert_1.strict.deepEqual(result.members.find((m) => m.id === 'a').childrenIds, ['c']);
    node_assert_1.strict.equal(result.fixes.length, 0);
}
// 5. 默认模板数据：两位祖辈都记了林建国为子女，单 parentId 模型下应报冲突且不改动
{
    const result = (0, relation_repair_1.repairRelations)(default_templates_1.defaultMembers);
    node_assert_1.strict.equal(result.fixes.length, 0);
    node_assert_1.strict.equal(result.conflicts.length, 2);
    node_assert_1.strict.ok(result.conflicts.every((c) => c.detail.includes('均已保留')));
}
// 6. 档案整备汇总：完成度、待补项、有效遗产规划只算已定稿
{
    const reports = (0, archive_readiness_1.buildArchiveReports)(default_templates_1.defaultMembers, default_templates_1.defaultStories, default_templates_1.defaultPhotos, default_templates_1.defaultLegacyPlans);
    node_assert_1.strict.equal(reports.length, default_templates_1.defaultMembers.length);
    const ancestor = reports.find((r) => r.member.id === 'm-ancestor');
    const byKey = Object.fromEntries(ancestor.items.map((item) => [item.key, item.done]));
    node_assert_1.strict.deepEqual(byKey, { birthPlace: true, bio: true, avatar: false, stories: true, photos: true, legacy: false });
    node_assert_1.strict.equal(ancestor.percent, 67);
    node_assert_1.strict.deepEqual(ancestor.missing.map((item) => item.key), ['avatar', 'legacy']);
    // 草稿不算有效遗产规划，定稿后算
    const finalized = (0, archive_readiness_1.buildArchiveReports)(default_templates_1.defaultMembers, default_templates_1.defaultStories, default_templates_1.defaultPhotos, [
        { ...default_templates_1.defaultLegacyPlans[0], memberId: 'm-ancestor', status: 'finalized' }
    ]);
    node_assert_1.strict.equal(finalized.find((r) => r.member.id === 'm-ancestor').items.find((i) => i.key === 'legacy').done, true);
    // 完成度低的排前面，整体百分比在 0-100
    node_assert_1.strict.ok(reports[0].percent <= reports[reports.length - 1].percent);
    const overall = (0, archive_readiness_1.overallArchivePercent)(reports);
    node_assert_1.strict.ok(overall > 0 && overall < 100);
}
console.log('archive-readiness & relation-repair assertions passed');
