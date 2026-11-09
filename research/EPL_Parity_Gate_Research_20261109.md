# EPL 單雙 Selector 改善｜Gate V1 實測研究封存

**研究紀錄 ID**：`EPL-PARITY-GATES-V1-20261109-RESEARCH`  
**日期**：2026-11-09（Asia/Taipei）  
**狀態**：`RESEARCH_TESTED_NOT_PROMOTED`  
**正式模型與既有封存**：`UNCHANGED`；沒有修改任何正式 R1 / R2 / R3、全輪方向、PASS 或比分。  
**下一次獨立前推起點**：英超 GW11（尚須正式賽前數據及存檔）。

## 1. 資料與可重現性

使用 Library 中原版 `EPL_Parity_CountDispersion_V12_Complete.zip`，SHA-256：
`bb27f973bb1aed23b3f0237046c16cbc4bacb3757c4259ba77c51851923f1b3c`。
其中 `results/selected_picks.csv` SHA-256：`94362c656d28f451da09b9f18a40e2e1e6b46d970d96611c8999d9e9b947b5b6`。

本研究只用 2024–25 與 2025–26 的 V12 已封存固定候選結果，不重訓、不重排賽果、不選擇事後最佳模型，亦沒有用 GW10 的賽果重新決定門檻。V12 紀錄屬早已反覆探索過的歷史資料，**不能稱新盲測**。

基準為 V12 `fixed_data` 每輪兩場，38 輪 × 2 季 × 2 場 = 152 筆；候選族 `fixed_data`, `fixed_calendar`, `fixed_meta`。其固定資料模型（Poisson）在本範圍偏向全雙，故這個一致性比較**不是**獨立的單／雙方向確認。

原始封存 152 筆中有 **34 筆 cutoff 與該場 kickoff 時間相等**（沒有比賽後截點）；本研究另外採用嚴格 `cutoff < kickoff`，剩餘 **118** 筆作更保守比較。這不代表其餘 118 筆全部已擁有不可竄改的實際賽前收集證據。

## 2. Gate 假說與測試結果

A. `MARGIN`：候選固定模型 `abs(p_odd - 0.50) ≥ 0.01`；門檻只作探索性示範，非已驗證可用。  
B. `STABILITY`：三組歷史凍結選場中，至少兩組選中**相同場次且單雙方向一致**。  
C. `MARGIN_AND_STABILITY`：同時通過以上兩項。  
D. `RISK_GUARD`：缺逐場賽前盤口分歧及可靠進球離散度特徵，標記 `NOT_RUN / INPUT_MISSING`，不能宣稱風險過濾有效。

| Gate | 既有 V12 全部 152 筆（探索） | 截點嚴格早於開賽的樣本 | 嚴格樣本覆蓋率 |
|---|---:|---:|---:|
| V12 固定基準 | 79/152（52.0%） | 57/118（48.3%） | 100.0% |
| margin ≥1pp | 9/18（50.0%） | 8/16（50.0%） | 13.6% |
| 同場同方向 ≥2/3 | 63/121（52.1%） | 43/92（46.7%） | 78.0% |
| margin + stability | 8/17（47.1%） | 7/15（46.7%） | 12.7% |

**評估**：對已封存的 V12 基準，簡單 MARGIN、STABILITY 及聯合過濾均沒有展示可泛化優勢；樣本極少的過濾組也不能當成高勝率新規則。`PROMOTE = NONE`。

## 3. 與目前英超 Official 的關係

- 這是 V12（歷史研究模型）的實驗，**不是**目前英超 GW10 `EPL-2026-27-GW10-20261105-MARKETPROXY-RECOVERED` 模型的可重播後驗證。
- 現有 GW10 封存已記錄：單雙 4/10、R1/R2 0/2、R3 1/1；歷史正式 R1+R2 為 11/18（61.1%）。
- 目前 GW10 並無可用的逐場原始 `p_odd`、完整 feature matrix、模型 weights 或一致的開賽前風險輸入。不得用 V12 機率填進 GW10 的正式預測，也不得以賽果改寫選場。
- 不得把上述 V12 152 筆與目前的 Official 累計分母相加。

## 4. 對下一輪的可執行 Research 協定

1. **資料閘**：在 GW11 及往後每輪最早開球前，保留每場 `cutoff_utc`、模型／權重 hash、`p_odd`（未校準則標明）、排名分數、至少三路來源獨立性／版本、0–0／1–1 風險代理、當時盤口或市場分歧及其來源／抓取時間。缺資料一律 `MISSING`，不回填。
2. **候選線**：原 Official R1/R2/R3 不動；Research Margin、Research Stability、Research Combined 各自記錄通過／PASS，以及每輪實際覆蓋場次。不能拿結果當前瞻輸入。
3. **風險線**：等風險特徵與來源有賽前可驗證快照後，再公開凍結風險門檻；未凍結前保持 `NOT_RUN`，不事後用賽果調門檻。
4. **嚴格前推計分**：賽前鎖定研究選場與方向；賽後單獨結算樣本數、R1/R2/R3、選場率、和同場 Official BASE 的 paired delta。缺值、PASS、不同比分版本不能混入已完成樣本。
5. **升級門檻**：先蒐集獨立未用於調參的後續至少 38 輪、76 個有效 Research 選場，再檢驗是否達到目標 ≥75%、是否穩定優於 BASE，並揭露不確定性與不利年度；不達標維持 Shadow。

`PROMOTE = NONE`  
`RESEARCH_ONLY = TRUE`  
`DASHBOARD_SYNC_PENDING = FALSE`（研究紀錄，不是正式新一輪預測 Package）  
`OFFICIAL_PREDICTIONS_CHANGED = FALSE`

## 5. 冷重跑方式

```bash
python epl_parity_gate_audit.py EPL_Parity_CountDispersion_V12_Complete.zip > EPL_Parity_Gate_Research_20261109.json
```

程式僅依封存 V12 ZIP 與標準 Python 函式庫重算，做 CRC、時間戳、歷史結果一致性、每輪二場與候選唯一性檢查。輸出 JSON 具逐季摘要與來源 SHA-256；失敗不被自動視為 PASS。