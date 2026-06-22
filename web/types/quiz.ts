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

/** 1問の問題 */
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
}

/** 問題セット（APIレスポンス＝内部形式） */
export interface QuizData {
    questions: Question[]
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
}

/** 設定画面で選んだ値 */
export interface QuizSettings {
    subjectId: string
    unitIds: string[]   // 空配列 = すべての単元
    questionCount: number
    examFormat: ExamFormat
}