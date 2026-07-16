<template>
  <div>
    <a-card title="首页" style="margin-bottom: 16px">
      <a-space direction="vertical" style="width: 100%">
        <!-- 搜索栏 -->
        <a-input-search
          v-model="searchText"
          placeholder="搜索内容..."
          enter-button="搜索"
          @search="onSearch"
        />

        <!-- 操作按钮组 -->
        <a-space>
          <a-button type="primary" @click="onAdd">新增</a-button>
          <a-button @click="openModal">打开 Modal</a-button>
          <a-button @click="openDrawer">打开 Drawer</a-button>
          <a-button @click="showDropdown" ref="dropBtn">Dropdown</a-button>
        </a-space>
      </a-space>
    </a-card>

    <!-- 数据表格 -->
    <a-card title="数据列表" size="small" style="margin-bottom: 16px">
      <a-table
        :columns="columns"
        :data-source="dataSource"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #status="{ text }">
          <a-tag v-if="text === '启用'" color="green">启用</a-tag>
          <a-tag v-else color="red">停用</a-tag>
        </template>
        <template #action="{ record }">
          <a-space>
            <a-button type="link" size="small" @click="onEdit(record)">编辑</a-button>
            <a-button type="link" size="small" danger @click="onDelete(record)">删除</a-button>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 公共组件示例 -->
    <a-card title="公共组件 (BaseCard)" size="small" style="margin-bottom: 16px">
      <a-space direction="vertical" style="width: 100%">
        <BaseCard title="卡片 A" content="这是第一个 BaseCard 实例" />
        <BaseCard title="卡片 B" content="这是第二个 BaseCard 实例" />
      </a-space>
    </a-card>

    <!-- 表单交互 -->
    <a-card title="表单交互" size="small">
      <a-form layout="inline">
        <a-form-item label="开关">
          <a-switch v-model="switchVal" />
        </a-form-item>
        <a-form-item label="复选框">
          <a-checkbox v-model="checkVal">选项</a-checkbox>
        </a-form-item>
        <a-form-item label="单选框">
          <a-radio-group v-model="radioVal">
            <a-radio value="a">A</a-radio>
            <a-radio value="b">B</a-radio>
            <a-radio value="c">C</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="下拉">
          <a-select v-model="selectVal" style="width: 150px" placeholder="请选择">
            <a-select-option value="1">选项一</a-select-option>
            <a-select-option value="2">选项二</a-select-option>
            <a-select-option value="3">选项三</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- Dropdown 浮层 -->
    <a-dropdown>
      <a-menu slot="overlay">
        <a-menu-item key="1" @click="onDropAction('编辑')">编辑</a-menu-item>
        <a-menu-item key="2" @click="onDropAction('复制')">复制</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="3" @click="onDropAction('删除')" style="color: red">删除</a-menu-item>
      </a-menu>
    </a-dropdown>
  </div>
</template>

<script>
import BaseCard from '../components/BaseCard.vue';

export default {
  name: 'Home',
  components: { BaseCard },
  data() {
    return {
      searchText: '',
      switchVal: true,
      checkVal: false,
      radioVal: 'a',
      selectVal: undefined,
      columns: [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
        { title: '名称', dataIndex: 'name', key: 'name' },
        { title: '状态', dataIndex: 'status', key: 'status', scopedSlots: { customRender: 'status' } },
        { title: '操作', key: 'action', scopedSlots: { customRender: 'action' }, width: 180 },
      ],
      dataSource: [
        { id: 1, name: '项目 Alpha', status: '启用' },
        { id: 2, name: '项目 Beta', status: '启用' },
        { id: 3, name: '项目 Gamma', status: '停用' },
        { id: 4, name: '项目 Delta', status: '启用' },
      ],
    };
  },
  methods: {
    onSearch(val) { console.log('search:', val); },
    onAdd() { console.log('add'); },
    onEdit(record) { console.log('edit:', record); },
    onDelete(record) { console.log('delete:', record); },
    onDropAction(action) { console.log('dropdown action:', action); },
    openModal() { this.$root.modalVisible = true; },
    openDrawer() { this.$root.drawerVisible = true; },
    showDropdown() { /* Dropdown 由 hover 触发，无需手动控制 */ },
  },
};
</script>
