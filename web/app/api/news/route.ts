// ============================================================
// お知らせAPI
// app/api/news/route.ts
//
// LP（page.tsx・クライアント）が読み込み時に呼ぶ。
// 中身は news テーブルを読むだけ（getNews）。
// レスポンス: { items: NewsItem[] }
// ============================================================

import { NextResponse } from 'next/server'
import { getNews } from '@/lib/news'

export async function GET() {
    try {
        const items = await getNews()
        return NextResponse.json({ items })
    } catch (e) {
        console.error('[news] 取得エラー', e)
        // 失敗してもUIを壊さないよう空で返す
        return NextResponse.json({ items: [] })
    }
}