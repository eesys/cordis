# Cordis 从零重写学习计划

本分支是 **orphan 空分支**（没有 `main` 的提交历史）。用小步迭代把 [cordis](https://github.com/cordiverse/cordis) 从零重建到与 `main` **逐文件一致**。目标不是另写一套 API，而是按可理解的顺序，把 `main` 上的实现重新装回去。

论文背景：[_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512)（时空可组合性）。Cordis 把**空间**（Context / isolate / intercept）和**时间**（Fiber 生命周期 / effect）合成一套插件运行时。

本地若已经 checkout 过旧的同名分支，请硬重置，否则你会继续看到 `main` 的文件：

```bash
git fetch origin
git checkout cursor/rewrite-from-scratch-13a8
git reset --hard origin/cursor/rewrite-from-scratch-13a8
```

## 规则

1. **每步新增或修改不超过约 300 行**（以该步 commit 的插入行数为准）。
2. **每步结束必须 `yarn build` 成功**。对应功能就绪后再从 `main` 拷回测试。
3. **未获审核同意不得开始下一步**。请回复「同意，开始第 N 步」，或指出计划需要改的地方。
4. **实现来自 `main`**，不发明过渡 API。
5. **最后一步**删除本文件，工作树与 `main` 一致。

## 进度

| 步 | 状态 | 主题 |
|----|------|------|
| 0 | **本 PR** | orphan 空分支 |
| 1 | 未开始 | 恢复 `packages/core` 工程 + 符号表、`DisposableList`、Context 骨架 |
| 2 | 未开始 | Fiber 状态与同步 effect |
| 3 | 未开始 | 异步 effect 与错误栈拼接 |
| 4 | 未开始 | 事件总线 |
| 5 | 未开始 | 插件注册表与 `ctx.plugin()` |
| 6 | 未开始 | Fiber 加载 / 卸载 / 更新 |
| 7 | 未开始 | Reflect：provide / get / set 与 Context 代理 |
| 8 | 未开始 | mixin、accessor、inject 刷新 |
| 9 | 未开始 | Traceable 代理（def-site / use-site） |
| 10 | 未开始 | `Service` 与 `@Inject` |
| 11 | 未开始 | Logger |
| 12 | 未开始 | core 对齐并拷回 core 测试 |
| 13 | 未开始 | `@cordisjs/plugin-timer` |
| 14 | 未开始 | `@cordisjs/utils` 的 `List` |
| 15 | 未开始 | Loader：Node 内部 ModuleLoader |
| 16 | 未开始 | Loader：config 表达式与 EntryGroup |
| 17 | 未开始 | Loader：EntryTree |
| 18 | 未开始 | Loader：Entry |
| 19 | 未开始 | Loader：isolate realm |
| 20 | 未开始 | Loader：主类与生命周期钩子 |
| 21 | 未开始 | `@cordisjs/plugin-include` |
| 22 | 未开始 | `@cordisjs/plugin-group` |
| 23 | 未开始 | `@cordisjs/plugin-logger-console` |
| 24 | 未开始 | HMR（监视与变更分类） |
| 25 | 未开始 | HMR（热替换、回滚、错误帧） |
| 26 | 未开始 | `create-cordis` CLI |
| 27 | 未开始 | 收尾：删除本文件、与 `main` 对齐 |

**当前停在第 0 步。** 同意后回复「同意，开始第 1 步」。

## 概念地图

```
Context          空间：插件坐标系。extend / isolate / intercept 派生出子空间。
  └─ Fiber       时间：一次插件实例的寿命。PENDING → LOADING → ACTIVE → …
       ├─ effect 资源：绑定在 Fiber 上的可释放副作用（定时器、监听器、provide）。
       ├─ Events 通信：emit / parallel / serial / bail / waterfall。
       ├─ Registry 插件：把函数/类登记为 Runtime，每次 plugin() 长出一个 Fiber。
       └─ Reflect  服务：provide / inject，Proxy 拦截 ctx.foo。
            └─ Service / Traceable
                 调用点（use-site）与定义点（def-site）分离，支持 isolate。
Loader           用配置树（YAML/JSON）把上述模型实例化；HMR / include / group 建立在其上。
```

`main` 上 `packages/core/src/context.ts` 的构造函数一次性把 Fiber、Reflect、Registry、Events、Logger 全部接上。重建时先留空壳，再按上面的依赖顺序填实。

## 各步说明

### 第 0 步 — orphan 空分支（本步）

工作区（git 跟踪的文件）只有：

- `REWRITE.md`（本计划）
- `package.json`（`build` / `test` / `lint` 为空操作，满足「每步能 build」）
- `.gitignore`

没有 `packages/`、没有 tsconfig、没有 yakumo、没有 `main` 的提交。

### 第 1 步 — core 工程 + Context 骨架

恢复能编译 `packages/core` 的最小工程（根 `package.json`、tsconfig、yakumo，以及 `packages/core` 的 package.json / tsconfig）。Yakumo 本身用 Cordis 写成，空实现不能驱动构建工具，因此这一步会让 yakumo 继续解析 npm 上已发布的 `cordis`，直到我们自己的 core/loader/include 对齐 `main`。

然后装回：`symbols`、`Tracker`、`DisposableList`；`Context.is`、`extend` / `isolate` / `intercept`；构造函数接上各服务空壳和根 Fiber。

若工程文件 + 骨架超过约 300 行，拆成两次提交，仍然算第 1 步里的两小段，第二小段仍等你点头。

**之后你可以：** `new Context()`，调用 `ctx.isolate('foo')` / `ctx.extend({ ... })`；还不能 `plugin` / `on` / `provide`。

### 第 2 步 — Fiber 状态与同步 effect

Fiber 是时间轴上的一段；`effect()` 把清理函数登记到这段寿命上。

装回：`FiberState`、`CordisError`、根 Fiber（`ACTIVE`）、同步 `effect()`（函数 / 同步迭代器）、`getEffects()`、`assertActive()`。

### 第 3 步 — 异步 effect 与错误栈拼接

装回：`composeError` / `buildOuterStack` / `isObject` / `isConstructor`；effect 的 Promise / async iterator 路径。

### 第 4 步 — 事件总线

装回完整 `events.ts`（`on` / `once` / `emit` / `parallel` / `serial` / `bail` / `waterfall`）。

### 第 5 步 — 插件注册表与 `ctx.plugin()`

装回：`Plugin` 类型、`Inject.resolve`（不含装饰器）、`RegistryService`、Fiber 的「有 runtime」构造分支。

### 第 6 步 — Fiber 加载 / 卸载 / 更新

装回：`resolveConfig` / `ValidationError`、`_refresh` / `_setEpoch` / `_reload` / `_unload` / `await` / `restart` / `update`。

### 第 7 步 — Reflect：provide / get / set 与 Context 代理

服务存在 `reflect.store` 里，用 isolate symbol 当 key。

### 第 8 步 — mixin、accessor、inject 刷新

装回：`accessor` / `mixin` / `notify` / `Fiber._checkImpl` / `bind` / `trace`。

### 第 9 步 — Traceable 代理

定义服务的 context（def-site）和调用服务的 context（use-site）可以不同。

### 第 10 步 — `Service` 与 `@Inject`

服务类自动 `provide`；`@Inject` 往类或方法上声明依赖。

### 第 11 步 — Logger

装回完整 `logger.ts`。

### 第 12 步 — core 对齐并拷回测试

对照 `main` 的 `packages/core`，拷回测试并跑通。

### 第 13–14 步 — timer 与 utils

Timer：timeout / interval / throttle / debounce。`List`：带 effect 的集合。

### 第 15–20 步 — Loader

| 步 | 文件 | 学什么 |
|----|------|--------|
| 15 | `internal.ts` | 探测 Node 22/24 内部 ESM ModuleLoader |
| 16 | `config/utils.ts` + `config/group.ts` | JS 表达式插值；EntryGroup 增删改 |
| 17 | `config/tree.ts` | 递归入口树、`import()`、任务等待 |
| 18 | `config/entry.ts` | 单条配置如何变成 Fiber |
| 19 | `config/isolate.ts` | 配置层的 isolate/intercept realm |
| 20 | `index.ts` | Loader 服务本身、与 Fiber 生命周期的钩子 |

### 第 21–23 步 — include / group / logger-console

include 读 YAML/JSON；group 是 Loader `Group` 的 re-export；logger-console 把日志打到 console。

### 第 24–25 步 — HMR

监视 + 依赖分析；缓存清理、重载、回滚。

### 第 26 步 — create-cordis

脚手架 CLI。若超过 300 行再拆。

### 第 27 步 — 与 main 对齐

删除本文件；全量 `yarn build` / `yarn test` / `yarn lint`；工作树与 `main` 一致。

## 本步验证

```bash
yarn build
yarn test
yarn lint
```

三条都是空操作，必须成功。`git log` 里不应再出现 `main` 上的提交。
