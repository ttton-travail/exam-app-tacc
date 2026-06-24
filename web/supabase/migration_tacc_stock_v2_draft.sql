-- ============================================================
-- tacc ストック v2（ドラフト）：4択の階層拡張＋分岐ツリー＋分岐マスタ
-- supabase/migration_tacc_stock_v2_draft.sql
--
-- 【位置づけ】たたき台。実行前に docs/HANDOFF/tacc-content-audit.md の
--   §5（要・現行法令確認）と taxLawChanges.ts の pending/verify を片付けること。
--
-- 【方針（2026-06-24 確定）】
--   ● 4択（term/judgment/calc4）は既存の共有 questions テーブルをそのまま使う。
--     新階層に必要な属性（level・q_format・誤答ノードタグ）だけを「nullable 追加列」で足す。
--     questions は exam-app と物理共有だが、追加列は tacc 専用で exam-app は読まない＝無害。
--   ● 分岐ツリー（tree）は単問4択に収まらない（連続ノード・正解経路・ノード別解説）ため
--     専用テーブル tacc_tree_problems を新設する。
--   ● 分岐マスタ（単元の知識構造）は tacc_branch_master を新設（4択・ツリー・解説の共通土台）。
--
-- 【階層】科目(subject_id) → 単元(unit_id) → レベル(level 1-4) → 出題形式(q_format)
--   q_format: 'term'|'judgment'|'calc4'（4択＝questions）｜'tree'（tacc_tree_problems）
--   unit_id は subjects.ts の体系（tax_xxx_NN）に統一。
-- ============================================================


-- ============================================================
-- 1) 4択：共有 questions に tacc 用の nullable 列を追加（exam-app 無害）
-- ============================================================
alter table questions add column if not exists level smallint;            -- 1-4（tacc のみ設定。exam は NULL）
alter table questions add column if not exists q_format text;             -- 'term'|'judgment'|'calc4'（tacc のみ）
alter table questions add column if not exists error_node_tags jsonb;     -- 誤答=どのノードの誤りか。{"<choiceId>":"<node_id>", ...} 正解は null

-- 任意の値チェック（NULL は許容＝exam 既存行・未設定を通す）
alter table questions drop constraint if exists questions_q_format_chk;
alter table questions add constraint questions_q_format_chk
    check (q_format is null or q_format in ('term','judgment','calc4'));

-- レベル・形式で絞り込む抽出を速くする（tacc 行のみ部分インデックス）
create index if not exists idx_questions_tacc_pick
    on questions (subject_id, unit_id, level, q_format)
    where q_format is not null;


-- ============================================================
-- 2) 分岐点マスタ（単元の知識構造を定義する恒久テーブル）
--    4択・ツリー・解説の3工程が共通参照する土台。1単元=1行。
--    master(jsonb)＝branch_point_master の nodes[]（各 node に branches[]/node_question/
--    legal_basis/verify_flag/verify_note、各 branch に branch/judgment/reason）。
-- ============================================================
create table if not exists tacc_branch_master (
    subject_id     text        not null,               -- 'tax_income' 等（Subject.id）
    unit_id        text        not null,               -- 'tax_income_05' 等（Unit.id に統一）
    unit_label     text        not null,
    master         jsonb       not null,               -- nodes[]（branches[] 含む）
    base_year      smallint,                           -- 準拠年度（4月始まり）
    verify_pending boolean     not null default true,  -- 現行法令の要確認が残っているか（audit §5）
    updated_at     timestamptz not null default now(),
    primary key (subject_id, unit_id)
);


-- ============================================================
-- 3) 分岐ツリー問題（tree・計算・Lv3-4・本アプリの軸）
--    業務処理順に1ノードずつN択回答。回答後に正解経路と実経路を重ねた結果ツリーマップを表示。
--    nodes(jsonb) 例:
--    [ { "node_id":"officer_timing","question":"...",
--        "choices":[{"text":"...","leads_to":"node_excess"},
--                   {"text":"...","leads_to":"leaf_NG1"}],
--        "correct_index":0 }, ... ]
-- ============================================================
create table if not exists tacc_tree_problems (
    id            bigint generated always as identity primary key,
    subject_id    text        not null,
    unit_id       text        not null,
    unit_label    text        not null,
    level         smallint    not null default 3,
    scenario      text        not null,                -- 事例文（前提条件）
    nodes         jsonb       not null,                -- 連続ノード定義（上記）
    correct_path  jsonb       not null,                -- ["node_a","node_b","leaf_ok"]
    explanation   jsonb       not null,                -- {"node_a":"...", "node_b":"..."}
    keywords      jsonb       not null default '[]'::jsonb,
    base_year     smallint,
    source        text        not null default 'seed', -- 'seed'(事前生成) | 'ai'(将来)
    created_at    timestamptz not null default now()
);

create index if not exists idx_tacc_tree_pick
    on tacc_tree_problems (subject_id, unit_id, level);


-- ============================================================
-- 4) ストック数キャッシュ（科目×単元×レベル×形式）
--    4択は questions（tacc 行＝q_format is not null）、tree は tacc_tree_problems を集計。
-- ============================================================
create table if not exists tacc_stock_stats (
    subject_id     text        not null,
    unit_id        text        not null,
    level          smallint    not null,
    q_format       text        not null,               -- 'term'|'judgment'|'calc4'|'tree'
    question_count int         not null default 0,
    updated_at     timestamptz not null default now(),
    primary key (subject_id, unit_id, level, q_format)
);

create or replace function refresh_tacc_stock_stats()
returns void
language plpgsql
as $$
begin
    delete from tacc_stock_stats;
    -- 4択（tacc 行のみ）
    insert into tacc_stock_stats (subject_id, unit_id, level, q_format, question_count, updated_at)
        select subject_id, unit_id, coalesce(level,1), q_format, count(*)::int, now()
        from questions
        where q_format is not null and left(subject_id,4) = 'tax_'
        group by subject_id, unit_id, coalesce(level,1), q_format;
    -- ツリー
    insert into tacc_stock_stats (subject_id, unit_id, level, q_format, question_count, updated_at)
        select subject_id, unit_id, level, 'tree', count(*)::int, now()
        from tacc_tree_problems
        group by subject_id, unit_id, level;
end;
$$;


-- ============================================================
-- 5) 抽出関数
-- ============================================================
-- 4択をランダムN問（レベル・形式で絞り込み。NULL/空なら絞らない。tacc 行のみ）
create or replace function pick_tacc_questions(
    p_subject_id text,
    p_unit_ids   text[],
    p_level      smallint,
    p_q_format   text,
    p_limit      int
)
returns setof questions
language sql
as $$
    select *
    from questions
    where subject_id = p_subject_id
        and q_format is not null
        and (array_length(p_unit_ids, 1) is null or unit_id = any(p_unit_ids))
        and (p_level is null or level = p_level)
        and (p_q_format is null or q_format = p_q_format)
    order by random()
    limit p_limit;
$$;

-- ツリー問題をランダムN問
create or replace function pick_tacc_tree_problems(
    p_subject_id text,
    p_unit_ids   text[],
    p_level      smallint,
    p_limit      int
)
returns setof tacc_tree_problems
language sql
as $$
    select *
    from tacc_tree_problems
    where subject_id = p_subject_id
        and (array_length(p_unit_ids, 1) is null or unit_id = any(p_unit_ids))
        and (p_level is null or level = p_level)
    order by random()
    limit p_limit;
$$;


-- ============================================================
-- 6) RLS（公開読み取りのみ。書き込みは service_role）
--    questions は既存スキーマで RLS 設定済みのため追加不要。
-- ============================================================
alter table tacc_tree_problems enable row level security;
alter table tacc_stock_stats   enable row level security;
alter table tacc_branch_master enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename='tacc_tree_problems' and policyname='tacc_tree readable') then
        create policy "tacc_tree readable" on tacc_tree_problems for select using (true);
    end if;
    if not exists (select 1 from pg_policies where tablename='tacc_stock_stats' and policyname='tacc_stock_stats readable') then
        create policy "tacc_stock_stats readable" on tacc_stock_stats for select using (true);
    end if;
    -- 分岐マスタは生成時に service_role からのみ参照する想定（公開ポリシーは付けない）。
end $$;
