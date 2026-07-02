-- ============================================================
-- 税理士版（exam-app-tacc）専用 4択ストック テーブル（ドラフト）
-- supabase/migration_tacc_questions_draft.sql
--
-- 【位置づけ】たたき台。tacc は現在おためし生成の内容精査中のため、
--   スクリプトは用意しておくが、実行・アプリ配線（stock.ts 切替）は後日。
--
-- 【方針（2026-07-02 ユーザー決定）】
--   ● 4択ストックも exam-app（理科版）の questions とは物理的に分け、tacc 専用の
--     tacc_questions を新設する（ai の ai_questions と同じ考え方）。
--   ● これは migration_tacc_stock_v2_draft.sql の §1（共有 questions に tax_ 用の
--     nullable 列を足す案）を【置き換える】もの。分岐ツリー（tacc_tree_problems）と
--     分岐マスタ（tacc_branch_master）はそのまま別テーブルとして併用する。
--   ● 階層（科目→単元→レベル→出題形式）を tacc_questions 自身が列で持つ：
--       level(1-4) ・ q_format('term'|'judgment'|'calc4') ・ error_node_tags(誤答→ノード)
--   ● review_status は ai と同一運用：seed/convert 投入=kept、AI新規=unchecked。
--
-- 【使い方（後日）】Supabase の SQL Editor で1回実行 → convert 出力CSVを
--   Table Editor →【tacc_questions】→ Import data from CSV で取込。
-- ============================================================

-- ============================================================
-- 1) 4択ストック本体（tacc 専用）
-- ============================================================
create table if not exists tacc_questions (
    id              bigint generated always as identity primary key,
    subject_id      text        not null,               -- 'tax_income' 等
    unit_id         text        not null,               -- 'tax_income_05' 等
    unit_label      text        not null,
    exam_format     text        not null default 'csat',
    -- 階層属性（tacc 固有）
    level           smallint,                            -- 1-4（基礎〜発展）
    q_format        text,                                -- 'term'|'judgment'|'calc4'
    error_node_tags jsonb,                               -- 誤答=どのノードの誤りか {"<choiceId>":"<node_id>"}
    -- 4択本体
    question        text        not null,
    choices         jsonb       not null,
    answer_index    int         not null,
    explanation     text        not null,
    keywords        jsonb       not null default '[]'::jsonb,
    source          text        not null default 'seed',   -- 'seed' | 'user'
    base_year       smallint,
    review_status   text        not null default 'kept',   -- 'kept'|'unchecked'|'flagged'|'removed'
    created_at      timestamptz not null default now()
);

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'tacc_questions_review_status_chk') then
        alter table tacc_questions add constraint tacc_questions_review_status_chk
            check (review_status in ('unchecked', 'kept', 'flagged', 'removed'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'tacc_questions_q_format_chk') then
        alter table tacc_questions add constraint tacc_questions_q_format_chk
            check (q_format is null or q_format in ('term','judgment','calc4'));
    end if;
end $$;

create index if not exists idx_tacc_questions_pick
    on tacc_questions (subject_id, unit_id, level, q_format);
create index if not exists idx_tacc_questions_source_review
    on tacc_questions (source, review_status);

-- ============================================================
-- 2) 抽出関数（レベル・形式で絞り込み。NULL/空なら絞らない。removed 除外）
-- ============================================================
create or replace function pick_tacc_questions(
    p_subject_id text,
    p_unit_ids   text[],
    p_level      smallint,
    p_q_format   text,
    p_limit      int
)
returns setof tacc_questions
language sql
as $$
    select *
    from tacc_questions
    where subject_id = p_subject_id
        and review_status <> 'removed'
        and (array_length(p_unit_ids, 1) is null or unit_id = any(p_unit_ids))
        and (p_level is null or level = p_level)
        and (p_q_format is null or q_format = p_q_format)
    order by random()
    limit p_limit;
$$;

-- ============================================================
-- 3) ストック数キャッシュ（tacc 専用・科目×単元×レベル×形式）
-- ============================================================
create table if not exists tacc_unit_stats (
    subject_id     text        not null,
    unit_id        text        not null,
    level          smallint    not null default 1,
    q_format       text        not null default 'term',
    question_count int         not null default 0,
    updated_at     timestamptz not null default now(),
    primary key (subject_id, unit_id, level, q_format)
);

create or replace function refresh_tacc_unit_stats()
returns void
language plpgsql
as $$
begin
    delete from tacc_unit_stats;
    insert into tacc_unit_stats (subject_id, unit_id, level, q_format, question_count, updated_at)
    select subject_id, unit_id, coalesce(level,1), coalesce(q_format,'term'), count(*)::int, now()
    from tacc_questions
    where review_status <> 'removed'
    group by subject_id, unit_id, coalesce(level,1), coalesce(q_format,'term');
end;
$$;

-- ============================================================
-- 4) RLS（公開読み取りのみ。書き込みは service_role）
-- ============================================================
alter table tacc_questions  enable row level security;
alter table tacc_unit_stats enable row level security;

do $$
begin
    if not exists (select 1 from pg_policies where tablename='tacc_questions' and policyname='tacc_questions readable') then
        create policy "tacc_questions readable" on tacc_questions for select using (true);
    end if;
    if not exists (select 1 from pg_policies where tablename='tacc_unit_stats' and policyname='tacc_unit_stats readable') then
        create policy "tacc_unit_stats readable" on tacc_unit_stats for select using (true);
    end if;
end $$;

-- ============================================================
-- 補足：
--   ・分岐ツリー（tacc_tree_problems）／分岐マスタ（tacc_branch_master）は
--     migration_tacc_stock_v2_draft.sql の定義をそのまま使う（別テーブルのまま）。
--     ただし §1「共有 questions に列追加」は本ファイルの tacc_questions に置き換える。
--   ・daily_usage（1日上限）は系列共有の既存テーブル（app='tacc'）を使う＝マイグレ不要。
-- ============================================================
