<template>
  <section class="panel readiness-panel">
    <div class="readiness-heading">
      <div>
        <h2>档案整备</h2>
        <p>按成员汇总出生地、简介、头像、故事、照片与有效遗产规划（已定稿），交接前先看清还缺什么，点一行进入成员页补齐。</p>
      </div>
      <n-tag :type="missingTotal ? 'warning' : 'success'">{{ missingTotal ? `共 ${missingTotal} 项待补` : '档案全部齐备' }}</n-tag>
    </div>

    <div class="repair-box">
      <h3>关系修复</h3>
      <template v-if="issues.length">
        <p v-for="(issue, index) in issues" :key="index" class="repair-item">
          <n-tag size="small" :type="issue.autoFix ? 'info' : 'warning'">{{ issue.autoFix ? '自动修复' : '保留两份' }}</n-tag>
          <span>{{ issue.message }}</span>
        </p>
        <n-space align="center">
          <n-button type="primary" size="small" :disabled="!fixableCount" :loading="applying" @click="apply">
            补齐双向关系并清理失效编号
          </n-button>
          <span v-if="conflictCount" class="repair-hint">{{ conflictCount }} 处冲突会保留两份记录，需人工确认</span>
        </n-space>
      </template>
      <p v-else class="repair-hint">父母子女关系双向完整，未发现失效编号。</p>
      <n-alert v-if="lastResult" type="success" class="repair-result">{{ lastResult }}</n-alert>
    </div>

    <div class="readiness-list">
      <button v-for="item in readiness" :key="item.member.id" type="button" class="readiness-row" @click="goMember(item.member.id)">
        <MemberAvatar :member="item.member" size="sm" :deceased="Boolean(item.member.deathDate)" />
        <span class="readiness-name">{{ item.member.name }}</span>
        <n-progress type="line" :percentage="item.percent" :status="item.percent === 100 ? 'success' : 'warning'" />
        <span class="readiness-missing">
          <n-tag v-for="missing in item.missing" :key="missing.key" size="small" type="error" :bordered="false">缺{{ missing.label }}</n-tag>
          <span v-if="!item.missing.length" class="readiness-ok">已齐备</span>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MemberAvatar from '@/components/common/MemberAvatar.vue'
import { useArchiveReadiness } from '@/hooks/useArchiveReadiness'
import { withFriendlyError } from '@/utils/error-handler'

const router = useRouter()
const { readiness, repairPlan, hydrate, applyRepair } = useArchiveReadiness()
const applying = ref(false)
const lastResult = ref('')

const issues = computed(() => repairPlan.value.issues)
const fixableCount = computed(() => issues.value.filter((issue) => issue.autoFix).length)
const conflictCount = computed(() => issues.value.length - fixableCount.value)
const missingTotal = computed(() => readiness.value.reduce((total, item) => total + item.missing.length, 0))

function goMember(id: string) {
  router.push(`/members/${id}`)
}

async function apply() {
  applying.value = true
  try {
    const plan = await withFriendlyError(applyRepair, '关系修复失败，请稍后重试')
    if (plan) {
      const fixed = plan.issues.filter((issue) => issue.autoFix).length
      const kept = plan.issues.length - fixed
      lastResult.value = kept
        ? `已修复 ${fixed} 处关系记录，家谱树与成员详情已同步更新；${kept} 处冲突保留两份记录，请人工确认后在成员页调整。`
        : `已修复 ${fixed} 处关系记录，家谱树与成员详情已同步更新。`
    }
  } finally {
    applying.value = false
  }
}

onMounted(hydrate)
</script>
