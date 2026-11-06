# 五大聯賽足球預測 Dashboard v2.1

## 開啟
解壓縮整個資料夾，雙擊 index.html。無需安裝套件或啟動伺服器，所有字型、程式與資料皆可離線使用。請保留資料夾結構。
也可直接開啟 dashboard-standalone.html；它是本次資料的單檔快照，後續更新後須重新產生。

## 收錄範圍
| 聯賽 | 逐場輪次 |
| --- | --- |
| 英超 | GW6–9 |
| 德甲 | GW5、6、7、8、9 |
| 西甲 | GW8 |
| 義甲 | GW6–8 |
| 法甲 | GW6–9 |

共17輪、161筆預測（其中9筆為恢復紀錄）、136筆比分與1筆中止賽事。其他已明示的早期R位及全輪摘要獨立收錄。來源未保存的市場、輪次、比分與正式R3均不補造。
保留較大的內文字體。首頁五聯賽統計、獨立聯賽頁、每輪詳細、研究與跨聯賽比較皆已接入。

## 正式來源與歷史保存
唯一來源為 R1_R2_Master.md。source/保留v55及v56完整快照；v1的既有預測、更新、賽果與檢討均原樣保留。此次不查外部賽果、不重新回測模型。
德甲GW9的11/05二次審計、義甲GW8的10/23盤口更新可在預測版本選單切換。賽前R3補充以獨立事件保存。更新不覆蓋原始方向或順位。

## 資料分層
- predictions.json：原始預測及順位。
- updates.json：盤前快照、賽前補充、版本排序修訂。
- results.json：正式比分或中止狀態。
- reviews.json：賽後檢討與修正建議。
- rank_summaries.json、market_reports.json：來源明示的R位／全輪摘要。
- historical_totals.json：來源較長期累計，獨立對照，不與網站計算值相加。
- reported_predictions.json：僅在結算段落追述的方向，不冒充原始賽前紀錄。
- research.json、cross_league.json、cross_seasons.json：研究摘要，Exact與Proxy分開。
- source_sections.json、audit_notes.json：原文及審計說明。
- rounds.json、manifest.json：輪次與來源索引。
- dashboard.json、data.js：頁面投影。data.js避免本機檔案fetch限制。
- integrity.json：逐筆雜湊，偵測意外改動；不是防惡意竄改系統。

## 統計口徑
缺資料顯示「—」，不當成0%。有完整逐場資料時依正式方向與比分計算；若Master明示更完整的單輪摘要，該輪使用摘要，並標示範圍，不能與部分明細重複相加。法甲GW6為典型例子：全輪摘要7/9，已保存兩場比分為1/2。
R位只計正式選場；候補R3不計。預設累計基準為原始版加賽前R3補充，修訂版本另於輪次頁比較。跨歷代版本合計不等於單一模型勝率。
西甲目前僅有GW8完整逐場單雙表；其他市場未保存賽前方向，不能補算。研究頁是來源封存摘要，非本次執行的新回測。

## 之後如何更新
先在各聯賽分析中封存新一輪至Master，再交由網站匯入；網站不會自動連線同步。可要求：「讀取最新Master，將新預測／賽果追加到Dashboard，保留舊版，重新核對三市場和R1/R2/R3。」
新Master必須另存新版本快照；不可覆蓋source/內舊檔。每次更新先備份整個資料夾。
Python 3輔助工具可追加既有輪次的結果或檢討：

    python3 tools/append_event.py results new_result.json
    python3 tools/append_event.py reviews new_review.json

事件必須有id、record_id、recorded_at、source（file/version/start_line/end_line）；結果另需match_id和score，檢討另需text。工具拒絕重複ID、已存在比分和變動過的歷史。
工具僅支援上述有限追加及非方向性盤前快照；新輪次、排序修訂、來源版本索引須由匯入程式明確擴充後驗證。不要直接手改舊JSON。
append_event後index.html會使用新data.js；單檔版需執行 tools/package_offline.py 重新產生。

tools/build.py是v1匯入器；tools/expand_v2.py是本次v1到v2遷移腳本。兩者禁止在有鎖的既有資料上覆寫；重建需要原v1資料作基準，不能對持續追加資料重跑。

## 驗證
    python3 tools/verify_v2.py
    node --check app.js

已核對來源雜湊、全部分層資料、逐輪三市場命中、正式／候補R3、版本順位及研究分季加總。瀏覽器已檢查首頁、德甲與義甲版本切換、西甲／法甲頁面、研究及跨聯賽頁。未做手機實機測試。
verify_v2.py為本版固定基準；日後新增資料須新增相應驗證。verify.py保留為v1基準，不適用v2。

## v2.1 德甲GW8補回
依Master v57追加RECOVERED紀錄，原預測10/30、結算11/03、恢復11/05。三市場為3/9、5/9、7/9；R1/R2/R3合計1/3、2/3、2/3。累計包含恢復紀錄，不冒充當時已凍結存檔。舊紀錄原樣保留。新版基準驗證使用tools/verify_v21.py。


## 我的單雙
每輪單雙旁可選單／雙與自己的R1／R2／R3；可只填部分場次。未填、待結算不算輸，腰斬排除；比分追加後自動計算全部自選與各順位命中率。首頁及「我的單雙」頁顯示累計。自選只存於目前瀏覽器localStorage，可匯出／匯入JSON備份；不跨裝置自動同步。已知開賽時間或已結算後禁止直接修改；缺開賽時間時以比分收錄為鎖定點。備份還原另有標示，個人紀錄與官方封存永遠分離。
