<template>
  <div class="base-card">
    <h3>{{ title }}</h3>
    <p>{{ content }}</p>
    <a-button type="link" @click="handleAction">操作</a-button>
    <input placeholder="公共组件内的输入框" />
  </div>
</template>

<script setup lang="ts">
import { Button as AButton } from 'ant-design-vue';

defineProps<{
  title: string;
  content: string;
}>();

function handleAction() {
  console.log('公共组件操作被点击');
}
</script>

<style scoped>
.base-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  background: #fafafa;
}
.base-card h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
}
.base-card p {
  margin: 0 0 12px 0;
  color: #666;
}
.base-card input {
  display: block;
  margin-top: 8px;
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}
</style>
