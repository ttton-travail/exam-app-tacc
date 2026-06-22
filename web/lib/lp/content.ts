// ===========================
// ランディングページ（LP）コンテンツ一括管理
// lib/lp/content.ts
//
// LP に出すテキスト・画像パス・お知らせ（News）はすべてここで管理する。
// 文言・画像差し替え・お知らせ追加は、原則このファイルだけ編集すればよい。
//
// 画像は public/assets/lp/ 配下に実体を置き、ここではパスのみ参照する
// （既存の lib/assets.ts と同じ「パスはレジストリに集約」する流儀）。
// ===========================

// ---- LP用 画像パス（public/assets/lp 配下に実体を置く） ----
export const LP_IMAGES = {
    // ① ヒーロー左のメイン画像（1枚。合成済みの画像を配置）
    main: '/assets/lp/lp-main.svg',
    // ②③④ アピールポイント3カラムの画像
    col1: '/assets/lp/3col-1.svg',
    col2: '/assets/lp/3col-2.svg',
    col3: '/assets/lp/3col-3.svg',
    // ⑤⑥ アプリ画面の実例（設定画面＋結果画面を1枚にまとめた画像）
    appSample: '/assets/lp/app-sample.svg',
} as const

// 対応税目カードのイメージ画像（税目id → 画像パス）。
// 正方形イメージを public/assets/lp/subjects/ に配置する。
// ※ 現状は理科版の既存SVGを暫定プレースホルダとして流用している。
//    税目用の正方形イメージ（consumption/income/corporate/inheritance）を用意したら差し替える。
export const LP_SUBJECT_IMAGES: Record<string, string> = {
    tax_consumption: '/assets/lp/subjects/info.svg',  // TODO: 消費税用の画像に差し替え
    tax_income: '/assets/lp/subjects/phys.svg',       // TODO: 所得税用の画像に差し替え
    tax_corporate: '/assets/lp/subjects/chem.svg',    // TODO: 法人税用の画像に差し替え
    tax_inheritance: '/assets/lp/subjects/bio.svg',   // TODO: 相続税用の画像に差し替え
}

// ---- LP用 文言 ----
export const lpContent = {
    // 共通：アプリへの遷移先（ルート=LP、/app=アプリ本体）
    appHref: '/app',

    // ① ヒーロー（メインキャッチ＋CTA）
    hero: {
        // ① メイン画像（1枚）
        image: { src: LP_IMAGES.main, alt: 'かたてスト 税理士版 アプリイメージ' },
        // メインキャッチ：1行目（大）と2行目（やや小）でサイズを変える。
        // さらにその下に補足のサブテキスト（catchSub）を置く。
        catchMain1: '片手で完結',
        catchMain2: '1Clickでカンタン税務学習',
        catchSub: 'Clickするだけで\nサクサク進む！',
        catchSub2: '消費税・所得税・法人税・相続税。\nAIが作る4択問題で、\nスキマ時間に知識チェック',
        ctaLabel: '今すぐアプリを始める',
    },

    // ②③④ アピールポイント3カラム（メイン見出し｜サブ説明）
    points: [
        {
            image: LP_IMAGES.col1,
            imageAlt: '完全無料・登録不要のイメージ',
            main: '完全無料・登録不要',
            sub: '税目・単元・問題数を選んで\n始めるだけ',
        },
        {
            image: LP_IMAGES.col2,
            imageAlt: '片手でサクサク進むイメージ',
            main: '試験対策にも実務の足固めにも',
            sub: '税理士試験の基礎固めから\n日々の実務知識の確認まで',
        },
        {
            image: LP_IMAGES.col3,
            imageAlt: 'AI生成で問題が尽きないイメージ',
            main: 'いつでも新たな挑戦を',
            sub: 'AI生成で、好きなだけ\n新しい問題＆解説に出会える',
        },
    ],

    // ⑤⑥ 使い方（アプリ画面例＋3STEP）
    usage: {
        // 見出し（セクションタイトル）
        heading: '使い方はカンタン3ステップ',
        // 画面例の画像（設定＋結果を1枚にまとめたもの）
        image: { src: LP_IMAGES.appSample, alt: 'かたてスト 税理士版 設定画面と結果画面の例' },
        // 3ステップ説明
        steps: [
            { no: 'STEP 1', text: '税目・単元・問題数を選択' },
            { no: 'STEP 2', text: '皆が今まで生成した問題 / 新たにAI生成した問題を選んでスタート！' },
            { no: 'STEP 3', text: '採点されたら解説で復習\n同じ問題をシャッフル / 新しい問題セットで何度でも再挑戦' },
        ],
    },

    // 対応税目セクション
    subjects: {
        heading: '現在の対応税目',
    },

    // ⑦ CTA（科目パネル内に表示。リード文＋ボタン）
    bottomCta: {
        lead: '↓まずは1回試してみよう！↓',
        ctaLabel: '今すぐ始める',
    },

    // ⑧ News（お知らせ・更新情報）
    // ※ お知らせの「中身（各行）」は Supabase の news テーブルで管理する。
    //   （date_text / body / tag / sort_order。追加・修正は Table Editor から）
    //   ここには見出し等の「文言」だけを残す。行データは page 側で
    //   /api/news（→ lib/news.ts の getNews）から取得する。
    news: {
        heading: 'お知らせ',
    },
} as const