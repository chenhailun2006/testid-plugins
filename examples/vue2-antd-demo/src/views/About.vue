<template>
  <div>
    <a-card title="关于">
      <p>这是一个 Vue 2 + Webpack + Ant Design Vue 的 Demo 项目。</p>
      <p>用于验证编译期 testid 注入 + 运行时兜底打标的完整链路。</p>

      <a-divider />

      <h4>技术栈</h4>
      <a-space>
        <a-tag color="blue">Vue 2.7</a-tag>
        <a-tag color="green">Webpack 5</a-tag>
        <a-tag color="orange">Ant Design Vue 1.7</a-tag>
        <a-tag color="purple">TestId Plugin</a-tag>
      </a-space>

      <a-divider />

      <h4>TestId 注入机制</h4>
      <ul>
        <li><strong>编译期</strong>：webpack-plugin-vue2-auto-testid 解析 Vue SFC 模板 AST，对页面组件注入 <code>data-testid</code></li>
        <li><strong>运行时</strong>：antd-testid-runtime 通过 MutationObserver 监控 DOM，为公共组件和浮层注入兜底 testid</li>
        <li><strong>锚点计数器</strong>：公共组件注入 <code>data-test-base-key</code>，运行时通过锚点 + 局部计数器生成最终 testid</li>
      </ul>

      <a-divider />

      <a-space>
        <a-button type="primary" @click="goHome">回首页</a-button>
        <a-input placeholder="随便输入点东西" style="width: 200px" />
      </a-space>
    </a-card>
  </div>
</template>

<script>
export default {
  name: 'About',
  methods: {
    goHome() {
      this.$router.push('/');
    },
  },
};
</script>
