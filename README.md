# 计算汇总

GitHub Pages 静态站（`main` 根目录）：

- 首页：https://wenzhangzhou.github.io/jisuanhuizong-ggb/
- `/condensation/`：冰箱箱体防凝露校核
- `/screw/`：≤Ø6 螺钉选型（证据汇总）
- `/heating-film/`：加热膜功率选型与热平衡
- `/cooldown/`：空载降温与制冷性能核算
- `/evaporator/`：贴片式板管蒸发器面积与管长
- `/condenser/`：丝管冷凝器换热面积与管长
- `/heat-load/`：车载冰箱箱体热负荷工程估算
- `/insulation-holdover/`：保温校核（断电回温）· 达标反推

本地：打开根目录 `index.html`，或 `python -m http.server 8080`。

约定见 `CONVENTIONS.md`。

## 云端方案同步（Supabase）

登录后，各工具可将计算方案保存到 Supabase `public.schemes`（按工具 id 隔离，RLS 仅本人可读写）。

- 共享模块：`assets/cloud-sync.js`（仅使用 anon key）
- 登录方式：邮箱魔法链接（Magic Link）
- 空载降温（`cooldown`）：完整本机 ↔ 云同步，登录后可一键迁移 `carcool-schemes-v1`
- 其余工具：云端保存/载入当前表单（gzip 页通过加载器注入云面板）

部署到 GitHub Pages 后，请在 Supabase Dashboard → Authentication → URL Configuration 设置：

- **Site URL**：`https://wenzhangzhou.github.io/jisuanhuizong-ggb/`
- **Redirect URLs**（Additional）：
  - `https://wenzhangzhou.github.io/jisuanhuizong-ggb/**`
  - `http://localhost:8080/**`
  - `http://127.0.0.1:8080/**`

