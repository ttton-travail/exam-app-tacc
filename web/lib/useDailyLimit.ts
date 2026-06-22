// ===========================
// 端末ごとの1日回数制限フック
// lib/useDailyLimit.ts
//
// localStorage に「日付」と「その日の生成回数」を保存し、
// 1日あたり DAILY_GEN_LIMIT_PER_DEVICE 回までに制限する。
// 日付が変わったら自動リセット。あくまで緩い制限（端末を変える・クリアで回避は可能）。
// 厳密な歯止めはサーバー側の全体上限が担う。
// ===========================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { DAILY_GEN_LIMIT_PER_DEVICE } from '@/lib/config'

const STORAGE_KEY = 'gen_usage_v1'

/** 日本時間の YYYY-MM-DD */
function todayKey(): string {
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000) // JSTに寄せる
    return d.toISOString().slice(0, 10)
}

interface Usage {
    day: string
    count: number
}

function readUsage(): Usage {
    if (typeof window === 'undefined') return { day: todayKey(), count: 0 }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const u = JSON.parse(raw) as Usage
            if (u.day === todayKey()) return u
        }
    } catch {
        // 壊れていたら初期化
    }
    return { day: todayKey(), count: 0 }
}

export function useDailyLimit() {
    const [count, setCount] = useState(0)

    useEffect(() => {
        setCount(readUsage().count)
    }, [])

    const remaining = Math.max(0, DAILY_GEN_LIMIT_PER_DEVICE - count)
    const reachedLimit = remaining <= 0

    /** 1回消費して保存。残り回数を返す */
    const consume = useCallback(() => {
        const u = readUsage()
        const next: Usage = { day: u.day, count: u.count + 1 }
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
            // 保存できなくても致命的ではない
        }
        setCount(next.count)
        return Math.max(0, DAILY_GEN_LIMIT_PER_DEVICE - next.count)
    }, [])

    return { count, remaining, reachedLimit, consume, limit: DAILY_GEN_LIMIT_PER_DEVICE }
}