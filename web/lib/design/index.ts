// ===========================
// デザイン定義の公開窓口
// lib/design/index.ts
//
// デザイン関連（トークン・共通スタイル・UI文言）をまとめて re-export する。
// 利用側は import { design, styles, labels } from '@/lib/design' の1行で済む。
// ※ useBreakpoint はロジック（フック）なので lib 直下に置いており、ここには含めない。
// ===========================

export { design } from './tokens'
export { styles } from './styles'
// typography / dividers（＋DIVIDER_LINE）は presets を正として export する。
// ※ 過去に dividers 未export でローカル起動エラーが出た事例があるため、必ず含める。
export { typography, dividers, DIVIDER_LINE } from './presets'
export { labels } from './labels'