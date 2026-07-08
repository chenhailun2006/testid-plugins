<template>
  <div id="app-root">
    <nav>
      <router-link to="/">
        <a-button type="link">Home</a-button>
      </router-link>
      <router-link to="/about">
        <a-button type="link">About</a-button>
      </router-link>
      <a-button type="primary" @click="showModal = true">打开 Modal</a-button>

      <!-- Dropdown 浮层 -->
      <a-dropdown>
        <a-button>Dropdown 菜单</a-button>
        <template #overlay>
          <a-menu @click="handleMenuClick">
            <a-menu-item key="1">菜单项一</a-menu-item>
            <a-menu-item key="2">菜单项二</a-menu-item>
            <a-menu-item key="3" disabled>菜单项三(禁用)</a-menu-item>
            <a-menu-divider />
            <a-menu-item key="4">菜单项四</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <!-- Popconfirm 浮层 -->
      <a-popconfirm
        title="确定要删除这条记录吗？"
        ok-text="确定"
        cancel-text="取消"
        @confirm="handlePopconfirmOk"
      >
        <a-button danger>Popconfirm 删除</a-button>
      </a-popconfirm>

      <!-- Tooltip 浮层 -->
      <a-tooltip title="这是一个提示文本" placement="bottom">
        <a-button>Tooltip 悬停</a-button>
      </a-tooltip>

      <!-- Popover 浮层 -->
      <a-popover title="Popover 标题" content="这是 Popover 的内容区域">
        <a-button>Popover 点击</a-button>
      </a-popover>

      <!-- 打开 Drawer -->
      <a-button @click="showDrawer = true">打开 Drawer</a-button>
    </nav>

    <main>
      <router-view />
    </main>

    <!-- 页面内容区浮层组件: Select、Cascader、DatePicker -->
    <div class="popup-demo-section">
      <h3>页面内浮层组件</h3>

      <a-select v-model:value="selectedValue" style="width: 200px" placeholder="请选择城市">
        <a-select-option value="beijing">北京</a-select-option>
        <a-select-option value="shanghai">上海</a-select-option>
        <a-select-option value="shenzhen">深圳</a-select-option>
        <a-select-option value="hangzhou">杭州</a-select-option>
      </a-select>

      <a-cascader
        v-model:value="cascaderValue"
        :options="cascaderOptions"
        style="width: 200px"
        placeholder="请选择地区"
      />

      <a-date-picker v-model:value="selectedDate" placeholder="选择日期" />

      <a-range-picker v-model:value="rangeDate" style="width: 260px" />
    </div>

    <!-- Antd Modal 浮层 -->
    <a-modal
      v-model:open="showModal"
      title="确认操作"
      @ok="handleOk"
      @cancel="showModal = false"
    >
      <p>确定要执行此操作吗？</p>
      <a-select v-model:value="selectedOption" style="width: 200px" placeholder="请选择">
        <a-select-option value="1">选项一</a-select-option>
        <a-select-option value="2">选项二</a-select-option>
      </a-select>
      <a-time-picker v-model:value="timeValue" style="width: 200px; margin-top: 12px" placeholder="选择时间" />
    </a-modal>

    <!-- Antd Drawer 浮层 -->
    <a-drawer
      v-model:open="showDrawer"
      title="抽屉面板"
      placement="right"
      @close="showDrawer = false"
    >
      <p>这是 Drawer 的内容区域</p>
      <a-select v-model:value="drawerSelect" style="width: 200px" placeholder="Drawer 内 Select">
        <a-select-option value="a">选项 A</a-select-option>
        <a-select-option value="b">选项 B</a-select-option>
      </a-select>
      <a-date-picker v-model:value="drawerDate" style="width: 200px; margin-top: 12px" placeholder="Drawer 内日期" />
      <div style="margin-top: 12px">
        <a-dropdown>
          <a-button>Drawer 内 Dropdown</a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="d1">操作一</a-menu-item>
              <a-menu-item key="d2">操作二</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  Button as AButton,
  Modal as AModal,
  Drawer as ADrawer,
  Select as ASelect,
  SelectOption as ASelectOption,
  DatePicker as ADatePicker,
  RangePicker as ARangePicker,
  TimePicker as ATimePicker,
  Cascader as ACascader,
  Dropdown as ADropdown,
  Menu as AMenu,
  MenuItem as AMenuItem,
  MenuDivider as AMenuDivider,
  Popconfirm as APopconfirm,
  Tooltip as ATooltip,
  Popover as APopover,
} from 'ant-design-vue';

// ---- Modal ----
const showModal = ref(false);
const selectedOption = ref(undefined);
const timeValue = ref(undefined);

function handleOk() {
  showModal.value = false;
}

// ---- Drawer ----
const showDrawer = ref(false);
const drawerSelect = ref(undefined);
const drawerDate = ref(undefined);

// ---- DatePicker / RangePicker ----
const selectedDate = ref(undefined);
const rangeDate = ref();

// ---- Select (standalone) ----
const selectedValue = ref(undefined);

// ---- Cascader ----
const cascaderValue = ref([]);
const cascaderOptions = [
  {
    value: 'zhejiang',
    label: '浙江',
    children: [
      { value: 'hangzhou', label: '杭州' },
      { value: 'ningbo', label: '宁波' },
    ],
  },
  {
    value: 'jiangsu',
    label: '江苏',
    children: [
      { value: 'nanjing', label: '南京' },
      { value: 'suzhou', label: '苏州' },
    ],
  },
];

// ---- Dropdown ----
function handleMenuClick(e: any) {
  console.log('Dropdown 菜单点击:', e.key);
}

// ---- Popconfirm ----
function handlePopconfirmOk() {
  console.log('Popconfirm 确认删除');
}
</script>

<style>
nav {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
main {
  padding: 0 16px;
}
.popup-demo-section {
  padding: 16px;
  margin: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.popup-demo-section h3 {
  width: 100%;
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #888;
}
</style>
