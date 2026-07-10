/**
 * main.js — Vue 2 + Element UI 运行时 testid 注入演示
 *
 * Vue 2 和 Element UI 通过 CDN 全局注入 (window.Vue / window.ELEMENT)，
 * 运行时模块 @testid/antd-testid-runtime 由 Vite 处理 ESM 导入。
 *
 * 打开 DevTools 查看元素上的 data-testid 属性。
 * Console 命令:
 *   __testIdObserver.fullScan() — 全量扫描
 *   __testIdChecker.check()    — 检查重复 ID
 */

import {
  initConfig,
  TestIdObserver,
  resetAllPopupCounters,
  TestIdChecker,
  elementAdapter,
} from '@testid/antd-testid-runtime';

// ── 全局变量 (来自 CDN) ──
const ELEMENT = window.ELEMENT;

// ── 初始化运行时配置 ──
initConfig({
  globalPrefix: 'demo',
  compilePrefix: 'static_',
  runtimePagePrefix: 'dynamic_',
  // ★ 只使用 Element UI 适配器
  adapters: [elementAdapter],
  popupPrefixMap: {
    modal: 'modal_',
    drawer: 'drawer_',
    select: 'select_',
    datePicker: 'datePicker_',
    popconfirm: 'popconfirm_',
    dropdown: 'dropdown_',
    tooltip: 'tooltip_',
    message: 'message_',
  },
  onlyInteractive: false,
  resetInstanceOnRouteChange: true,
  resetPopupCounterOnRouteChange: true,
});

// ── Cascader 3级数据 (省/市/区) ──
const cascaderOptions = [
  {
    value: 'beijing', label: '北京',
    children: [
      {
        value: 'chaoyang', label: '朝阳区',
        children: [
          { value: 'wangjing', label: '望京街道' },
          { value: 'sanlitun', label: '三里屯街道' },
          { value: 'guomao', label: '国贸街道' },
        ],
      },
      {
        value: 'haidian', label: '海淀区',
        children: [
          { value: 'zhongguancun', label: '中关村街道' },
          { value: 'wudaokou', label: '五道口街道' },
        ],
      },
    ],
  },
  {
    value: 'shanghai', label: '上海',
    children: [
      {
        value: 'pudong', label: '浦东新区',
        children: [
          { value: 'lujiazui', label: '陆家嘴街道' },
          { value: 'zhangjiang', label: '张江街道' },
        ],
      },
      {
        value: 'jingan', label: '静安区',
        children: [
          { value: 'nanjingxilu', label: '南京西路街道' },
        ],
      },
    ],
  },
  {
    value: 'guangdong', label: '广东',
    children: [
      {
        value: 'shenzhen', label: '深圳',
        children: [
          { value: 'nanshan', label: '南山区' },
          { value: 'futian', label: '福田区' },
        ],
      },
      {
        value: 'guangzhou', label: '广州',
        children: [
          { value: 'tianhe', label: '天河区' },
        ],
      },
    ],
  },
];

// ── 模板 ──
const template = `
<div id="app-container" style="padding: 24px; max-width: 900px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <h1 style="color: #409EFF;">Vue2 + Element UI — Runtime TestId Demo</h1>
  <p style="color: #999; margin-bottom: 24px;">
    打开 DevTools 查看元素上的 <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;">data-testid</code> 属性<br/>
    Console: <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;">__testIdChecker.check()</code> 检查重复 ID
  </p>

  <!-- ========== Cascader (重点测试) ========== -->
  <el-card header="Cascader 级联选择器 (3级)" style="margin-bottom: 20px; border-radius: 8px;">
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <div>
        <p><strong>hover 展开 (默认)</strong></p>
        <el-cascader
          :options="cascaderOptions"
          :props="{ expandTrigger: 'hover' }"
          placeholder="hover 触发，选择省/市/区"
          style="width: 320px;"
        />
      </div>
      <div>
        <p><strong>click 展开</strong></p>
        <el-cascader
          :options="cascaderOptions"
          :props="{ expandTrigger: 'click' }"
          placeholder="click 触发，选择省/市/区"
          style="width: 320px;"
        />
      </div>
      <div>
        <p><strong>多选 + 可搜索</strong></p>
        <el-cascader
          :options="cascaderOptions"
          :props="{ multiple: true, expandTrigger: 'hover' }"
          filterable
          placeholder="多选 + 可搜索"
          style="width: 320px;"
          collapse-tags
        />
      </div>
    </div>
  </el-card>

  <!-- ========== Select ========== -->
  <el-card header="Select 下拉选择" style="margin-bottom: 20px; border-radius: 8px;">
    <el-select v-model="selectVal" placeholder="请选择" style="width: 200px;">
      <el-option label="选项A" value="a" />
      <el-option label="选项B" value="b" />
      <el-option label="选项C" value="c" />
    </el-select>
  </el-card>

  <!-- ========== DatePicker ========== -->
  <el-card header="DatePicker 日期选择器" style="margin-bottom: 20px; border-radius: 8px;">
    <el-date-picker v-model="dateVal" type="date" placeholder="选择日期" />
    <span style="margin: 0 10px; color: #999;">— 范围 —</span>
    <el-date-picker
      v-model="dateRange" type="daterange"
      start-placeholder="开始日期" end-placeholder="结束日期"
    />
  </el-card>

  <!-- ========== Dialog / Drawer / MessageBox / Popover / Popconfirm ========== -->
  <el-card header="Dialog / Drawer / MessageBox / Popover / Popconfirm" style="margin-bottom: 20px; border-radius: 8px;">
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <el-button type="primary" @click="dialogVisible = true">打开 Dialog</el-button>
      <el-button type="success" @click="drawerVisible = true">打开 Drawer</el-button>
      <el-button @click="showMessage">弹出 Message</el-button>
      <el-popover title="Popover 标题" content="这是 Popover 内容" trigger="click" placement="bottom">
        <el-button slot="reference" type="warning">Popover</el-button>
      </el-popover>
      <el-popconfirm title="确认删除？" @confirm="onConfirm">
        <el-button slot="reference" type="danger">Popconfirm</el-button>
      </el-popconfirm>
    </div>
  </el-card>

  <!-- ========== Dropdown / Tooltip ========== -->
  <el-card header="Dropdown / Tooltip" style="margin-bottom: 20px; border-radius: 8px;">
    <div style="display: flex; gap: 12px;">
      <el-dropdown trigger="click">
        <el-button>Dropdown 下拉菜单</el-button>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item>选项 1</el-dropdown-item>
          <el-dropdown-item>选项 2</el-dropdown-item>
          <el-dropdown-item divided>选项 3</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
      <el-tooltip content="tooltip 提示" placement="top" effect="dark">
        <el-button>Tooltip 悬停</el-button>
      </el-tooltip>
    </div>
  </el-card>

  <!-- ========== 交互组件 ========== -->
  <el-card header="交互组件 (button / input / checkbox / radio / switch)" style="margin-bottom: 20px; border-radius: 8px;">
    <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
      <el-button type="primary">主要按钮</el-button>
      <el-button>默认按钮</el-button>
      <el-input v-model="inputVal" placeholder="输入框" style="width: 180px;" />
      <el-input-number v-model="numVal" :min="0" :max="100" />
      <el-checkbox v-model="checked">复选框</el-checkbox>
      <el-radio v-model="radioVal" label="a">A</el-radio>
      <el-radio v-model="radioVal" label="b">B</el-radio>
      <el-switch v-model="switchVal" />
    </div>
  </el-card>

  <!-- ========== Dialog 对话框 ========== -->
  <el-dialog title="Dialog 对话框" :visible.sync="dialogVisible" width="500px">
    <p>Dialog body 内容区域</p>
    <el-input v-model="dialogInput" placeholder="Dialog 内输入框" />
    <span slot="footer">
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="dialogVisible = false">确认</el-button>
    </span>
  </el-dialog>

  <!-- ========== Drawer 抽屉 ========== -->
  <el-drawer title="Drawer 抽屉" :visible.sync="drawerVisible" direction="rtl" size="400px">
    <div style="padding: 20px;">
      <p>Drawer 内容区域</p>
      <el-input v-model="drawerInput" placeholder="Drawer 内输入框" />
      <el-button type="primary" style="margin-top: 12px;" @click="drawerVisible = false">关闭</el-button>
    </div>
  </el-drawer>
</div>
`;

// ── 创建 Vue 实例 ──
new Vue({
  el: '#app',
  template,
  data() {
    return {
      cascaderOptions: cascaderOptions,
      selectVal: '',
      dateVal: null,
      dateRange: null,
      inputVal: '',
      numVal: 0,
      checked: false,
      radioVal: 'a',
      switchVal: true,
      dialogVisible: false,
      drawerVisible: false,
      dialogInput: '',
      drawerInput: '',
    };
  },
  methods: {
    showMessage() {
      this.$message({ message: '这是一条消息', type: 'success' });
    },
    onConfirm() {
      this.$message({ message: '已确认操作', type: 'info' });
    },
  },
});

// ── 启动运行时 Observer ──
const observer = new TestIdObserver();
observer.start();

// 首次渲染后全量扫描 + 重复检测
requestAnimationFrame(() => {
  observer.fullScan();
  setTimeout(() => {
    TestIdChecker.check();
  }, 800);
});

// 挂载到 window 方便调试
window.__testIdObserver = observer;
window.__testIdChecker = TestIdChecker;

console.log(
  '%c[testid-runtime] %cElement UI 运行时打标已启动',
  'color: #409EFF; font-weight: bold;',
  'color: #666;'
);
console.log(
  '%c  💡 调试命令: %c__testIdObserver.fullScan() %c| %c__testIdChecker.check()',
  'color: #999;',
  'color: #409EFF;',
  'color: #999;',
  'color: #409EFF;'
);
