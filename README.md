# dsh-slide-gauge · DSH 滑动测量仪

DSH（DeepSeek Harness）Web / 桌面界面右下角的**滑动测量仪**小挂件：拖动角色在标尺上左右滑动，按位置显示状态（梁神 / 梁圣 / 梁子 / 牢梁）；拖到左右边界时出现鲸鱼娘彩蛋。标准 DSH bundle 插件，一条命令安装。

> 安装本插件后：界面右下角会出现「**测**」按钮，点开即可游玩；位置会记住上次状态，刷新后不回到中间。

## 特性

- 右下角悬浮开关，不挡主界面
- 按住角色左右拖动，标与角色同步平移
- 按角色左右边界判定状态：`梁神` / `梁圣` / `梁子` / `牢梁`
- 指针拖到边界（场景 x ≤ 157 或 ≥ 1048）时显示鲸鱼娘
- **记住上次位置**：`localStorage`（键 `dsh-slide-gauge/v1`），刷新 / 重开后恢复
- 场景按原版 1200×700 等比缩放，支持鼠标与触摸
- 随包自带 `biao` / `cly` / `jyn` 图片；**不打包** `liang.png`（可选自备，见下）

## 安装

### 方式 A：npm（推荐）

```bash
dsh plugin --profile web add dsh-slide-gauge
# 桌面 profile：
dsh plugin --profile desktop add dsh-slide-gauge
```

### 方式 B：GitHub

```bash
dsh plugin --profile web add github:yvhcel888/dsh-slide-gauge
# 桌面 profile：
dsh plugin --profile desktop add github:yvhcel888/dsh-slide-gauge
```

安装后**重启**对应 profile（`dsh --profile web` 或重启 DSH Desktop），打开界面即可在右下角看到「测」按钮。

### 卸载

```bash
dsh plugin --profile web remove dsh-slide-gauge
# 或
dsh plugin --profile desktop remove dsh-slide-gauge
```

### 本地开发 link

```bash
dsh plugin --profile web add link:D:\dsh-slide-gauge
```

改前端 `lib/slide-gauge.js` → 硬刷新（Ctrl+F5）；改宿主 `lib/index.js` → 重启 profile。

## 使用说明

1. 点击右下角圆形「**测**」按钮打开面板  
2. 按住中间角色头像左右拖动  
3. 顶部红色文字显示当前状态  
4. 拖到左右虚线边界外侧时出现鲸鱼娘  
5. 关闭面板再打开，会停在上次拖到的位置  

## 权限与风险

| 项 | 说明 |
|---|---|
| 网络 | 仅同源请求本插件路由（`/dsh-slide-gauge/*`）读本地图片与脚本 |
| 外部服务 | **无**（不调用任何第三方 API） |
| 密钥 / 凭据 | **无** |
| 本地存储 | `localStorage` 仅存拖动位置（`dsh-slide-gauge/v1`） |
| 文件系统 | 只读插件包内 `assets/`；可选读取自备的 `assets/liang.png` |
| 进程 / 子进程 | **无** |

支持 profile：`web`、`desktop`。兼容 DeepSeek Harness 插件规范（`dsh.bundle` + `apply(ctx)`）。

## 可选：自备角色图

按约定 **不随包分发 `liang.png`**。若希望用真实图片替代默认「梁」字占位头像，把图片放到：

```text
<插件目录>/assets/liang.png
```

刷新页面即可自动优先加载。

## 目录结构

```text
dsh-slide-gauge/
├── package.json         # dsh.bundle 声明 + npm 元数据
├── cordis.patch.yml     # 挂载声明
├── LICENSE              # MIT
├── README.md
├── lib/
│   ├── index.js         # 宿主：资源路由 + HTML 注入
│   └── slide-gauge.js   # 浏览器端小游戏
└── assets/
    ├── biao.png         # 标（随拖动移动）
    ├── cly.png          # 测量仪底座
    └── jyn.png          # 鲸鱼娘（边界彩蛋）
```

## 技术说明

- 宿主通过 `webServer` 注册 `/dsh-slide-gauge/widget.js` 与 `/dsh-slide-gauge/asset.png?id=…`
- 用 `connection.requestRejection` 做浏览器信任栅栏
- `webServer.tapIndex` 向 `index.html` 注入 `<script defer>`
- 前端逻辑对照原版 pygame `main.py` 的边界与状态判定

## 许可

[MIT](./LICENSE) © yvhcel888

## 相关链接

- 插件市场提交说明：[dsh-plugin.org/zh/submit](https://dsh-plugin.org/zh/submit)
- DeepSeek Harness：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
