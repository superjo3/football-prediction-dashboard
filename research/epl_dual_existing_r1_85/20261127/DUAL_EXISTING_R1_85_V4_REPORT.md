# 英超單雙｜只研究現有 Official × R90 Recovery Shadow 的 Sparse R1-85（V4）

**狀態：RESEARCH ONLY／未證明85%／未升級正式模型。**

## 目的與限制
只使用現有 A 模型（Official R90-style MARKETPROXY 恢復版）及 B 模型（R90 Math5-Q Recovery Shadow）的**賽前封存輸出**：單雙方向、R1/R2/R3 與模型分數。不得加入臨時重訓的第三套方向模型，不修改原始預測。精選版每輪最多一場 R1，沒有合格直接 PASS。

目前正式可逐場對照的 A/B 封存：GW11（已結算10場）、GW12（已封存預測10場、未結算）；更舊 R90 Exact 不是當前固定模型，不能把歷史快取當作同一 A/B 的真實賽前預測。

## GW11：現有模型共振條件的實際表現

| 符合條件 | GW11 命中/場次 | GW12 觸發（尚未結算） |
|---|---:|---|
| Official R1且Shadow同方向 | 1/1 (100.0%) | 0場：PASS |
| Shadow R1且Official同方向 | 0/1 (0.0%) | 1場：EPL-2026-27-GW12-01 |
| 任一模型R1且兩模型同方向 | 1/2 (50.0%) | 1場：EPL-2026-27-GW12-01 |
| 任一模型R1/R2/R3且兩模型同方向 | 2/3 (66.7%) | 2場：EPL-2026-27-GW12-01, EPL-2026-27-GW12-03 |
| 兩模型都有R1/R2/R3且同方向 | 0場（無法計算） | 0場：PASS |

提醒：上述是**條件對照集**，有的輪次會觸發多場，還不是『最多1場』的完整決策器；要成為 R1-only 必須另行凍結單一候選排序及門檻。GW11已見結果，當下研究門檻會產生事後選擇偏差。

### 具體分歧
- GW11：Official R1 賓福特對愛華頓＝雙；Shadow同向；賽果4–0雙，**1/1**。不能解讀為100%可靠。
- GW11：Shadow R1 高雲地利對水晶宮＝雙；Official同向；賽果3–2單，**0/1**。兩個R1來源不可混算。
- GW12：Official R1 愛華頓對利物浦＝雙；Shadow＝單，所以『Official R1且同向』本輪 **PASS**。
- GW12：Shadow R1 諾定咸森林對車路士＝單；Official同向，屬研究候選；Shadow P(單)約0.50069，Q約0.53717，均**不是已校準的85%真實命中概率**。

## 下一版需要真正驗證的現有模型條件
1. 共同方向（A方向==B方向）是第一道分群，但必須與不共振對照。
2. 區分 A-R1、B-R1、雙模型都入R1/R2/R3，以及 R位差距；不要把不同來源混成同一套高勝率。
3. A 的絕對分數邊距、B 的五方向模型分歧以及 Q 排名分數只能作**相對特徵**；必須先校準，不得稱為85%概率。
4. 固定合格條件、單一 tie-break、PASS規則後，僅對未參與設計的**未來賽前封存輪次**評估；每輪記選中/未選中、賽後命中、覆蓋率、95%信賴區間。

## 研究決定
**WATCH / TEST；沒有任何85%已驗證規則。** Official 與 R90 Shadow 繼續完整預測10場；Sparse研究線維持每輪0–1場、可以PASS，且與兩原模型分開結算。GW11/GW12原始紀錄不可覆寫。正式網站不更新本研究。

## 可稽核資料
- `main:data/packages/EPL_GW11_OFFICIAL_20261109.json` SHA `f673e47200a8f0cad3b9dad8535fc57996189ed2`
- `main:data/packages/EPL_GW11_SHADOW_20261109.json` SHA `1bbc3afd65dedc52663964b68360923d595950de`
- `settlement-pending-20261123:data/settlement_pending/2026-11-23/EPL_GW11_20261124_FINAL_RESULT_ADDENDUM_REVIEW_V3.json` SHA `a208283b7b6fb7d7fe886f74d608b998e5e0b1c3`
- `settlement-pending-20261123:data/predictions_pending/2026-11-25/EPL_GW12_FIXED_V1_FORECAST.json` SHA `0291e40007b4872b78543a5f9ab18a42007af3bf`
