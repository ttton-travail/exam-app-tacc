// ===========================
// アプリ基本設定・定数管理
// lib/config.ts
// ===========================

// -----------------------------------------------
// 問題数の選択肢
// -----------------------------------------------
export const QUESTION_COUNT_OPTIONS = [5, 10, 20] as const
export type QuestionCount = (typeof QUESTION_COUNT_OPTIONS)[number]

export const DEFAULT_QUESTION_COUNT: QuestionCount = 10

// -----------------------------------------------
// Gemini API設定
// -----------------------------------------------
// 運用ユーザー向けの生成は Flash-Lite を使用（Flashの約1/6のコスト）。
// 価格目安: input $0.10 / output $0.40 per 1M tokens。
export const GEMINI_MODEL = 'gemini-2.5-flash-lite'
// Lite は thinking をほぼ使わないが、税法の4択は選択肢・解説が長文になりやすいので余裕を持たせる。
// 10〜20問でも途中で切れないよう大きめに確保する。
export const GEMINI_MAX_TOKENS = 16384
// thinking を抑えて出力本体にトークンを回す（0で実質オフ）。
export const GEMINI_THINKING_BUDGET = 0
// 内容保障のため深度は1のままに。
export const GEMINI_TEMPERATURE = 1

// -----------------------------------------------
// アプリ情報
// -----------------------------------------------
// 系列アプリ識別キー（お知らせの表示対象フィルタに使う）。
// news テーブルの apps 列（text[]）にこのキーを含む行だけを表示する。
// ・tacc（この税理士版）  … 'tacc'
// ・exam-app（高校版）    … 'exam-app'
// ・prim（小学生版）      … 'prim'
// 値はデプロイ環境ごとに環境変数 NEXT_PUBLIC_APP_KEY で上書きする。
// 同じコードを系列アプリで使い回す前提なので、識別子はコードではなく環境側に持つ。
// 未設定時はこのアプリの既定値 'tacc' にフォールバックする。
export const APP_KEY = process.env.NEXT_PUBLIC_APP_KEY ?? 'tacc'

export const APP_NAME = 'かたてスト -1Click税務学習-'
// PWA（ホーム画面追加）の短い名前。系列の別版（高校版・小学生版）とホーム画面で
// 見分けられるよう、版名込みにする。
export const APP_SHORT_NAME = 'かたてスト 税理士版'
// ブラウザタブ・検索結果・OGP用のフルタイトル（アプリ名＋副題、中黒区切り）。
// ※ 画面ロゴ横の副題（labels.app.subtitle = '- 1Click税務学習 -'）は装飾用で別物。
export const APP_TITLE_FULL = 'かたてスト｜1Click税務学習'
export const APP_DESCRIPTION = 'かたてスト（1Click税務学習）｜1ClickでAIが税理士試験・税務実務の4択問題を生成。消費税・所得税・法人税・相続税を、スキマ時間に知識チェックできる税理士向け学習アプリ'
// 本番URL（OGP・canonical・sitemap で使用）。末尾スラッシュなし。
// ※ 暫定ドメイン。本番ドメイン確定後にここを差し替える（layout/manifest/構造化データに波及）。
export const SITE_URL = 'https://zeimu.ttton-notty.com'
// SEO用キーワード（検索流入を狙う語）。metadata.keywords に渡す。
export const SEO_KEYWORDS = [
    'かたてスト', '税理士', '税理士試験', '税理士 過去問', '税理士 問題',
    '消費税', '所得税', '法人税', '相続税', '税法', '税務', '税務実務',
    'インボイス', '簡易課税', '青色申告', '小規模宅地等の特例',
    'TKC', '月次監査', '税務会計', '会計事務所', '一問一答',
    '勉強', '学習', '学習アプリ', '問題集アプリ', 'AI 問題生成',
    'Ttton', 'TtLab', 'ととらぼ', 'とととん', 'nottY',
]

// -----------------------------------------------
//  デフォルトの問題形式
// -----------------------------------------------
// tax = 税法の4択問題（prompts/tax.ts）。
export const DEFAULT_EXAM_FORMAT = 'tax' as const

// -----------------------------------------------
// 支援策（投げ銭など）
// -----------------------------------------------
// 「ご支援はこちらから」に並べるリンク群。
// enabled:false または url 空の項目は非表示（HP等が未完成のリンクを隠せる）。
// icon は public/assets 下の画像パス（任意）。あればボタン画像として表示し、
// その下に label テキストを出す（画像・テキストとも同じ url へ飛ぶ）。
//
// 【将来のスマホ実装メモ】
//   ストア規約上、外部決済（BMC等）はアプリ内課金を回避する導線にできないため、
//   スマホ版では外部リンクはWebページへ遷移させ、アプリ内課金は別途用意する。
export interface SupportLink {
    id: string             // labels.support.items[id] で表示テキストを引く
    url: string            // 飛び先
    enabled: boolean       // 表示するか
    icon?: string          // public/assets 下の画像パス（任意・BMC公式ボタン等）
}
export const SUPPORT_LINKS: SupportLink[] = [
    {
        id: 'bmc',
        url: 'https://buymeacoffee.com/ttton_notty',
        enabled: true,
        icon: '/assets/bmc-button.svg',
    },
    // 例（いずれ追加）:
    // { id: 'amazon', url: '', enabled: false },  ※表示文言は labels.support.items に追加
]

// 投稿箱（フィードバック）
// -----------------------------------------------
// 感想・要望・お問い合わせ・バグ報告の送信先。
// Google Apps Script の Webアプリ（doPost）URLを設定する。
// 受け取った内容はスプレッドシートに追記される（scripts/feedback_gas.gs 参照）。
// 空文字なら投書箱は非表示。
export const FEEDBACK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyR-VusHCWmc0mmPYispk2pC95A-IHvK4bv9m7g_CyRaZyPwAlQmInV38XLyShOAeeBnQ/exec'

// 連絡先・SNS（フッター右側）
// -----------------------------------------------
// 製作者SNS・問い合わせ先などのリンク群。
// enabled:false または url 空の項目は非表示（HP等が未完成のリンクを隠せる）。
// icon は lib/assets.ts の BRAND_ICONS のキー（'x' | 'line' | 'github' | 'note' ...）。
export interface ContactLink {
    id: string
    label: string
    url: string
    enabled: boolean
    icon?: string          // BRAND_ICONS のキー
}
export const CONTACT_LINKS: ContactLink[] = [
    { id: 'x', label: '開発者X', url: 'https://x.com/Ttton_nottY', enabled: true, icon: 'x' },
    { id: 'note', label: 'note', url: '', enabled: false, icon: 'note' },
    { id: 'github', label: 'GitHub', url: '', enabled: false, icon: 'github' },
    // { id: 'site', label: '開発者サイト', url: '', enabled: false },
]

// 開発者連絡先メール（スパムbot対策のため、ソースに完全なアドレスを残さない）。
// user と domain を分割して保持し、クライアントでマウント後にJSで結合して表示・リンク化する。
// ※ SSR（HTMLソース）にはアドレスが文字列として現れない。
export const CONTACT_EMAIL_USER = 'contact'
export const CONTACT_EMAIL_DOMAIN = 'ttton-notty.com'
// 開発者ページにメールを表示するか
export const SHOW_CONTACT_EMAIL = true

// 共有用SNSボタンを表示するか（フッター。シェアURLは実行時のページURLを使用）
export const ENABLE_SHARE_BUTTONS = true

// シェア投稿文プリセット
// -----------------------------------------------
// X（旧Twitter）でシェアするときの本文テンプレート。
// {url} は実行時のページURLに置換される。
// スマホ版（Google Play）のシェアリンク。
// 正式公開までリンクが無効なので、Web版では SHARE_MOBILE_URL を空にし、
// 代わりに「近日公開予定」の告知行（SHARE_MOBILE_COMING_SOON）を出す。
// 本番公開後は SHARE_MOBILE_COMING_SOON を false にして
// SHARE_MOBILE_URL に 'https://play.google.com/store/apps/details?id=com.tttonotty.katatest' を設定する。
// ※Xは文字数制限があるため、タグは絞ってある。
export const SHARE_MOBILE_URL = ''
export const SHARE_MOBILE_COMING_SOON = false
// 汎用タグ（検索流入用）とブランドタグ（指名・集約用）を分けて、本文では改行で区切る
export const SHARE_HASHTAGS = ['税理士', '税理士試験', '消費税', '所得税', '法人税', '相続税']
export const SHARE_BRAND_HASHTAGS = ['かたてスト', '1Click税務学習', 'TtLab', 'ととらぼ']
export function buildShareText(pageUrl: string): string {
    const lines = [
        'かたてスト -1Click税務学習-',
        '1ClickでAIが税法の4択問題を生成。消費税・所得税・法人税・相続税をスキマ時間に知識チェック',
        '',
        '▼Web版',
        pageUrl,
    ]
    if (SHARE_MOBILE_URL) {
        lines.push('▼スマホ版', SHARE_MOBILE_URL)
    } else if (SHARE_MOBILE_COMING_SOON) {
        lines.push('▼スマホ版（Google Play・近日公開予定）')
    }
    lines.push(
        '',
        '開発者 @Ttton_nottY',
        '',
        SHARE_HASHTAGS.map((t) => '#' + t).join(' '),
        SHARE_BRAND_HASHTAGS.map((t) => '#' + t).join(' '),
    )
    return lines.join('\n')
}

// -----------------------------------------------
// 回数制限・予算ガード
// -----------------------------------------------
// 端末ごと（localStorage）の1日あたり新規AI生成の上限回数。
// ストックからの配信はカウントしない（無料・無制限）。
// ※ スマホ版は同じ基本上限(10)に達した後、リワード動画で +1 できる（Web版は動画なし＝10で固定）。
export const DAILY_GEN_LIMIT_PER_DEVICE = 10
// 全体（サーバー側）の1日あたり新規AI生成の上限。コスト暴走・悪意あるアクセスの歯止め。
// 想定：10回 × 100人規模でも収まる範囲。利用状況に応じて調整する。
export const DAILY_GEN_LIMIT_GLOBAL = 2000
// -----------------------------------------------
// 広告（Google AdSense）
// -----------------------------------------------
// AD_MODE で広告の出し方を切り替える。
//   'off'         … 広告を一切出さない（DOMにも出さない）。
//   'placeholder' … グレー枠＋サイズ表示のダミーを出す。レイアウト確認・審査前用。
//   'live'        … 実際の AdSense 広告を配信する（審査通過後）。
// 審査フロー：placeholder でレイアウト確認 → 申請 → 通過後に 'live' へ。
// ※ 税理士版は新ドメインのため、AdSense に当ドメインを「サイト追加」して
//    審査が通るまでは 'placeholder' のままにする（未承認ドメインで 'live' にしても
//    広告は配信されず空枠になる）。承認後に 'live' へ切り替える。
export const AD_MODE: 'off' | 'placeholder' | 'live' = 'placeholder'

// AdSense のパブリッシャーID（ca-pub-XXXXXXXXXXXXXXXX）。系列共通の発行者IDを使う。
// ※ 配信には AdSense 管理画面で当アプリのドメインを「サイト」として追加・承認が必要。
export const ADSENSE_CLIENT = 'ca-pub-5827479117826832'
// 広告ユニットのスロットID。配置ごとに作成して設定する（通過後）。
// 広告はフッター内（2カラムブロックの下・著作権表記の上）に1か所。
// 設定画面・結果画面はどちらも同じ Footer を使うため、共通の1スロットで配信する。
export const ADSENSE_SLOTS = {
    footerBottom: '4049295913', // フッター内バナー（設定・結果の両画面で共有）
} as const