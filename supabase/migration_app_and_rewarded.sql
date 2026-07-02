-- ============================================================
-- migration_app_and_rewarded.sql
--
-- daily_usage に「アプリ別」集計と「リワード動画視聴数」を追加する差分。
-- 既に schema.sql / whole_schema.sql を実行済みのDBに対して、
-- Supabase の SQL Editor でこの内容を貼り付けて実行する。
--
-- 変更点：
--   1) daily_usage に app 列（'exam' | 'mobile' | 'prim'）と rewarded_views 列を追加
--   2) 主キーを day → (day, app) に変更（アプリ別に1日1行）
--   3) increment_daily_usage を app 引数つきに作り直し（戻り値はその日の"全アプリ合計"）
--      ※ 全体コスト上限(2000)は今までどおり「合計」で見るため、合計を返す
--   4) increment_rewarded_views を追加（リワード視聴を+1。1日のハード上限で頭打ち）
--
-- ★★ Supabaseは全アプリ共通（exam-app(web) / mobile / prim が同一プロジェクト）★★
--    このマイグレーションは共有DBで「1回だけ」実行すればよい。
--    アプリの区別はコード側が p_app を渡して行う：
--      Web版= 'exam'（既定） / スマホ版= 'mobile' / 小学生版= 'prim'
--    既存行（移行前の合算カウント）は便宜上 'exam' で埋める（過去分は遡って分割不可）。
-- ============================================================

-- 1) 列の追加（既存の合算行は 'exam' で埋める）---------------------
alter table daily_usage
    add column if not exists app text not null default 'exam';
alter table daily_usage
    add column if not exists rewarded_views int not null default 0;

-- 2) 主キーを (day, app) に張り替え -------------------------------
alter table daily_usage drop constraint if exists daily_usage_pkey;
alter table daily_usage add primary key (day, app);

-- 3) 生成カウント関数を作り直し（旧・無引数版は削除）---------------
--    戻り値はその日の「全アプリ合計」生成数。アプリ側はこれを全体上限と比較する。
drop function if exists increment_daily_usage();
create or replace function increment_daily_usage(p_app text default 'exam')
returns int
language plpgsql
as $$
declare
    today date := (now() at time zone 'Asia/Tokyo')::date;
    total int;
begin
    insert into daily_usage (day, app, gen_count, updated_at)
        values (today, p_app, 1, now())
    on conflict (day, app) do update
        set gen_count = daily_usage.gen_count + 1,
            updated_at = now();
    -- コスト上限は全アプリ合計で見る（同じGeminiキー＝同じ予算のため）
    select coalesce(sum(gen_count), 0) into total
        from daily_usage where day = today;
    return total;
end;
$$;

-- 4) リワード視聴カウント関数（自己申告・偽連打対策のハード上限つき）--
--    リワード視聴は端末からの自己申告で偽装可能なため、1日の加算をここで頭打ちにする。
--    偽連打されても rewarded_views はこの上限を超えない＝枠拡張の最大値が確定する。
create or replace function increment_rewarded_views(p_app text default 'mobile')
returns int
language plpgsql
as $$
declare
    today date := (now() at time zone 'Asia/Tokyo')::date;
    v_hard_max constant int := 1000;   -- 1日あたりリワード視聴の加算上限（調整可）
    newval int;
begin
    insert into daily_usage (day, app, gen_count, rewarded_views, updated_at)
        values (today, p_app, 0, 1, now())
    on conflict (day, app) do update
        set rewarded_views = least(daily_usage.rewarded_views + 1, v_hard_max),
            updated_at = now()
    returning rewarded_views into newval;
    return newval;
end;
$$;
