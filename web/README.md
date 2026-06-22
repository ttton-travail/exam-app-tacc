# かたてスト -1Click税務学習-（exam-app-tacc / web）

税理士・税理士試験受験生・会計事務所職員向けの学習アプリ。
1Click で AI が税法の4択問題を生成し、解答→解説まで進められる。
exam-app（かたてスト 共テ対策）の実装をたたき台に派生したもの。

- 対応税目（初期）：**消費税 / 所得税 / 法人税 / 相続税**（いずれも国税）
- 出題形式：4択問題（`lib/prompts/tax.ts`）。税理士試験の基礎〜標準＋実務（TKC方式の月次監査・申告実務）で押さえる論点を中心に生成
- 想定用途：税理士試験対策＋実務知識のチェック

## アーキテクチャ（exam-app から継承）

| 領域 | 場所 |
| --- | --- |
| アプリ基本設定・SEO・広告・支援リンク | `lib/config.ts` |
| 税目・単元マスター | `lib/subjects.ts` |
| 出題プロンプト（税法4択） | `lib/prompts/tax.ts` |
| デザイントークン（色＝山吹色系）／文言／スタイル | `lib/design/` |
| LP（ランディングページ）文言・画像 | `lib/lp/content.ts`／`app/page.tsx` |
| 問題生成 API（ストック配信＋AI生成） | `app/api/generate/route.ts` |
| Supabase データ層（ストック・日次上限） | `lib/stock.ts`／`lib/supabase.ts` |
| Gemini 呼び出し・JSON正規化 | `lib/gemini.ts` |

配信ロジック：設定画面で「生成済みストックから出題」か「AIで新規生成」を選ぶ。
新規生成分は Supabase の `questions` テーブルへ保存され、次回以降ストックとして再利用される。

## 系列アプリとの関係（重要）

- **Supabase は系列で共用**（exam-app/mobile/prim と同一プロジェクト）。集計は `daily_usage.app` 列で分離し、本アプリは **`app='tacc'`**。
  - `questions` は `subject_id` で共有。税目IDは `tax_*` で他アプリと衝突しない。
  - `app` 列は text 型・既定 `'exam'` のため、`'tacc'` 追加に**マイグレーション不要**。
- **Gemini キーは系列共通**＝同じ予算。全体上限（`DAILY_GEN_LIMIT_GLOBAL`）は全アプリ合計で判定される。
- News（お知らせ）は `news` テーブルの `apps` 列に `'tacc'` を含む行だけ表示。

## ローカル開発

```bash
npm install
npm run dev   # http://localhost:3000
```

環境変数は `.env.local`（Supabase URL/anon/service_role、`GEMINI_API_KEY`、`NEXT_PUBLIC_APP_KEY=tacc`、`SITE_MODE`）。
`SITE_MODE` は `open`（通常）/`review`（AI生成のみ停止）/`closed`（全遮断＝準備中ページ）。

## ストックの基準年度（base_year）

問題は時間が経つと陳腐化する（特に税法は毎年改正）。そこで `questions` に
**`base_year`（年度＝4月始まり）** を持ち、AI生成時に「どの年度の制度を基準に作ったか」を
サーバー側で記録する（`lib/baseYear.ts` の `getBaseYear()` ＝ プロンプトに提示した年度と同値）。

- 古い問題の抽出：`select * from questions where base_year < 2026;`
- **exam-app と共有DB**なので、マイグレーション `supabase/migration_base_year.sql` は
  **共有DBで1回だけ**実行（exam-app の再デプロイより前に）。列が無い間は新規問題が
  ストックに保存されないだけで、生成・出題は動く（保存はベストエフォート）。

## デプロイ前の TODO

0. **共有Supabaseで `supabase/migration_base_year.sql` を実行**（base_year 列追加）。
1. **本番ドメイン確定** → `lib/config.ts` の `SITE_URL`（暫定 `zeimu.ttton-notty.com`）を差し替え。
2. **ロゴ・LP・科目アイコン画像の差し替え**（`public/assets/` 配下。山吹色＝白ロゴ前提）。
   - `LP_SUBJECT_IMAGES`（`lib/lp/content.ts`）は現状、理科版SVGを暫定流用（`// TODO` 参照）。
3. **AdSense**：新ドメインを AdSense に「サイト追加」して承認後、`AD_MODE` を `'placeholder'` → `'live'` に。
4. **プライマリ色**：`lib/design/tokens.ts` の `primary`/`primaryHover`/`primaryLight`（山吹色系の金）。ロゴに合わせて微調整可。
5. 別途渡される**学習＆習得レベルチェック資料**に合わせ、`lib/subjects.ts` の単元と `lib/prompts/tax.ts` を精緻化。
