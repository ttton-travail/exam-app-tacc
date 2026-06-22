-- ============================================================
-- マイグレーション：questions に base_year（基準年度）列を追加
-- supabase/migration_base_year.sql
--
-- 目的：問題作成時に基準とした「最新資料の年度」（年度＝4月始まり）を記録する。
--       税制改正・学習指導要領の改訂で内容が古くなった問題の精査・入替判断に使う
--       （例：select * from questions where base_year < 2026; で古い問題を抽出）。
--
-- ★この questions テーブルは exam-app（高校版）と exam-app-tacc（税理士版）で共用する
--   同一の Supabase プロジェクトにある。よって本マイグレーションは
--   【共有DBで1回だけ】実行すれば両アプリに効く。
--   prim（小学生版）は別DBなので、必要なら prim 側でも別途実行する。
--
-- 値の入り方：
--   ・新規にAI生成された問題は、生成時の基準年度がサーバー側で自動的に入る
--     （lib/baseYear.ts の getBaseYear() ＝ プロンプトに提示した年度と同じ値）。
--   ・本列の追加より前に作られた既存行は NULL（基準年度不明）のまま残る。
-- ============================================================

alter table questions
    add column if not exists base_year smallint;

comment on column questions.base_year is
    '問題作成時に基準とした最新資料の年度（年度＝4月1日始まり）。NULLは列追加前の既存行（基準年度不明）。';

-- 既存行（列追加前に作られた問題）の base_year を一律 2026 にバックフィルする。
-- これらは直近（2026年度）に生成・蓄積されたストックのため、基準年度を 2026 とみなす。
-- ※ 新規にAI生成される問題は、生成時の基準年度がコード側で自動的に入るので、ここでは触らない
--   （where base_year is null で既存の NULL 行だけを対象にする）。
update questions
    set base_year = 2026
    where base_year is null;

-- 任意：古い問題の抽出を速くするインデックス（テーブルが大きくなってきたら）。
--   create index if not exists idx_questions_subject_base_year
--       on questions (subject_id, base_year);
