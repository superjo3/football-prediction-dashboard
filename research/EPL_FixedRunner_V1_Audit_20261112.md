# EPL 雙版本固定執行系統 V1｜實作與可重現稽核

**稽核日期**：2026-11-12　**版本**：`EPL-FIXED-RUNNER-V1-20261112`  
**封存狀態**：`FIXED_INFERENCE_REPLAY_PASS / HISTORICAL_EXACT_NOT_RECOVERED / PREMATCH_FEED_NOT_YET_AUTOMATED`。

## 結論

**已完成「同一套不改碼的推論引擎」**，能用外部資料執行 EPL 2026-27 新輪次、同時產生 A（Official R90-style MARKETPROXY 代理公式）與 B（Recovery Shadow 五方向模型＋Q 排序器）單雙，亦保留 1X2、全場 O/U2.5 與三市場 R1/R2/R3。只需每輪新增輸入檔，模型程式及固定權重不需要調整。訓練不會在預測階段重新執行。

**未完成**：自動下載並獨立核實新一輪賽程、實際初盤、戰績與每場 PRE-KICK 變動的資料取得系統；未來新輪次的真實賽前回測尚未驗證。這套 V1 不能宣稱恢復了舊 R90 Exact，也**不能把新生成結果自動覆寫成 Official**。

## 實際完成與測試

| 判斷項目 | 結果 | 證據 |
|---|---|---|
| A/B 兩版 GW11 10 場方向與精選 R1/R2/R3 | PASS | `tests/test_pipeline.py` 對原封存 CSV 校驗 |
| 38 欄 CSV 逐位元組重播 | PASS | 原始與重播 SHA-256 同為 `4d5ea7a0e7ab84bf667ecf6a3958b41f6250682d091432682ce63272420cf08d` |
| 全新資料夾解壓重跑 | PASS | ZIP 完整性、18 檔 SHA-256 清單、CSV→標準 JSON→模型輸出 |
| 同一輸入跨執行結果一致 | PASS | 兩次 `forecast.json` 雜湊一致 |
| 場次順序變動不影響運算 | PASS | 外部 match_id 正規排序，同一 CSV 位元組雜湊 |
| 下一輪不修改程式可運算 | PASS（工程測試） | 以人工產生的 **TEST_ONLY 模擬 GW12**，更換輪次、ID、賠率、時點；禁止當作真實預測 |
| 不完整／異常來源阻擋 | PASS | 重複 ID、隊伍缺失、賠率不合法、cutoff 晚於開球、賽果欄位污染、未驗證來源、賽後取得、模型雜湊不符皆拒絕 |
| 依歷史原始資料重訓得到 OLD R90 Exact | NOT_RECOVERED | 原始 OLD R90 五方向模型與 Q 權重從未找回 |
| 完整賽前原始市場資料自動取得與驗證 | NOT_AUTOMATED | 此版本提供 CSV 匯入、時間／來源規格與防呆，不代替上游資料服務 |
| GW12 真實預測與樣本外命中率 | NOT_RUN | 沒有執行未取得來源的真實未來資料，並保留原封存 Official |

## 技術細節

- `run_epl_fixed.py`：單一版本化推論程式，不含球隊或 GW11 比賽資料；以 `--input`、`--model`、`--priors`、`--manifest` 取得所有計算輸入。
- `prepare_input.py`：把外部賽程／賠率／球隊數據三份 CSV 依 `match_id`／`team` 結合；依時間標籤、來源欄位與 10 場 20 隊一致性進行資料契約檢查。
- `assets/R90_RECOVERY_MATH5_SHADOW_GW11.joblib`：沿用 GW11 已封存的 B 版模型實體權重（SHA-256 `c9142f32d71088fe2cdddd9c8b183962347a7b5aab041921c63eca5667909917`）。
- `assets/prior_rates_2025.json`：按歷史 2025-26 最後 10 場單雙比率計算的固定先驗。上季少於 6 場資料的隊伍依原規則使用 **0.5 中性先驗**，註明樣本數。
- `model_manifest.json`：記錄權重及先驗 SHA-256、特徵順序、版本與適用賽季；如 SHA 被竄改，執行即中止。
- `requirements.txt`／`ENVIRONMENT.txt`：明確鎖定 Python 3.13 與五個依賴版本；模型 `.joblib` 不應載入不明來源。
- `tests/GW11_MODEL_OUTPUTS.csv`、`tests/test_pipeline.py`：來源歷史比對與 10 類回歸／異常測試。
- `provenance`：只保留原本硬編碼 GW11 的程式和歷史快取作來源稽核；新執行引擎完全不需讀取兩者。

## 往後每輪如何執行

1. 同時取得該輪完整十場 fixture、可稽核 1X2 / O/U2.5 市場價、截至 cutoff 的完整球隊統計，保存原始取得時間與來源 URL。沒有真實可稽核 timestamp 就不允許 PREMATCH 模式。
2. 固定跑 `prepare_input.py`，將資料轉成結構化 JSON，含 `season/gw/record_id/cutoff/first_kickoff/through_gw`。
3. 固定跑 `run_epl_fixed.py --mode prematch`。程式讀 **同一組**凍結 V1 權重與先驗，計算 A/B 方向與 R1/R2/R3，不手工翻向、調權重、調參或改順位。
4. 保存輸入、輸出、SHA256SUMS，另做資料來源人工／程式獨立核實。符合 Master 正式封存條件後，再追加新賽前 Record。結果及 PRE-KICK 快照獨立追加，禁止覆蓋舊版。
5. 若新賽季、隊伍對照／先驗不足、權重需要更新，必須另建 V2，嚴格前推測試並獨立比較，不得偷偷修改 V1。

**注意：** B 版 Q 只用於相對排名，並非已校準的命中機率；也不能沿用舊 R90 的歷史 73.7% 勝率。固定計算只解決「相同輸入必產生相同結果」，不代表實際勝率已提高。