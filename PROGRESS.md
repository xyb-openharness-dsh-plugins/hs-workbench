# PROGRESS · hs-workbench（小汗宝 HidraPal · 化脓性汗腺炎）

当前里程碑：M0 骨架（基线 check 全绿；文档九件骨架版）
已完成：
- 原子化领取：BACKLOG 快照落盘 docs/backlog-snapshot-20261114.md；认领 issue #78（模板 404，手工六维口径 + /claim 已评论 2026-11-14）；私有仓已建；starter init
- 接线前置：cordis.patch.yml config.root: !!js dshHomePath('hs')；package.json dsh 块与 repository URL 核对
- 资料目录真入口：宿主 uiWorkspace.pickDirectory → 口径校验（主目录/桌面/下载根/tmp，前后端双判）→ /api/hs/root 落盘回显；check-data-dir 4/4 ✓
- 患者档案：/api/hs/subjects 列表+新建（INSERT INTO subjects，新建 is_demo=0，种子档案 is_demo=1 合成示例）；UI 档案 chips + ＋新建档案；check-patient-create ✓
- 试验线：实测 ClinicalTrials.gov cond=Hidradenitis Suppurativa **290 条**（2026-11-14）；保留倾向，M4 落四件套；M0 前端无检索入口（无假入口）
- 文档九件骨架版：SPEC / DEV-REQUIREMENTS(§五默认值) / DIFF-MATRIX / PATIENT-FLOW / SCENARIOS / USER-RESEARCH / INTERACTION-DESIGN / CLINICAL-DATA / DEV-PLAN
- 基线：npm run check exit 0（27 项 ✓；SKIP：schema 未建为 M3 属性）
下一步：M1 三路并行（医学约束 10 主题 / 用户研究证据分层 / 家族结构对比实测重名率 ≤70%）→ G1
阻塞：无（07:54 push 已成功，59b6ad1/f42f847/23e66bc 均上远端）
闸口结论：G1 未达（M0 完成待 M1）
