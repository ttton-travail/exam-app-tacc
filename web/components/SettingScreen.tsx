// ===========================
// 設定画面コンポーネント
// components/SettingScreen.tsx
// ===========================

'use client'

import { useState, useEffect } from 'react'
import { design, styles, labels } from '@/lib/design'
import { useResponsive } from '@/lib/useBreakpoint'
import { SUBJECTS, SUBJECT_GROUPS } from '@/lib/subjects'
import { QUESTION_COUNT_OPTIONS } from '@/lib/config'
import UiIcon from '@/components/UiIcon'
import type { QuizSettings } from '@/types/quiz'

interface Props {
  settings: QuizSettings
  loading: boolean
  error: string
  remaining: number
  reachedLimit: boolean
  onSettingsChange: (settings: QuizSettings) => void
  onGenerate: (mode: 'stock' | 'generate') => void
  onClearError: () => void
}

export default function SettingScreen({
  settings,
  loading,
  error,
  remaining,
  reachedLimit,
  onSettingsChange,
  onGenerate,
  onClearError,
}: Props) {
  const { r } = useResponsive()
  const currentSubject = SUBJECTS.find((s) => s.id === settings.subjectId)

  // 選択中の科目の単元別ストック概数（「約○○問生成済み」表示用）
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    fetch(`/api/stock-counts?subjectId=${encodeURIComponent(settings.subjectId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setStockCounts(data.counts ?? {})
      })
      .catch(() => {
        if (!cancelled) setStockCounts({})
      })
    return () => {
      cancelled = true
    }
  }, [settings.subjectId])

  /** 科目変更（単元選択はリセット） */
  const handleSubjectChange = (subjectId: string) => {
    onSettingsChange({ ...settings, subjectId, unitIds: [] })
  }

  /** 単元のON/OFF切り替え */
  const handleUnitToggle = (unitId: string) => {
    const unitIds = settings.unitIds.includes(unitId)
      ? settings.unitIds.filter((id) => id !== unitId)
      : [...settings.unitIds, unitId]
    onSettingsChange({ ...settings, unitIds })
  }

  /** 問題数変更 */
  const handleCountChange = (questionCount: number) => {
    onSettingsChange({ ...settings, questionCount })
  }

  return (
    <main style={styles.page}>
      <div style={{ ...styles.card, padding: r.cardPadding, marginTop: r.cardMarginY, marginBottom: r.cardMarginY }}>

        {/** エラーカード（設定の上に表示。「もう一度試す」でカードを閉じる） */}
        {error && (
          <div style={styles.errorCard}>
            <p style={styles.errorCardTitle}>{labels.error.title}</p>
            <p style={styles.errorCardBody}>{error}</p>
            <button onClick={onClearError} style={styles.errorRetryButton}>
              {labels.error.retry}
            </button>
          </div>
        )}

        {/** 説明文：設定パートの導入文として左寄せ（ヘッダーは共通 Header に昇格済み）。 */}
        <p style={{ ...styles.subtitle, fontSize: r.bodySize, textAlign: 'left', margin: `0 0 ${design.spacing.md}` }}>{labels.setting.intro}</p>

        {/** 科目選択（数学系・理科系・情報のグループごとに改行表示） */}
        <section style={styles.section}>
          <label style={styles.label}>{labels.setting.subjectLabel}</label>
          {SUBJECT_GROUPS.map((g) => {
            const items = SUBJECTS.filter((s) => s.group === g.key && s.enabled !== false)
            if (items.length === 0) return null
            return (
              <div key={g.key} style={{ ...styles.chipRow, marginBottom: design.spacing.sm }}>
                {items.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSubjectChange(s.id)}
                    style={{
                      ...styles.chipButton,
                      ...(settings.subjectId === s.id ? styles.chipButtonActive : {}),
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )
          })}
          <p style={{ ...styles.subTextMuted, margin: `${design.spacing.xs} 0 0` }}>
            {labels.setting.subjectComingSoon}
          </p>
        </section>

        {/** 単元選択 */}
        <section style={styles.section}>
          <label style={styles.label}>
            {labels.setting.unitLabel}
            <span style={styles.labelNote}>{labels.setting.unitNote}</span>
          </label>
          <div style={styles.chipRow}>
            {currentSubject?.units.map((u) => {
              const approx = stockCounts[u.id]
              return (
                <button
                  key={u.id}
                  onClick={() => handleUnitToggle(u.id)}
                  style={{
                    ...styles.chipButton,
                    ...(settings.unitIds.includes(u.id) ? styles.chipButtonActive : {}),
                  }}
                >
                  <span>{u.label}</span>
                  {approx !== undefined && approx > 0 && (
                    <span style={styles.chipStock}>
                      {/* ストック（在庫）アイコン＝円筒形データベース（UI_ICONSで一元管理） */}
                      <UiIcon name="database" size={11} />
                      {labels.setting.stockBadge.replace('{n}', String(approx))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/** 問題数選択 */}
        <section style={styles.section}>
          <label style={styles.label}>{labels.setting.countLabel}</label>
          <div style={styles.chipRow}>
            {QUESTION_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => handleCountChange(n)}
                style={{
                  ...styles.chipButton,
                  ...(settings.questionCount === n ? styles.chipButtonActive : {}),
                }}
              >
                {labels.setting.countUnit.replace('{n}', String(n))}
              </button>
            ))}
          </div>
        </section>

        {/** 2つのボタン（縦並び）：ストックから作成 / AI新規生成 */}
        <button
          onClick={() => onGenerate('stock')}
          disabled={loading}
          style={{
            ...styles.primaryButton,
            ...(loading ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? (
            <>
              <span className="spinner" /> {labels.setting.generating}
            </>
          ) : (
            labels.setting.fromStock
          )}
        </button>

        <button
          onClick={() => onGenerate('generate')}
          disabled={loading || reachedLimit}
          style={{
            ...styles.aiButton,
            marginTop: design.spacing.sm,
            ...(loading || reachedLimit ? styles.buttonDisabled : {}),
          }}
        >
          {labels.setting.fromAi}
          {labels.setting.fromAiNote.replace('{n}', String(remaining))}
        </button>

        {/* AI生成ボタン下の注意書き（subjectComingSoon と同じ控えめスタイル・中央揃え） */}
        <p
          style={{
            ...styles.subTextMuted,
            margin: `${design.spacing.sm} 0 0`,
            textAlign: 'center',
          }}
        >
          {labels.setting.aiCaution.map((line, i) => (
            <span key={i} style={{ display: 'inline-block' }}>
              {line}
            </span>
          ))}
        </p>
      </div>
    </main>
  )
}