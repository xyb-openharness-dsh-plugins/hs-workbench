# CLINICAL-DATA · hs-workbench（M0 骨架版）

> 0 临床审核（如实标注：本文档医学内容未经临床医生审核，阈值/频次类一律【待核】）；0 患者访谈（如实标注）。

## 临床数据库快照状态

- **实测（2026-11-14）**：ClinicalTrials.gov API v2 `query.cond=Hidradenitis Suppurativa`，`countTotal=true` → **290 条**。接口应答原文已核（totalCount=290）。
- **决策**：试验线**保留倾向**（290 条远超裁剪阈值；含 bimekizumab/adalimumab 等干预试验）。M4 落 `research/hs/` 四件套（manifest/jsonl/sqlite/FAILED）后按 35 号四段链路接入；M4 前前端不出现检索入口（不写假入口）。
- 中国试验通道（chictr）未实测：M4 补，FAILED 如实记。

## 内容边界

- 指南只定内容边界，不转成自测或选治疗；未过临床审核的阈值与求助短语作待核占位。
- Hurley 期（Ⅰ–Ⅲ）为皮肤科病情轻重语境对照，工作台不做自动分级判定、不落判读列。
- 中国适应证只认中国官方来源（NMPA），未取得前一律【待核】。
- 化验指标口径：只列医生原文与日期；不同方法/机构不合并。
