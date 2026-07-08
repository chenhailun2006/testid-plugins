<template>
  <div>
    <h1>首页 - 页面视图组件</h1>

    <!-- 静态 DOM: 编译期直接打标 -->
    <div class="search-section">
      <input v-model="keyword" placeholder="输入关键字搜索" />
      <a-button type="primary" @click="handleSearch">搜索</a-button>
    </div>

    <!-- 公共组件多实例 -->
    <div class="card-section">
      <h2>公共组件 实例 A-1</h2>
      <BaseCard title="卡片一" content="这是第一个公共组件实例" />
    </div>

    <div class="card-section">
      <h2>公共组件 实例 B-1 & B-2</h2>
      <BaseCard title="卡片二" content="这是第二个公共组件实例 (B-1)" />
      <BaseCard title="卡片三" content="这是第三个公共组件实例 (B-2)" />
    </div>

    <!-- v-for 动态列表 -->
    <div class="list-section">
      <h2>动态列表 (v-for)</h2>
      <div v-for="item in items" :key="item.id" class="list-item">
        <span>{{ item.name }}</span>
        <a-button size="small" @click="handleDelete(item.id)">删除</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Button as AButton } from 'ant-design-vue';
import BaseCard from '../components/BaseCard.vue';

const keyword = ref('');
const items = ref([
  { id: 1, name: '项目 Alpha' },
  { id: 2, name: '项目 Beta' },
  { id: 3, name: '项目 Gamma' },
]);

function handleSearch() {
  console.log('搜索:', keyword.value);
}

function handleDelete(id: number) {
  items.value = items.value.filter(item => item.id !== id);
}
</script>

<style scoped>
h1 {
  font-size: 24px;
  margin-bottom: 16px;
}
.search-section {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.search-section input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
}
.card-section {
  margin-bottom: 16px;
}
.card-section h2 {
  font-size: 16px;
  margin-bottom: 8px;
}
.list-section {
  margin-top: 24px;
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 8px;
}
</style>
