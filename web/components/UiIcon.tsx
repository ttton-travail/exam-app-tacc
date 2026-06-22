// ===========================
// UIアイコン表示
// components/UiIcon.tsx
//
// lib/assets.ts の UI_ICONS に登録した「機能アイコン」（線画）を表示する。
// BrandIcon（SNSロゴ・塗り）と違い、stroke ベースで currentColor 追従。
// 文字色に合わせて塗られるので、チップやラベルの中にそのまま置ける。
// 使い方: <UiIcon name="database" size={11} />
// ===========================

import { createElement } from 'react'
import { UI_ICONS } from '@/lib/assets'

interface Props {
    name: string            // UI_ICONS のキー（'database' など）
    size?: number
    strokeWidth?: number
    title?: string          // 付けるとアクセシブルな img として読み上げ対象に
}

export default function UiIcon({ name, size = 16, strokeWidth = 2, title }: Props) {
    const icon = UI_ICONS[name]
    if (!icon) return null
    return (
        <svg
            width={size}
            height={size}
            viewBox={icon.viewBox || '0 0 24 24'}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            role={title ? 'img' : 'presentation'}
            aria-label={title}
            aria-hidden={title ? undefined : true}
            style={{ flexShrink: 0 }}
        >
            {title && <title>{title}</title>}
            {icon.elements.map((el, i) => createElement(el.tag, { key: i, ...el.attrs }))}
        </svg>
    )
}
