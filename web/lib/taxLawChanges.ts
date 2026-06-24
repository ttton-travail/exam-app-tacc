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
            '基礎控除を48万円→58万円に引上げ（恒久）。さらに令和7・8年分限定の時限上乗せにより、合計所得金額132万円以下=95万円／132万超336万以下=88万円／336万超489万以下=68万円／489万超655万以下=63万円／655万超2,350万以下=58万円。令和9年分以後は2,350万以下が一律58万円に戻る。2,350万円超は従来どおり段階的に逓減（〜2,400万=48万／〜2,450万=32万／〜2,500万=16万／2,500万超=0）。',
        effectiveFrom: '令和7年12月1日施行・令和7年分以後（時限上乗せは令和7・8年分のみ）',
        status: 'reflected',
        source: 'https://www.nta.go.jp/users/gensen/2025kiso/index.htm',
    },
    {
        id: 'r7_salary_deduction',
        fiscalYear: 2025,
        reform: '令和7年度税制改正',
        subjectId: 'tax_income',
        unitIds: ['tax_income_02', 'tax_income_05', 'tax_income_06'],
        title: '給与所得控除の最低保障額の引上げ',
        summary:
            '給与所得控除の最低保障額を55万円→65万円に引上げ（給与収入190万円以下の範囲で影響）。給与所得者の課税最低限が上がる。',
        effectiveFrom: '令和7年12月1日施行・令和7年分以後',
        status: 'reflected',
        source: 'https://www.nta.go.jp/publication/pamph/gensen/0025005-051.pdf',
    },
    {
        id: 'r7_special_relative_deduction',
        fiscalYear: 2025,
        reform: '令和7年度税制改正',
        subjectId: 'tax_income',
        unitIds: ['tax_income_05', 'tax_income_06'],
        title: '特定親族特別控除の新設',
        summary:
            '生計を一にする19歳以上23歳未満の親族で、合計所得58万円超123万円以下（給与収入123万超188万以下）の「特定親族」がいる場合、その親族の所得に応じ最大63万円〜3万円を段階的に控除する新制度。控除額は所得58万超85万以下で満額63万円、以降逓減。合計所得58万円以下の場合は従来どおり特定扶養親族として扶養控除63万円（＝こちらは扶養控除側）。「150万円の壁→160万円」対応。',
        effectiveFrom: '令和7年12月1日施行・令和7年分以後（給与の源泉徴収反映は令和8年1月以後）',
        status: 'reflected',
        source: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1177.htm',
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
        title: '中小法人の軽減税率の延長・見直し',
        summary:
            '中小法人の年800万円以下の所得に対する軽減税率15%（本則19%）を2年延長し、令和9年3月31日までに開始する事業年度まで適用。ただし所得が年10億円を超える事業年度は当該軽減税率を17%に引上げ。グループ通算制度の適用を受けている法人は本特例の適用除外。',
        effectiveFrom: '令和7年4月1日以後に開始する事業年度',
        status: 'reflected',
        source: 'https://www.chusho.meti.go.jp/zaimu/zeisei/tokurei/houjin_keigen.html',
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
            '相続時精算課税を選択した受贈者は、暦年課税の基礎控除とは別枠で、毎年110万円までの贈与は基礎控除として贈与税が課されず、かつその基礎控除以下の部分は相続時の加算（持ち戻し）対象にもならない。基礎控除を超えた部分のみ相続財産に持ち戻して計算する。',
        effectiveFrom: '令和6年1月1日以後の贈与',
        status: 'reflected',
        source: 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/sozoku/4103.htm',
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
