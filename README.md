# ≤Ø6 螺钉选型（证据汇总）静态站

纯前端单页应用：从证据 Excel 抽取公开供应商/标准数据，供塑料自攻与机牙+嵌件选型查阅。

## 本地打开

**方式 A — 直接打开（推荐）**

```bash
# macOS
open index.html
# Linux
xdg-open index.html
# 或用浏览器打开本目录下的 index.html
```

数据已嵌入 `data.js`，`file://` 协议可离线使用。

**方式 B — 本地 HTTP**

```bash
cd screw-selector-web
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/
```

## GitHub Pages

预期地址：https://wenzhangzhou.github.io/screw-selector/

启用方式（若尚未开启）：仓库 **Settings → Pages → Build and deployment → Source** 选 **Deploy from a branch**，Branch 选 `main`，Folder 选 `/ (root)`，Save。本仓库根目录已含静态站文件与 `.nojekyll`，无需构建。

## 数据来源

- 源文件：`螺钉选型_D6及以下_Nm_有出处.xlsx`
- 用 `openpyxl`（`data_only=True`）抽取，禁止编造数值
- `data/data.json` / `data/sources.json`：结构化副本
- `data.js`：浏览器嵌入的同一份 JSON

## 使用说明

1. 选择 **紧固方式**（塑料自攻 / 机牙+嵌件）
2. 选择 **公称直径 d1**（2–6，含 4.5）
3. 选择 **材料**（PC/ABS、PP+GF30、PP+LGF20；另含对照材料）
4. 查看推荐孔径 d0、凸台外径 D、旋合 te（或 EJOT db 范围），以及扭矩状态

**扭矩诚实空态：** 无公开装配扭矩时显示「无公开装配扭矩数据」。机牙嵌件仅展示 PEM **嵌件脱出扭矩（≠装配扭矩）**。

## 声明

仅汇总公开供应商/标准数据，非设计保证；空值需试验或供应商 CALC；GF/LGF 几何可能为最邻近材料近似。

## 文件结构

```
screw-selector-web/
  index.html      # 页面
  styles.css      # 样式
  app.js          # 查询与渲染
  data.js         # 嵌入数据
  data/
    data.json
    sources.json
  README.md
  SMOKE.txt       # 冒烟测试结果
```
