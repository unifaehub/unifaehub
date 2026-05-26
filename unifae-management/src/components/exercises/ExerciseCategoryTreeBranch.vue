<script setup lang="ts">
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import TreeBranch from '@/components/exercises/ExerciseCategoryTreeBranch.vue'

export type PickerTreeNode = {
  id: number
  name: string
  isLeafLevel: boolean
  children: PickerTreeNode[]
}

const props = defineProps<{
  nodes: PickerTreeNode[]
  depth: number
  expandedIds: Set<number>
  selectedIds: number[]
}>()

const emit = defineEmits<{
  toggleExpand: [id: number]
  toggleSelect: [id: number]
}>()

function isSelectableLeaf(n: PickerTreeNode) {
  return n.isLeafLevel || n.children.length === 0
}

function expanded(id: number) {
  return props.expandedIds.has(id)
}
</script>

<template>
  <ul class="tree-ul" :class="{ 'tree-ul--root': depth === 0 }">
    <li v-for="n in nodes" :key="n.id" class="tree-li">
      <div class="tree-row" :style="{ paddingLeft: depth ? `${(depth - 1) * 0.65 + 0.15}rem` : '0' }">
        <button
          v-if="n.children.length"
          type="button"
          class="tree-chev"
          :aria-expanded="expanded(n.id)"
          @click="emit('toggleExpand', n.id)"
        >
          <MaterialIcon
            class="tree-chev__ico"
            :name="expanded(n.id) ? 'expand_more' : 'chevron_right'"
            size="1.15rem"
          />
        </button>
        <span v-else class="tree-spacer" aria-hidden="true" />

        <label v-if="isSelectableLeaf(n)" class="tree-leaf">
          <input
            type="checkbox"
            :checked="selectedIds.includes(n.id)"
            @change="emit('toggleSelect', n.id)"
          />
          <span class="tree-leaf__name">{{ n.name }}</span>
        </label>
        <button
          v-else
          type="button"
          class="tree-folder"
          @click="emit('toggleExpand', n.id)"
        >
          {{ n.name }}
        </button>
      </div>
      <TreeBranch
        v-if="n.children.length && expanded(n.id)"
        :nodes="n.children"
        :depth="depth + 1"
        :expanded-ids="expandedIds"
        :selected-ids="selectedIds"
        @toggle-expand="emit('toggleExpand', $event)"
        @toggle-select="emit('toggleSelect', $event)"
      />
    </li>
  </ul>
</template>

<style scoped>
.tree-ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree-ul--root {
  padding-top: 0.15rem;
}
.tree-li {
  margin: 0;
}
.tree-row {
  display: flex;
  align-items: flex-start;
  gap: 0.2rem;
  min-height: 1.65rem;
  padding: 0.1rem 0;
}
.tree-chev {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: var(--uf-radius-sm, 6px);
  background: transparent;
  color: var(--uf-primary);
  cursor: pointer;
}
.tree-chev:hover {
  background: rgba(13, 99, 27, 0.08);
}
.tree-chev__ico {
  transition: transform 0.15s ease;
}
.tree-spacer {
  width: 1.5rem;
  flex-shrink: 0;
}
.tree-folder {
  flex: 1;
  text-align: left;
  margin: 0;
  padding: 0.2rem 0.35rem;
  border: none;
  border-radius: var(--uf-radius-sm, 6px);
  background: transparent;
  font-family: var(--uf-font);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--uf-on-surface);
  cursor: pointer;
}
.tree-folder:hover {
  background: rgba(13, 99, 27, 0.06);
}
.tree-leaf {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 0;
  padding: 0.15rem 0.35rem 0.15rem 0;
  font-size: 0.82rem;
  cursor: pointer;
}
.tree-leaf__name {
  font-weight: 500;
  line-height: 1.35;
}
</style>
