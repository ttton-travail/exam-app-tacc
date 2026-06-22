// ===========================
// 画面幅ブレークポイント検知フック
// lib/useBreakpoint.ts
//
// 現在のウィンドウ幅から 'mobile' | 'tablet' | 'desktop' を返し、
// design.responsive[bp] で幅ごとの調整値（パディング・文字サイズ等）を取得する。
// 幅ごとの数値は design.ts に集約しているので、調整はあちらを編集すればよい。
// ===========================

'use client'

import { useState, useEffect } from 'react'
import { design } from '@/lib/design'   // lib/design/index.ts 経由（tokens を再エクスポート）

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

function getBreakpoint(width: number): Breakpoint {
    if (width >= design.breakpoint.desktop) return 'desktop'
    if (width >= design.breakpoint.tablet) return 'tablet'
    return 'mobile'
}

export function useBreakpoint(): Breakpoint {
    // SSRでは幅が不明。初期値は 'mobile' 固定にしてサーバー/初回クライアントを一致させ、
    // hydration mismatch を防ぐ。マウント後に実際の幅で更新する。
    const [bp, setBp] = useState<Breakpoint>('mobile')

    useEffect(() => {
        const update = () => setBp(getBreakpoint(window.innerWidth))
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    return bp
}

/** 現在の幅に対応する調整値セットを返すヘルパー */
export function useResponsive() {
    const bp = useBreakpoint()
    return { bp, r: design.responsive[bp] }
}