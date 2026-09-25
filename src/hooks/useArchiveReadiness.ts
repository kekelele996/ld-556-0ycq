import { computed } from 'vue'
import { useFamilyStore } from '@/stores/familyStore'
import { useStoryStore } from '@/stores/storyStore'
import { usePhotoStore } from '@/stores/photoStore'
import { useLegacyStore } from '@/stores/legacyStore'
import { buildMemberReadiness, isValidLegacyPlan } from '@/utils/archive-readiness'
import { planRelationRepair } from '@/utils/relation-repair'

export function useArchiveReadiness() {
  const family = useFamilyStore()
  const story = useStoryStore()
  const photo = usePhotoStore()
  const legacy = useLegacyStore()

  const readiness = computed(() =>
    family.members
      .map((member) =>
        buildMemberReadiness(member, {
          storyCount: story.byMember(member.id).length,
          photoCount: photo.byMember(member.id).length,
          validPlanCount: legacy.plans.filter((plan) => plan.memberId === member.id && isValidLegacyPlan(plan)).length
        })
      )
      .sort((a, b) => a.percent - b.percent || a.member.name.localeCompare(b.member.name, 'zh'))
  )

  const repairPlan = computed(() => planRelationRepair(family.members))

  async function hydrate() {
    await Promise.all([family.hydrate(), story.hydrate(), photo.hydrate(), legacy.hydrate()])
  }

  async function applyRepair() {
    const plan = repairPlan.value
    await family.applyRelationRepair(plan.members)
    return plan
  }

  return { readiness, repairPlan, hydrate, applyRepair }
}
