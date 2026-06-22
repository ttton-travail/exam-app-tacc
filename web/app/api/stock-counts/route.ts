// ============================================================
// 単元別ストック概数API
// app/api/stock-counts/route.ts
//
// SettingScreen が科目選択時に呼ぶ。指定科目の単元別ストック数（概数）を返す。
// 中身は unit_stats テーブルを読むだけ（getUnitStockCounts）。
// レスポンス: { counts: { [unitId]: number } }
// ============================================================

import { NextResponse } from 'next/server'
import { getUnitStockCounts } from '@/lib/stock'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subjectId')

    if (!subjectId) {
        return NextResponse.json({ counts: {} })
    }

    try {
        const counts = await getUnitStockCounts(subjectId)
        return NextResponse.json({ counts })
    } catch (e) {
        console.error('[stock-counts] 取得エラー', e)
        // 失敗してもUIを壊さないよう空で返す
        return NextResponse.json({ counts: {} })
    }
}