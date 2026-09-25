<template>
  <section class="panel archive-panel" aria-label="档案整备">
    <div class="archive-header">
      <div>
        <h2>档案整备</h2>
        <p>按成员汇总出生地、简介、头像、故事、照片与有效遗产规划（已定稿），交接前看清还缺什么。</p>
      </div>
      <n-progress type="circle" :percentage="overallPercent" :stroke-width="10" class="archive-overall" />
    </div>

    <div class="repair-box">
      <div>
        <strong>关系整备</strong>
        <p>父母子女关系只记一边、或成员编号失效时，按现有记录补齐双向关系并清理失效编号；两边记录冲突时保留两份并说明原因。</p>
      </div>
      <n-button type="primary" :loading="repairing" @click="runRepair">检查并修复关系</n-button>
    </div>

    <n-alert v-if="repairResult" :type="repairResult.conflicts.length ? 'warning' : 'success'" :title="repairSummary" closable @close="repairResult = null">
      <ul v-if="repairResult.fixes.length || repairResult.conflicts.length" class="repair-list">
        <li v-for="(fix, index) in repairResult.fixes" :key="`fix-${index}`">{{ fix.detail }}</li>
        <li v-for="(conflict, index) in repairResult.conflicts" :key="`conflict-${index}`" class="repair-conflict">{{ conflict.detail }}</li>
      </ul>
    </n-alert>

    <div v-if="reports.length" class="archive-grid">
      <article v-for="report in reports" :key="report.member.id" class="archive-card">
        <header>
          <MemberAvatar :member="report.member" size="sm" :deceased="Boolean(report.member.deathDate)" />
          <strong>{{ report.member.name }}</strong>
          <n-progress type="line" :percentage="report.percent" :height="8" />
        </header>
        <div class="archive-items">
          <button
            v-for="item in report.items"
            :key="item.key"
            type="button"
            class="archive-item"
            :class="{ missing: !item.done }"
            :title="item.detail"
            @click="goMember(report.member.id)"
          >
            {{ item.done ? '✓' : '＋' }} {{ item.label }}
          </button>
        </div>
        <p v-if="report.missing.length" class="archive-missing">待补：{{ report.missing.map((item) => item.label).join('、') }}</p>
        <p v-else class="archive-missing done">档案齐全</p>
      </article>
    </div>
    <EmptyState v-else title="还没有成员" description="先在家谱树中添加成员，再回来整理档案。" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MemberAvatar from '@/components/common/MemberAvatar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useFamily } from '@/hooks/useFamily'
import { useStory } from '@/hooks/useStory'
import { usePhoto } from '@/hooks/usePhoto'
import { useLegacyStore } from '@/stores/legacyStore'
import type { RelationRepairResult } from '@/types/archive'
import { buildArchiveReports, overallArchivePercent } from '@/utils/archive-readiness'
import { withFriendlyError } from '@/utils/error-handler'

const router = useRouter()
const { members, applyRelationRepair } = useFamily()
const story = useStory()
const photo = usePhoto()
const legacy = useLegacyStore()

const repairing = ref(false)
const repairResult = ref<RelationRepairResult | null>(null)

const reports = computed(() => buildArchiveReports(members.value, story.stories.value, photo.photos.value, legacy.plans))
const overallPercent = computed(() => overallArchivePercent(reports.value))
const repairSummary = computed(() => {
  const result = repairResult.value
  if (!result) return ''
  if (!result.fixes.length && !result.conflicts.length) return '关系记录完整，无需修复。'
  const parts = []
  if (result.fixes.length) parts.push(`已修复并保存 ${result.fixes.length} 处，家谱树与成员详情已同步更新`)
  if (result.conflicts.length) parts.push(`${result.conflicts.length} 处记录冲突，两份均已保留，请人工核对`)
  return parts.join('；')
})

async function runRepair() {
  repairing.value = true
  try {
    const result = await withFriendlyError(() => applyRelationRepair(), '关系修复失败，请稍后重试')
    if (result) repairResult.value = result
  } finally {
    repairing.value = false
  }
}

function goMember(id: string) {
  router.push(`/members/${id}`)
}

onMounted(async () => {
  await Promise.all([story.hydrate(), photo.hydrate(), legacy.hydrate()])
})
</script>
