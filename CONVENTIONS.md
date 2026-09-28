# 计算汇总站点约定

后续新增计算工具统一按此逻辑：

1. **首页** `index.html`：计算汇总，用卡片入口选择工具（等宽网格，无 featured 跨列）
2. **每个工具**独立子目录，例如 `condensation/`、`screw/`、`新工具英文短名/`
3. 子目录至少包含：`index.html` + 自有样式/脚本（相对路径）
4. 子页顶部提供「← 返回计算汇总」链回首页（推荐用 `assets/shell.css` 的 `.hub-back`）
5. 纯静态，可 GitHub Pages 公开；不依赖后端登录
6. **设计 token**：新工具引用 `assets/tokens.css`（及可选 `assets/shell.css`），与冷凝器等大计算页同族；勿再各写一套 `:root` 色板与圆角

新增步骤：在子目录实现工具 → 首页 `cards` 增加一张等宽入口卡片 → 提交推送。

## UI 阶段说明

- **A（本阶段）**：共享 `assets/tokens.css` + `assets/shell.css`；首页去花瓣 / 玻璃 / featured，等宽网格
- **B（待做）**：热负荷与大页 token 对齐；参数渐进披露
- **C（待做）**：凝露、螺钉迁入 shell
