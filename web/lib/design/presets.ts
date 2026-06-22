// ===========================
// デザインプリセット（分子：意味づけ済み）
// lib/design/presets.ts
//
// tokens(原子=生の値) と styles(各UI) の間に位置する「意味づけ済みプリセット」を集約する。
// ※ 従来 styles.ts 内にあった typography / dividers / DIVIDER_LINE をここへ切り出したもの。
//   styles.ts はここから import + 再 export し、後方互換を保つ。
// ===========================

import { design } from './tokens'

// ============================================================
// タイポグラフィ・プリセット（見出し階層の一元管理）
// ------------------------------------------------------------
// 画面の見出し・補足テキストは原則これらを参照する。
// 個別の微調整が必要ならスプレッド展開で上書きする
//   例: { ...typography.headingSection, fontSize: design.font.sizeMd }
//
//   headingPage     … ページ最上位の見出し（アプリ名など）
//   headingSection  … セクション見出し（科目／単元／投書箱／ご支援／シェア 等）
//   subText         … 見出し下の補足（副題・アイコン下テキスト 等）
//   subTextMuted    … より控えめな注釈（ラベル横の補足 等）
//   pageLead        … ページ見出し直下のリード文（やや大きめの導入）
// ============================================================
export const typography = {
    headingPage: {
        fontSize: design.font.size2xl,
        fontWeight: design.font.weightBold,
        color: design.color.textPrimary,
        margin: `0 0 ${design.spacing.xs}`,
        lineHeight: '1.3',
        wordBreak: 'keep-all' as const,
        whiteSpace: 'pre-line' as const,
    },
    headingSection: {
        fontSize: design.font.sizeSm,
        fontWeight: design.font.weightBold,
        color: design.color.textPrimary,
        margin: `0 0 ${design.spacing.xs}`,
        whiteSpace: 'pre-line' as const,
    },
    subText: {
        fontSize: design.font.sizeXs,
        color: design.color.textSecondary,
        margin: `0 0 ${design.spacing.sm}`,
        whiteSpace: 'pre-line' as const,
    },
    subTextMuted: {
        fontSize: design.font.sizeXs,
        fontWeight: design.font.weightNormal,
        color: design.color.textMuted,
        whiteSpace: 'pre-line' as const,
    },
    pageLead: {
        fontSize: design.font.sizeSm,
        color: design.color.textSecondary,
        margin: `0 0 ${design.spacing.lg}`,
        whiteSpace: 'pre-line' as const,
    },
} satisfies Record<string, React.CSSProperties>

// ============================================================
// 区切り線（1か所で管理）
// ------------------------------------------------------------
// ブロック間の境界線。色・太さを変えるならここだけ直せば全箇所に反映。
//   dividerH … 水平の区切り（上下ブロックの間）。borderTop として使う
//   dividerV … 垂直の区切り（左右ブロックの間）。borderLeft として使う
// 使う側は marginTop/paddingTop 等の余白を必要に応じて足す。
// ============================================================
export const DIVIDER_LINE = `1px solid ${design.color.border}`
export const dividers = {
    h: { borderTop: DIVIDER_LINE } as React.CSSProperties,
    v: { borderLeft: DIVIDER_LINE } as React.CSSProperties,
}
