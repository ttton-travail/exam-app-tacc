// ===========================
// 税目・単元マスター
// lib/subjects.ts
//
// 税理士向け学習アプリの「税目（科目）」と、その下の単元（大項目）を定義する。
// 単元は税理士試験の出題範囲および税務実務（TKC方式の月次監査・申告実務）で
// 押さえるべき大項目を基準にしている。
//
// 初期実装の税目：消費税・所得税・法人税・相続税（いずれも国税）。
//
// 将来の拡張候補：
//   - 別途渡される学習＆習得レベルチェック資料に合わせて単元を細分化
//   - 国税徴収法・酒税法・固定資産税・事業税 などの税目を追加
//   - 単元IDはそのまま据え置き、ラベルや並びだけ調整する
// その場合このファイルの中身だけ差し替える。
//
// ※ unitId は問題ストックの保存・検索の正となるため、いったん公開したら
//    既存IDの文字列は変更しない（変えると過去ストックと紐付かなくなる）。
// ===========================

import type { Subject, SubjectGroup } from '@/types/quiz'

export const SUBJECTS: Subject[] = [
    // ---------------- 消費税 ----------------
    {
        id: 'tax_consumption',
        group: 'tax',
        label: '消費税',
        enabled: true,
        units: [
            { id: 'tax_consumption_01', label: '課税の対象・取引の分類（課税・非課税・免税・不課税）' },
            { id: 'tax_consumption_02', label: '納税義務者・事業者免税点・課税事業者の選択' },
            { id: 'tax_consumption_03', label: '課税標準・税率（軽減税率を含む）' },
            { id: 'tax_consumption_04', label: '仕入税額控除の要件と計算' },
            { id: 'tax_consumption_05', label: 'インボイス制度（適格請求書等保存方式）' },
            { id: 'tax_consumption_06', label: '簡易課税制度' },
            { id: 'tax_consumption_07', label: '申告・納付・中間申告' },
        ],
    },

    // ---------------- 所得税 ----------------
    {
        id: 'tax_income',
        group: 'tax',
        label: '所得税',
        enabled: true,
        units: [
            { id: 'tax_income_01', label: '納税義務者・課税所得の範囲・非課税所得' },
            { id: 'tax_income_02', label: '各種所得の金額（利子・配当・不動産・事業・給与ほか）' },
            { id: 'tax_income_03', label: '譲渡所得・一時所得・雑所得' },
            { id: 'tax_income_04', label: '損益通算・損失の繰越控除' },
            { id: 'tax_income_05', label: '所得控除（物的控除・人的控除）' },
            { id: 'tax_income_06', label: '税額計算・税額控除（住宅借入金等特別控除ほか）' },
            { id: 'tax_income_07', label: '源泉徴収・予定納税・確定申告' },
            { id: 'tax_income_08', label: '青色申告制度' },
        ],
    },

    // ---------------- 法人税 ----------------
    {
        id: 'tax_corporate',
        group: 'tax',
        label: '法人税',
        enabled: true,
        units: [
            { id: 'tax_corporate_01', label: '納税義務者・事業年度・所得計算の構造' },
            { id: 'tax_corporate_02', label: '益金・損金の通則と収益費用の計上時期' },
            { id: 'tax_corporate_03', label: '受取配当等・資産の評価' },
            { id: 'tax_corporate_04', label: '減価償却・繰延資産・リース取引' },
            { id: 'tax_corporate_05', label: '役員給与・寄附金・交際費等の損金不算入' },
            { id: 'tax_corporate_06', label: '貸倒損失・引当金・圧縮記帳' },
            { id: 'tax_corporate_07', label: '同族会社・別表調整（申告調整）' },
            { id: 'tax_corporate_08', label: '税額計算・税額控除・申告納付' },
        ],
    },

    // ---------------- 相続税 ----------------
    {
        id: 'tax_inheritance',
        group: 'tax',
        label: '相続税',
        enabled: true,
        units: [
            { id: 'tax_inheritance_01', label: '納税義務者・課税財産の範囲' },
            { id: 'tax_inheritance_02', label: 'みなし相続財産・非課税財産' },
            { id: 'tax_inheritance_03', label: '債務控除・葬式費用・生前贈与加算' },
            { id: 'tax_inheritance_04', label: '課税価格・基礎控除・相続税の総額の計算' },
            { id: 'tax_inheritance_05', label: '税額加算（2割加算）・税額控除（配偶者の税額軽減ほか）' },
            { id: 'tax_inheritance_06', label: '財産評価（宅地・小規模宅地等の特例）' },
            { id: 'tax_inheritance_07', label: '贈与税（暦年課税・相続時精算課税）' },
            { id: 'tax_inheritance_08', label: '申告・納付（延納・物納）' },
        ],
    },
]

export const DEFAULT_SUBJECT_ID = 'tax_consumption'

/**
 * 税目グループの表示順。
 * 設定画面はこの順でチップを改行表示する。
 * 初期実装は国税4税目のみなので1グループ（税目名はラベル側で表示）。
 * 将来、地方税や手続法を別グループにする場合はここに追加する。
 */
export const SUBJECT_GROUPS: { key: SubjectGroup }[] = [
    { key: 'tax' },
]
