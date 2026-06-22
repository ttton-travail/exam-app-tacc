// ===========================
// リワード動画 視聴カウント APIエンドポイント
// app/api/rewarded/route.ts
//
// スマホ版でリワード動画の視聴が完了したとき、端末からこのエンドポイントを叩く。
// その日の daily_usage（app行）の rewarded_views を+1する（service_role で実行）。
// 自己申告のため偽装可能だが、DB関数側で1日のハード上限に頭打ちされる
// （increment_rewarded_views 内の v_hard_max）。
//
// 用途：将来「無料枠＋視聴数ぶんだけ全体上限を引き上げる」ための集計と、利用統計。
// 今はカウントを貯めるだけ（全体上限の判定にはまだ使わない）。
// ===========================

import { NextRequest, NextResponse } from 'next/server'
import { incrementRewardedViews } from '@/lib/stock'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({} as { client?: string }))
        // リワードは現状スマホ版専用。将来増えても body.client で識別できるようにしておく。
        const app = body?.client === 'mobile' ? 'mobile' : 'mobile'
        const rewardedViews = await incrementRewardedViews(app)
        return NextResponse.json({ ok: true, rewardedViews })
    } catch (e) {
        console.error('[api/rewarded] エラー', e)
        // 失敗しても端末側の体験は止めない（+1付与はクライアントで別途完了済み）。
        return NextResponse.json({ ok: false }, { status: 200 })
    }
}
