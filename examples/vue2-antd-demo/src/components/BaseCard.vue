<template>
  <a-card size="small" :title="title" style="margin-bottom: 8px">
    <p>{{ content }}</p>
    <a-space>
      <a-button type="primary" size="small" @click="onAction('确认')">确认</a-button>
      <a-button size="small" @click="onAction('取消')">取消</a-button>
      <a-input size="small" placeholder="备注" style="width: 150px" />
    </a-space>
  </a-card>
</template>

<script>
export default {
  name: 'BaseCard',
  props: {
    title: { type: String, required: true },
    content: { type: String, default: '' },
  },
  methods: {
    onAction(type) {
      console.log(`[BaseCard ${this.title}] action:`, type);
    },
  },
};
</script>
