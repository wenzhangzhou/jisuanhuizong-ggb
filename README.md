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
- `/cloud/`：数据上云（自建服务器方案同步）

本地：打开根目录 `index.html`，或 `python -m http.server 8080`。

约定见 `CONVENTIONS.md`。

## 云端方案同步（自建服务器）

登录后，各工具可将计算方案保存到自建 API（按工具 id + 用户隔离）。

- 入口页：`/cloud/`（首页「数据上云」卡片）
- 共享模块：`assets/cloud-sync.js`（打自建 `API_BASE`，默认 `https://114.66.0.89.sslip.io`）
- 登录：邮箱或用户名 + 密码；注册免邮箱验证码
- 服务端：VPS `/opt/jisuan-cloud/`（Node JSON 存储 + JWT），nginx 反代 `/api/`
- 降级探测：`http://114.66.0.89:8081/jisuan-api/health`（明文，**不能**被 GitHub Pages 调用）

GitHub Pages 为 HTTPS，必须让 API 也走 HTTPS（开放安全组 **443**，证书可用 sslip.io + TLS-ALPN-01）。

