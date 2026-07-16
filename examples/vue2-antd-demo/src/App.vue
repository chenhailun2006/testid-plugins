<template>
  <div id="app-root">
    <a-layout style="min-height: 100vh">
      <!-- 侧边导航 -->
      <a-layout-sider breakpoint="lg" collapsible>
        <div class="logo" style="height: 48px; margin: 16px; background: rgba(255,255,255,0.2); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold;">
          TestId Demo
        </div>
        <a-menu
          theme="dark"
          mode="inline"
          :selected-keys="[currentRoute]"
          @click="onMenuClick"
        >
          <a-menu-item key="/">首页</a-menu-item>
          <a-menu-item key="/about">关于</a-menu-item>
        </a-menu>
      </a-layout-sider>

      <a-layout>
        <a-layout-header style="background: #fff; padding: 0 24px; border-bottom: 1px solid #f0f0f0;">
          <h3 style="margin: 0; line-height: 64px;">
            Vue 2 + Ant Design Vue 1.x — 编译期 + 运行时 TestId Demo
          </h3>
        </a-layout-header>

        <a-layout-content style="padding: 24px;">
          <router-view />
        </a-layout-content>
      </a-layout>
    </a-layout>

    <!-- ============================================================ -->
    <!-- 浮层组件 (App 层挂载，测试 popup counter)                    -->
    <!-- ============================================================ -->

    <!-- Modal -->
    <a-modal v-model="modalVisible" title="Modal 对话框">
      <p>这是一个 Modal 弹窗的内容。</p>
      <a-input placeholder="在 modal 中输入" />
      <template #footer>
        <a-button @click="modalVisible = false">取消</a-button>
        <a-button type="primary" @click="modalVisible = false">确定</a-button>
      </template>
    </a-modal>

    <!-- Drawer -->
    <a-drawer v-model="drawerVisible" title="Drawer 抽屉" placement="right">
      <a-form layout="vertical">
        <a-form-item label="名称">
          <a-input placeholder="请输入名称" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select placeholder="请选择状态">
            <a-select-option value="1">启用</a-select-option>
            <a-select-option value="0">停用</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-drawer>
  </div>
</template>

<script>
import VueRouter from 'vue-router';
import Home from './views/Home.vue';
import About from './views/About.vue';

// ── 生成路由，作为 App 子组件 ──
const router = new VueRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});

export default {
  name: 'App',

  router,

  data() {
    return {
      currentRoute: '/',
      modalVisible: false,
      drawerVisible: false,
    };
  },

  watch: {
    $route(to) {
      this.currentRoute = to.path;
    },
  },

  methods: {
    onMenuClick({ key }) {
      this.$router.push(key);
    },
  },

  mounted() {
    // 暴露 modal/drawer 开关到全局，方便控制台调试
    window.__demo = {
      openModal: () => { this.modalVisible = true; },
      openDrawer: () => { this.drawerVisible = true; },
    };
  },
};
</script>
