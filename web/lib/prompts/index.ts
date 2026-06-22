// ===========================
// プロンプト切り替えハブ
// prompts/index.ts
//
// 問題形式が増えたらここに追加する
// ===========================

import { buildTaxPrompt } from './tax'

/** 対応している問題形式 */
export type ExamFormat = 'tax'
// 将来追加例:
// export type ExamFormat = 'tax' | 'calc' | 'desc'

/** 形式ラベル（UI表示用） */
export const EXAM_FORMAT_LABELS: Record<ExamFormat, string> = {
    tax: '税法4択問題',
    // calc: '計算問題',
    // desc: '記述式',
}

/** デフォルトの問題形式 */
export const DEFAULT_EXAM_FORMAT: ExamFormat = 'tax'

/**
 * 形式に応じたプロンプトを返す
 * 形式が増えたらcaseを追加するだけでOK
 */
export function buildPrompt(
    format: ExamFormat,
    subjectLabel: string,
    units: { id: string; label: string }[],
    questionCount: number,
): string {
    switch (format) {
        case 'tax':
        return buildTaxPrompt(subjectLabel, units, questionCount)
        default:
        return buildTaxPrompt(subjectLabel, units, questionCount)
    }
}
