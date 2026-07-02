-- ============================================================
-- 追加マイグレーション：unit_stats（ストック数キャッシュ）260611
-- migration_unit_stats.sql
--
-- 既に古いschemaを実行済みの場合、この差分だけをSupabaseのSQL Editorで実行する。
-- （questions / daily_usage は既にあるので触らない。ポリシー重複エラーも起きない）
-- ============================================================

-- 単元ごとのストック数キャッシュ
create table if not exists unit_stats (
    subject_id   text        not null,
    unit_id      text        not null,
    question_count int       not null default 0,
    updated_at   timestamptz not null default now(),
    primary key (subject_id, unit_id)
);

-- questions を集計して unit_stats を作り直す関数
create or replace function refresh_unit_stats()
returns void
language plpgsql
as $$
begin
    delete from unit_stats;
    insert into unit_stats (subject_id, unit_id, question_count, updated_at)
    select subject_id, unit_id, count(*)::int, now()
    from questions
    group by subject_id, unit_id;
end;
$$;

-- 公開読み取りを許可
alter table unit_stats enable row level security;

-- ポリシーは存在しない場合のみ作成（重複エラー回避）
do $$
begin
    if not exists (
        select 1 from pg_policies
        where tablename = 'unit_stats'
            and policyname = 'unit_stats are publicly readable'
    ) then
        create policy "unit_stats are publicly readable"
            on unit_stats for select
            using (true);
    end if;
end $$;

-- ============================================================
-- 念のため：questions に keywords 列が無ければ追加する
-- （前回schemaを keywords 追加より前に実行していた場合の保険。
--   既に列があれば何も起きない）
-- ============================================================
alter table questions
    add column if not exists keywords jsonb not null default '[]'::jsonb;