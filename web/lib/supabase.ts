// ===========================
// Supabase 接続クライアント
// lib/supabase.ts
//
// 読み取り用（anonキー）と、書き込み・カウンタ用（service_roleキー）を分ける。
// service_role キーは絶対にクライアントへ出さない。サーバー（APIルート）専用。
// 環境変数は .env.local と Vercel の両方に登録する。
//
// 重要：環境変数が無くてもビルドが落ちないよう「遅延初期化」にしている。
// 実際に使う瞬間に初めてクライアントを生成する。未設定なら null を返し、
// 呼び出し側がフォールバックする（＝サイト全体は落ちない）。
// ===========================

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let _readClient: SupabaseClient | null = null
let _serviceClient: SupabaseClient | null = null

/**
 * 読み取り用（公開）クライアントを取得。
 * 環境変数が未設定なら null（呼び出し側で空配列等にフォールバック）。
 */
export function getReadClient(): SupabaseClient | null {
    if (_readClient) return _readClient
    if (!url || !anonKey) {
        console.warn('[supabase] URL または anon キーが未設定です')
        return null
    }
    _readClient = createClient(url, anonKey)
    return _readClient
}

/**
 * 書き込み・カウンタ用（特権）クライアントを取得。サーバー専用。
 * service_role キーが無ければ null。
 */
export function getServiceClient(): SupabaseClient | null {
    if (_serviceClient) return _serviceClient
    if (!url || !serviceKey) return null
    _serviceClient = createClient(url, serviceKey, {
        auth: { persistSession: false },
    })
    return _serviceClient
}