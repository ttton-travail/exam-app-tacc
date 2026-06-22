// ===========================
// 問題演習画面コンポーネント
// components/QuizScreen.tsx
// ===========================

import { styles, labels } from '@/lib/design'
import { displayKey } from '@/lib/shuffle'
import { useResponsive } from '@/lib/useBreakpoint'
import type { Question, AnswerMap, ChoiceId } from '@/types/quiz'

interface Props {
  questions: Question[]
  answers: AnswerMap
  currentIndex: number
  onAnswer: (questionId: number, choiceId: ChoiceId) => void
  onNext: () => void
  onPrev: () => void
  onFinish: () => void
  onJump: (index: number) => void        // 指定した問題番号へ移動
  onBackToSetting: () => void             // 回答を止めて問題作成画面へ戻る
}

export default function QuizScreen({
  questions,
  answers,
  currentIndex,
  onAnswer,
  onNext,
  onPrev,
  onFinish,
  onJump,
  onBackToSetting,
}: Props) {
  const q = questions[currentIndex]
  const { r } = useResponsive()
  const isFirst = currentIndex === 0
  const isLast = currentIndex === questions.length - 1
  const progressPct = ((currentIndex + 1) / questions.length) * 100

  return (
    <main style={styles.page}>
      <div style={{ ...styles.card, padding: r.cardPadding, marginTop: r.cardMarginY, marginBottom: r.cardMarginY }}>

        {/** プログレスバー */}
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
        </div>
        <p style={styles.progressText}>
          {currentIndex + 1} / {questions.length}問
        </p>

        {/** 単元バッジ */}
        <p style={styles.unitBadge}>{q.unit}</p>

        {/** 問題文 */}
        <p style={{ ...styles.questionText, fontSize: r.bodySize }}>{q.question}</p>

        {/** 選択肢（表示キーは位置から振る。データ上のIDで選択判定） */}
        <div style={{ ...styles.choiceList, gap: r.choiceGap }}>
          {q.choices.map((choice, i) => {
            const isSelected = answers[q.id] === choice.id
            return (
              <button
                key={choice.id}
                onClick={() => onAnswer(q.id, choice.id)}
                style={{
                  ...styles.choiceButton,
                  fontSize: r.bodySize,
                  ...(isSelected ? styles.choiceButtonSelected : {}),
                }}
              >
                <span style={styles.choiceKey}>{displayKey(i)}</span>
                <span>{choice.text}</span>
                {isSelected && (
                  <span style={styles.choiceCheck} aria-hidden="true">
                    {labels.result.selectedMark}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/** 問題インデックス（番号ジャンプ）。クリックでその問題へ。
             現在問=青／回答済み=淡い青／未回答=白 の3状態で進捗を可視化。 */}
        <div style={styles.indexRow}>
          {questions.map((item, i) => {
            const isCurrent = i === currentIndex
            const isAnswered = answers[item.id] !== undefined
            return (
              <button
                key={item.id}
                onClick={() => onJump(i)}
                aria-label={`${i + 1}問目へ移動`}
                aria-current={isCurrent ? 'true' : undefined}
                style={{
                  ...styles.indexButton,
                  ...(isAnswered ? styles.indexButtonAnswered : {}),
                  ...(isCurrent ? styles.indexButtonCurrent : {}),
                }}
              >
                {i + 1}
              </button>
            )
          })}
        </div>

        {/** ナビゲーション */}
        <div style={styles.navRow}>
          {!isFirst && (
            <button onClick={onPrev} style={styles.secondaryButton}>
              {labels.quiz.prev}
            </button>
          )}
          <div style={{ flex: 1 }} />
          {/* 未回答でも次へ／採点を押せる（インデックスのジャンプと挙動を揃える）。 */}
          {!isLast ? (
            <button
              onClick={onNext}
              style={{
                ...styles.primaryButton,
                width: 'auto',
                marginTop: 0,
              }}
            >
              {labels.quiz.next}
            </button>
          ) : (
            <button
              onClick={onFinish}
              style={{
                ...styles.primaryButton,
                width: 'auto',
                marginTop: 0,
              }}
            >
              {labels.quiz.finish}
            </button>
          )}
        </div>

        {/** 回答を止めて問題作成画面（設定画面）へ戻る。前へ/次への下、左端に控えめに。 */}
        <div style={styles.quizBackRow}>
          <button onClick={onBackToSetting} style={styles.quizBackLink}>
            ← {labels.result.backToSetting}
          </button>
        </div>

      </div>
    </main>
  )
}