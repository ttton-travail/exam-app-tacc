// ===========================
// シャッフル・表示ユーティリティ
// lib/shuffle.ts
//
// ・配列を Fisher-Yates でシャッフル（元配列は破壊しない）
// ・問題1問の選択肢順をシャッフル（answer はIDなので無傷）
// ・問題セット全体を「問題順 + 各問の選択肢順」両方シャッフル
// ・表示キー（A/B/C/D…）を位置から生成
// ===========================

import type { Question } from '@/types/quiz'

/** Fisher-Yates。新しい配列を返す（引数は変更しない） */
export function shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

/** 1問の選択肢順だけをシャッフル（answer は中身のIDなので書き換え不要） */
export function shuffleChoices(q: Question): Question {
    return { ...q, choices: shuffle(q.choices) }
}

/** 問題順・選択肢順の両方をシャッフルして新しい問題セットを返す */
export function shuffleQuiz(questions: readonly Question[]): Question[] {
    return shuffle(questions).map(shuffleChoices)
}

/** 表示キー（位置 → A/B/C/D…）。0→A, 1→B, ... */
export function displayKey(index: number): string {
    return String.fromCharCode(65 + index)
}
