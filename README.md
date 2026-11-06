# 计算汇总

**正式入口（自建服务器）**：

- 首页：http://114.66.0.89:8081/jisuan/
- 数据上云：http://114.66.0.89:8081/jisuan/cloud/
- API 健康检查：http://114.66.0.89:8081/jisuan/api/health

本仓库仍可推送到 GitHub 作备份；**日常请用自建 URL**，不再依赖 GitHub Pages。

工具页（均在 `/jisuan/` 下）：

- `/condensation/`：冰箱箱体防凝露校核
- `/screw/`：≤Ø6 螺钉选型（证据汇总）
- `/heating-film/`：加热膜功率选型与热平衡
- `/cooldown/`：空载降温与制冷性能核算
- `/evaporator/`：贴片式板管蒸发器面积与管长
- `/condenser/`：丝管冷凝器换热面积与管长
- `/heat-load/`：车载冰箱箱体热负荷工程估算
- `/insulation-holdover/`：保温校核（断电回温）· 达标反推
- `/cloud/`：数据上云（自建服务器方案同步）

本地：打开根目录 `index.html`，或 `python -m http.server 8080`（云同步需自建 API）。

约定见 `CONVENTIONS.md`。

## 云端方案同步（自建服务器）

登录后，各工具可将计算方案保存到自建 API（按工具 id + 用户隔离）。

- 入口页：`/jisuan/cloud/`（首页「数据上云」卡片）
- 共享模块：`assets/cloud-sync.js`（同源自动检测：页面在 `/jisuan/...` 时 API 为 `origin + /jisuan`，请求 `/jisuan/api/...`）
- 登录：邮箱或用户名 + 密码；注册免邮箱验证码
- 服务端：VPS `/opt/jisuan-cloud/`（Node JSON 存储 + JWT）
- nginx（8081，与 carmedia 同站）：
  - `location /jisuan/` → 静态站 `/var/www/jisuanhuizong/`
  - `location /jisuan/api/` → `proxy_pass http://127.0.0.1:8787/`
- 兼容旧路径：`/jisuan-api/` 仍可探测

## nginx 片段示例

```nginx
location /jisuan/api/ {
    proxy_pass http://127.0.0.1:8787/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /jisuan/ {
    alias /var/www/jisuanhuizong/;
    index index.html;
    try_files $uri $uri/ =404;
}
```

注意：`alias` + `try_files` 在部分 nginx 版本行为不同；若目录索引异常，可只用 `alias` + `index`。
