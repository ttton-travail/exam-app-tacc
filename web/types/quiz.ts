// ===========================
// 型定義
// quiz.ts
// ===========================

import type { ExamFormat } from '@/lib/prompts'

/**
 * 選択肢の不変ID。
 * 表示キー（A/B/C/D）とは無関係の、中身を識別するためだけの値。
 * 並び替えても各選択肢に付いて回るので、シャッフルしても正解判定がズレない。
 */
export type ChoiceId = number

/** 1つの選択肢（表示キー文字は持たない。キーは描画時に位置から振る） */
export interface Choice {
    id: ChoiceId
    text: string
}

/** 1問の問題（4択。term / judgment / calc4 はこの形式を共用） */
export interface Question {
    id: number
    unit: string        // 表示用の単元ラベル（例：遺伝子とその働き）
    unitId?: string     // 単元ID（例：bio_base_02）。ストック保存・検索の正はこちら。
                        // 生成直後に route.ts で付与する。ストック由来なら DB の unit_id が入る。
    question: string
    choices: Choice[]   // 配列の並び順 = 画面の表示順
    answer: ChoiceId    // 正解の「中身のID」。位置ではない
    explanation: string
    keywords: string[]  // 復習の手がかり。回答時に「キーワード：〜」で表示
    // ↓ 税理士版の階層拡張用（任意）。4択は既存 questions テーブル＋追加列で保持する。
    level?: QuestionLevel       // Lv1-4
    format?: QuestionFormat     // 'term' | 'judgment' | 'calc4'（4択のときは tree 以外）
    /**
     * 誤答=どのノードの誤りかのタグ。弱点分野の可視化（「益金不算入の判定が弱い」等）に使う。
     * 選択肢の「中身ID」→ 踏んだ誤りノードID。正解の選択肢は null。
     * ChoiceId キーなのでシャッフルしてもタグがズレない。
     */
    errorNodeTags?: Record<ChoiceId, string | null>
}

/** 問題セット（APIレスポンス＝内部形式） */
export interface QuizData {
    questions: Question[]
}

// ===========================
// 分岐ツリー問題（format='tree'・計算・Lv3-4／本アプリの軸）
// 4択（Question）には収まらないため専用の型＋専用テーブル（tacc_tree_problems）で保持する。
// 業務処理順に1ノードずつN択回答し、回答後に正解経路と実経路を重ねた結果ツリーマップを表示する。
// ===========================

/** ツリーの1ノードの選択肢。leadsTo＝この枝を選んだとき次に進むノードID or リーフID */
export interface TreeNodeChoice {
    text: string
    leadsTo?: string    // 次ノードID／終端は 'leaf:<id>'
    /**
     * 計算ツリー（calc）で、この枝を選んだときに走行値へ適用する係数・金額（任意）。
     * 例：簡易課税のみなし仕入率 0.8、税率 0.1 など。runningValue.derive の formula が参照する。
     * 質的判定ツリーでは未使用（undefined）。
     */
    runOperand?: number
}

/** ツリーの1ノード（N択。N＝分岐点マスタの branches 数） */
export interface TreeNode {
    nodeId: string          // 分岐点マスタの node_id と対応（誤答タグ・解説と突合）
    question: string        // このノードで判断すべき問い
    choices: TreeNodeChoice[]
    correctIndex: number    // choices のうち正解の枝のインデックス
}

/** 走行値の定義（計算ツリー用）。base から derive を順に適用して納付税額等を導く。 */
export interface RunningValue {
    base: { label: string; value: number }
    derive: { label: string; formula: string }[]  // 例 [{label:'控除税額',formula:'売上税額 × みなし仕入率'}]
}

/** 終端リーフ（結果ツリーマップの色分け） */
export interface TreeLeaf {
    result: string
    resultKind: 'ok' | 'ng' | 'partial' | 'alt'
    reason?: string
}

/** 1事例＝1ツリー問題 */
export interface TreeProblem {
    id: number
    unit: string            // 表示用の単元ラベル
    unitId?: string
    level: QuestionLevel
    scenario: string        // 事例文（前提条件）
    nodes: TreeNode[]       // 業務処理順
    correctPath: string[]   // 正解で辿るノードID列（結果ツリーマップの緑経路）
    explanation: Record<string, string>  // nodeId → 分岐点単位の解説
    keywords: string[]
    // ↓ 計算ツリー（calc）の任意フィールド。質的判定ツリーでは undefined。
    runningValue?: RunningValue           // 走行値の起点と導出式
    leaves?: Record<string, TreeLeaf>     // leafId → 終端結果（結果ツリーマップ用）
    answer?: Record<string, number>       // 正解到達時の確定値（例 { payable: 600000 }）
}

/** ユーザーの回答記録（questionId → 選んだ選択肢のID） */
export type AnswerMap = Record<number, ChoiceId>

/** アプリの画面フェーズ */
export type AppPhase = 'setting' | 'quiz' | 'result'

/** 税目のグループ（設定画面でこの単位で改行表示する）。
 *  初期実装は国税4税目のみなので 'tax' の1グループ。
 *  将来、地方税・手続法などを別グループにする場合はここに追加する。 */
export type SubjectGroup = 'tax'

/** 税目（科目） */
export interface Subject {
    id: string
    label: string
    group: SubjectGroup
    /**
     * 設定画面に表示するか。省略時は true。
     * 準備中の税目を一旦隠したいときは false にする（定義・単元情報は保持）。
     */
    enabled?: boolean
    units: Unit[]
}

/** 単元 */
export interface Unit {
    id: string
    label: string
    /** 実務頻度タグ。問題ストック生成の優先順位の基準（「高」から埋める）。暫定。 */
    frequency?: '高' | '中' | '低'
}

/**
 * 出題レベル（実務での判断複雑度。試験基準ではない）。
 * Lv1=単純な状況で1判断／Lv2=似たケースとの区別／Lv3=複数判断の連鎖／Lv4=複数単元の総合（将来拡張）。
 * Lv1-2=士補相当、Lv3=士相当を初期目標。
 */
export type QuestionLevel = 1 | 2 | 3 | 4

/**
 * 内容タイプ（設定画面でユーザーが選ぶ「独立軸」）。
 * 描画形式（4択 / ツリー）は、この内容タイプとレベルから自動で決まる（resolveFormat）。
 * - 'knowledge' : 用語・知識
 * - 'judgment'  : 実例判断
 * - 'calc'      : 計算（Lv1-2は4択＝過程まるごと、Lv3-4はツリー）
 */
export type ContentType = 'knowledge' | 'judgment' | 'calc'

/**
 * 出題形式＝**内部ストックキー**（DB の q_format）。ユーザーは直接選ばない（内容タイプ×レベルから導出）。
 * - 'term'     : 4択・用語/知識
 * - 'judgment' : 4択・実例判断
 * - 'calc4'    : 4択・計算（Lv1-2。精算過程まるごとを四択に＝誤答は1ノードのみ誤り）
 * - 'tree'     : 分岐ツリー・計算（Lv3-4。業務処理順に1ノードずつN択回答＋結果ツリーマップ。本アプリの軸）
 */
export type QuestionFormat = 'term' | 'judgment' | 'calc4' | 'tree'

/** 設定画面で選んだ値 */
export interface QuizSettings {
    subjectId: string
    unitIds: string[]   // 空配列 = すべての単元
    questionCount: number
    examFormat: ExamFormat
    // ↓ 階層拡張（科目→単元→内容タイプ→レベル）。当面は任意（未指定=おまかせ）。
    //   設定UIの配線は次タスク。型・定数の土台のみ先行。
    contentType?: ContentType   // 設定画面で選ぶ独立軸（用語知識/実例判断/計算）
    level?: QuestionLevel
    format?: QuestionFormat      // 内部キー。通常は resolveFormat(contentType, level) で導出
}