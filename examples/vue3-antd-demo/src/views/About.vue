<template>
  <div>
    <h1>关于页</h1>
    <p>这是一个简单的示例页面，展示编译期打标效果。</p>
    <a-button type="default" @click="handleClick">点击我</a-button>
    <input placeholder="输入点什么..." />
  </div>
</template>

<script setup lang="ts">
import { Button as AButton } from 'ant-design-vue';

function handleClick() {
  console.log('关于页按钮被点击');
}
</script>

<style scoped>
h1 {
  font-size: 24px;
  margin-bottom: 16px;
}
</style>
