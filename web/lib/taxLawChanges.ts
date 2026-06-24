// ===========================
// 税制改正・最新情報トラッカー
// lib/taxLawChanges.ts
//
// 作業中に拾った税制改正などの最新情報を「年度・関連科目&単元・内容・施行・反映状況」で
// 蓄積する単一の元データ。目的は2つ：
//   1) 問題ストック生成時に「最新の税法に合っているか」を確認する作業リスト（status を見る）
//   2) 将来の「税制改正ニュース表示ページ」のデータ源（このまま import して描画できる）
//
// ※ いったん exam-app-tacc（Next アプリ）内に置く。外部向け実装方針が決まったら
//    Supabase テーブル（例: tacc_law_changes）へ移す可能性あり。その時はこの配列を
//    そのまま seed にできるよう、フィールド構成を DB 想定に寄せてある。
//
// ※ 数値・適用時期は税制改正で動く。status='verify' は現行法令での要確認、
//    'pending' は確認済みだがストック未反映、'reflected' は subjects.ts 等に反映済み。
//    断定できない具体的数値は verifyNote に確認ポイントを残す（推測値で確定しない）。
// ===========================

export type LawChangeStatus =
    | 'verify' // 現行法令・具体的数値の確認が必要（最優先）
    | 'pending' // 内容は確定だが問題ストック/マスタへ未反映
    | 'reflected' // subjects.ts / 型 / コメント等に反映済み（ストックは別途）

export interface TaxLawChange {
    id: string
    /** 改正年度（西暦。例：令和7年度改正＝2025） */
    fiscalYear: number
    /** 改正の通称 */
    reform: string
    /** 関連科目（subjects.ts の Subject.id） */
    subjectId: 'tax_consumption' | 'tax_income' | 'tax_corporate' | 'tax_inheritance'
    /** 関連単元（subjects.ts の Unit.id。複数可） */
    unitIds: string[]
    /** 内容の見出し */
    title: string
    /** 内容（要点） */
    summary: string
    /** 施行・適用時期 */
    effectiveFrom: string
    status: LawChangeStatus
    /** 出典（タックスアンサー番号・国税庁URL等。確認後に埋める） */
    source?: string
    /** 確認すべきポイント（status='verify' のとき） */
    verifyNote?: string
}

export const TAX_LAW_CHANGES: TaxLawChange[] = [
    // ---------------- 所得税（令和7年度改正＝最優先） ----------------
    {
        id: 'r7_basic_deduction',
        fiscalYear: 2025,
        reform: '令和7年度税制改正',
        subjectId: 'tax_income',
        unitIds: ['tax_income_05', 'tax_income_06'],
        title: '基礎控除の引上げ（いわゆる「年収の壁」対応）',
        summary:
            '所得税の基礎控除を引き上げ（従来48万円）。さらに合計所得金額に応じた時限的な上乗せが設けられた。手取り計算・課税最低限に直結。',
        effectiveFrom: '令和7年分以後',
        status: 'verify',
        verifyNote:
            '引上げ後の基礎控除額（58万円ベース＋上乗せの段階・対象所得・適用年分の時限）を国税庁の最新資料で確定すること。',
    },
    {
        id: 'r7_salary_deduction',
        fiscalYear: 2025,
        reform: '令和7年度税制改正',
        subjectId: 'tax_income',
        unitIds: ['tax_income_02', 'tax_income_05', 'tax_income_06'],
        title: '給与所得控除の最低保障額の引上げ',
        summary: '給与所得控除の最低保障額を引上げ（従来55万円）。給与所得者の課税最低限に影響。',
        effectiveFrom: '令和7年分以後',
        status: 'verify',
        verifyNote: '引上げ後の最低保障額（65万円ベース）と適用範囲を確定すること。',
    },
    {
        id: 'r7_special_relative_deduction',
        fiscalYear: 2025,
        reform: '令和7年度税制改正',
        subjectId: 'tax_income',
        unitIds: ['tax_income_05', 'tax_income_06'],
        title: '特定親族特別控除の新設',
        summary:
            '19歳以上23歳未満等の親族について、その親族の合計所得が一定額（従来の扶養控除の48万円）を超えても段階的に控除を受けられる新制度。扶養控除の特定扶養親族（63万円）とは別建て。',
        effectiveFrom: '令和7年分以後',
        status: 'verify',
        verifyNote:
            '対象年齢・親族の所得要件（例：合計所得58万円超〜の段階）・控除額・特定扶養控除との適用関係を確定すること。分岐マスタ「扶養控除」ノードと整合を取り直す。',
    },
    {
        id: 'r4_short_retirement',
        fiscalYear: 2022,
        reform: '令和4年分以後（既施行）',
        subjectId: 'tax_income',
        unitIds: ['tax_income_02'],
        title: '短期退職手当等の1/2課税の制限',
        summary:
            '勤続5年以下の役員等以外の短期退職手当等は、退職所得控除後の残額のうち300万円超部分について1/2課税を適用しない。',
        effectiveFrom: '令和4年1月1日以後支払分',
        status: 'reflected',
        verifyNote: '分岐マスタに収録済み。値の再確認のみ。',
    },

    // ---------------- 法人税 ----------------
    {
        id: 'r7_smb_reduced_rate',
        fiscalYear: 2025,
        reform: '令和7年度税制改正',
        subjectId: 'tax_corporate',
        unitIds: ['tax_corporate_08'],
        title: '中小法人の軽減税率の見直し',
        summary:
            '中小法人の年800万円以下の所得に対する軽減税率（特例15%）について、所得が一定額を超える法人の税率を引上げる等の見直し。',
        effectiveFrom: '令和7年度改正（適用開始時期は要確認）',
        status: 'verify',
        verifyNote:
            '所得10億円超の中小法人は17%等の見直し有無、特例15%の適用期限、適用除外事業者の基準を現行で確定すること。',
    },

    // ---------------- 消費税（インボイス） ----------------
    {
        id: 'invoice_transition',
        fiscalYear: 2023,
        reform: 'インボイス制度 経過措置',
        subjectId: 'tax_consumption',
        unitIds: ['tax_consumption_05'],
        title: '免税事業者等からの仕入に係る控除の経過措置（段階縮小）',
        summary:
            '適格請求書発行事業者以外からの課税仕入について、令和5年10月〜令和8年9月は80%控除、令和8年10月〜令和11年9月は50%控除。以後は控除不可。',
        effectiveFrom: '令和5年10月1日〜（2026年6月時点は80%期間の終盤）',
        status: 'pending',
        verifyNote: '事例の前提期日が80%期間か50%期間かで結論が変わる。生成時に基準日を明示する。',
    },
    {
        id: 'invoice_2wari',
        fiscalYear: 2023,
        reform: 'インボイス制度 2割特例',
        subjectId: 'tax_consumption',
        unitIds: ['tax_consumption_05', 'tax_consumption_02'],
        title: '2割特例（小規模事業者の負担軽減措置）',
        summary:
            '免税事業者からインボイス登録した事業者は、納付税額を「売上に係る消費税額×20%」とできる特例。',
        effectiveFrom: '令和5年10月1日〜令和8年9月30日を含む課税期間（適用末期）',
        status: 'pending',
        verifyNote: '個人事業者は令和8年分まで。2026年は適用末期＝事例の課税期間の取り方に注意。',
    },
    {
        id: 'invoice_small',
        fiscalYear: 2023,
        reform: 'インボイス制度 少額特例',
        subjectId: 'tax_consumption',
        unitIds: ['tax_consumption_05', 'tax_consumption_04'],
        title: '少額特例（一定規模以下の事業者の事務負担軽減）',
        summary:
            '基準期間の課税売上高1億円以下等の事業者は、税込1万円未満の課税仕入についてインボイスの保存がなくても帳簿のみで仕入税額控除が可能。',
        effectiveFrom: '令和5年10月1日〜令和11年9月30日',
        status: 'pending',
    },

    // ---------------- 相続税・贈与税 ----------------
    {
        id: 'r5_souzoku_seisan_110',
        fiscalYear: 2023,
        reform: '令和5年度税制改正',
        subjectId: 'tax_inheritance',
        unitIds: ['tax_inheritance_07'],
        title: '相続時精算課税に年110万円の基礎控除を新設',
        summary:
            '相続時精算課税を選択した場合でも、毎年110万円までの贈与は基礎控除として課税されず、かつ相続時の加算対象にもならない。',
        effectiveFrom: '令和6年1月1日以後の贈与',
        status: 'pending',
        verifyNote: '暦年課税の110万円とは別枠。生前贈与加算（下記）との取扱いの違いを問題に織り込む。',
    },
    {
        id: 'r5_gift_addback_7y',
        fiscalYear: 2023,
        reform: '令和5年度税制改正',
        subjectId: 'tax_inheritance',
        unitIds: ['tax_inheritance_03'],
        title: '生前贈与加算の対象期間を3年→7年に延長',
        summary:
            '相続開始前の暦年贈与の加算対象期間を3年から7年に延長（延長4年分は総額100万円まで加算対象外）。',
        effectiveFrom: '令和6年1月1日以後の贈与から段階的に適用',
        status: 'pending',
        verifyNote: '2026年の相続では、いつの贈与まで何年分が加算対象かを経過措置に沿って確定する。',
    },
]

/** 科目IDで絞り込む小ヘルパー（将来のニュースページ用） */
export function lawChangesBySubject(subjectId: TaxLawChange['subjectId']): TaxLawChange[] {
    return TAX_LAW_CHANGES.filter((c) => c.subjectId === subjectId)
}

/** 要確認（verify）だけ抽出（ストック生成前のTODO一覧用） */
export function pendingVerifyChanges(): TaxLawChange[] {
    return TAX_LAW_CHANGES.filter((c) => c.status === 'verify')
}
