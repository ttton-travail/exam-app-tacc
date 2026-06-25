// ===========================
// Gemini API呼び出し
// lib/gemini.ts
//
// Geminiのワイヤー形式 { choices:{A,B,C,D}, answer:"A" } を
// アプリ内部形式（choices: Choice[] / answer: ChoiceId）へ
// この境界で1回だけ正規化する。プロンプト側は従来どおりでよい。
// ===========================

import {
    GEMINI_MODEL,
    GEMINI_MAX_TOKENS,
    GEMINI_TEMPERATURE,
    GEMINI_THINKING_BUDGET,
    GEMINI_REPAIR_MODEL,
    GEMINI_REPAIR_TEMPERATURE,
    MAX_CHOICE_REPAIR_ROUNDS,
} from '@/lib/config'
import { buildChoiceRepairPrompt } from '@/lib/prompts/tax'
import type { QuizData, Question, ChoiceId } from '@/types/quiz'

const log = (stage: string, data?: unknown) => console.log(`[gemini] ${stage}`, data ?? '')

/** Geminiが返す1問の生形式 */
interface RawQuestion {
    id: number
    unitId?: string                    // AIが返す単元ID（プロンプトの対応表のidのいずれか）
    unit?: string                      // 旧形式互換（来れば表示ラベルの予備にする）
    question: string
    choices: Record<string, string>   // { A: "...", B: "...", ... }
    answer: string                     // "A" など
    explanation: string
    keywords?: string[]                // 復習用キーワード（無い場合に備え任意）
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'] as const

/**
 * よくあるJSON破損を修復する。
 * 主対象は「値のクォート欠落」（Liteが数式・数値・座標で出しやすい）。
 *   "A": (1, 1)",  → "A": "(1, 1)",
 *   "A": 3",        → "A": "3",
 *   "D": (-2, 19)", → "D": "(-2, 19)"   ← カンマ内包の座標もOK
 * 各行を見て、choices/answer のキー直後の値がクォートで始まっていなければ補う。
 * 既に正しくクォートされている行は一切変更しない。
 */

/**
 * 制御文字・改行を正規化する。
 * JSON文字列の内側にある改行(\n,\r,\t)はスペースに、
 * 構造上の改行や他の制御文字は除去する。
 * モデルが値の途中で改行してしまうケース（"question":\n"..."）を救う。
 */
function normalizeControlChars(s: string): string {
    let out = ''
    let inStr = false
    let esc = false
    for (let i = 0; i < s.length; i++) {
        const c = s[i]
        if (esc) {
            out += c
            esc = false
            continue
        }
        if (c === '\\') {
            out += c
            esc = true
            continue
        }
        if (c === '"') {
            inStr = !inStr
            out += c
            continue
        }
        const code = c.charCodeAt(0)
        // 制御文字（改行・タブ含む）
        if (code <= 0x1f || code === 0x7f) {
            if (inStr) {
                // 文字列内の改行・タブは半角スペースに（他の制御文字は捨てる）
                if (c === '\n' || c === '\r' || c === '\t') out += ' '
            } else {
                // 文字列外の改行は構造として残す（後段のrepairJsonが行単位で働くため）。
                // \r は \n に寄せ、タブ・その他制御文字は捨てる。
                if (c === '\n' || c === '\r') out += '\n'
            }
            continue
        }
        out += c
    }
    return out
}

function repairJson(text: string): string {
    const keyRe = /^(\s*"(?:A|B|C|D|answer)"\s*:\s*)(.*)$/
    const kwRe = /^(\s*"keywords"\s*:\s*)(\[.*\])(\s*,?)\s*$/
    return text
        .split('\n')
        .map((line) => {
            // keywords 配列の中身を修復（各要素のクォート欠落を補う）
            const kw = line.match(kwRe)
            if (kw) {
                return `${kw[1]}${repairStringArray(kw[2])}${kw[3]}`
            }

            const m = line.match(keyRe)
            if (!m) return line
            const keyPart = m[1]
            let value = m[2]
            // 値が既に正しくクォートで開始していれば触らない
            if (value.startsWith('"')) return line
            // 行末のカンマを退避
            let comma = ''
            const trimmedEnd = value.replace(/\s+$/, '')
            if (trimmedEnd.endsWith(',')) {
                comma = ','
                value = trimmedEnd.slice(0, -1)
            } else {
                value = trimmedEnd
            }
            // 値の末尾に付いている余分なクォートを除去してから囲み直す
            value = value.replace(/^\s+/, '').replace(/"+\s*$/, '').trim()
            return `${keyPart}"${value}"${comma}`
        })
        .join('\n')
}

/**
 * 文字列配列リテラル "[a, "b", c]" の各要素のクォート欠落を補う。
 *   [平方完成, "頂点", 最大値]  → ["平方完成", "頂点", "最大値"]
 * 既に正しくクォートされている要素はそのまま残す。
 */
function repairStringArray(arrLiteral: string): string {
    const inner = arrLiteral.trim().replace(/^\[/, '').replace(/\]$/, '')
    if (inner.trim() === '') return '[]'
    const items = inner.split(',').map((raw) => {
        const t = raw.trim().replace(/^"+/, '').replace(/"+$/, '').trim()
        return `"${t}"`
    })
    return `[${items.join(', ')}]`
}

/**
 * keywords 行を丸ごと除去する（最終フォールバック用）。
 * keywords は付加情報なので、壊れていたら捨てて問題本体だけ救出する。
 * 直前行の末尾カンマも調整して、JSONとして閉じられる形を保つ。
 */
function stripKeywordsLines(text: string): string {
    const lines = text.split('\n')
    const kept: string[] = []
    for (const line of lines) {
        // "keywords": ... の行（複数行に渡らない前提。1行JSONでも下のregexで対応）
        if (/^\s*"keywords"\s*:/.test(line)) {
            // この行を捨てる。直前の行が末尾カンマなら、そのカンマを除く
            if (kept.length > 0) {
                kept[kept.length - 1] = kept[kept.length - 1].replace(/,(\s*)$/, '$1')
            }
            continue
        }
        kept.push(line)
    }
    // 1行JSONのケース：行単位で消えないので、"keywords":[...] を正規表現で除去
    return kept
        .join('\n')
        .replace(/,\s*"keywords"\s*:\s*\[[^\]]*\]/g, '')
        .replace(/"keywords"\s*:\s*\[[^\]]*\]\s*,/g, '')
}

/** 生形式の1問を内部形式（配列＋ID）に正規化 */
// ============================================================
// 表示テキストの正規化
// ストック生成（scripts/convert_stock.mjs の cleanText）と同じ表記ゆれ補正を
// アプリのライブ生成にも適用し、ストック由来とAI生成で見た目を揃える。
// 表記ルールを変えるときは両方を合わせて更新すること。
// ============================================================
const SUP_MAP: Record<string, string> = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' }
const SUB_MAP: Record<string, string> = { '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉' }

function normalizeDisplayText(s: string): string {
    if (typeof s !== 'string') return s
    let t = s

    // Markdownのコード記法を除去する（モデルが変数名等をバッククォートで囲んで出すことがある）。
    //   ```code``` / `heights` → 中身だけ残す。表示にバッククォートを出さない。
    t = t.replace(/```+/g, '')   // コードフェンス（連続バッククォート）を除去
    t = t.replace(/`/g, '')      // 残ったインラインのバッククォートを除去

    // 記号の直前の不要な「/」を除去（/+ /= /- /× のみ。除算 m/s・1/2 は壊さない）
    t = t.replace(/\/(\s*)([+\-=×＋－ー＝])/g, '$1$2')

    // 全角の数式記号を半角へ（＋＝－ は無条件、ー−は数式文脈のみ）
    t = t.replace(/＋/g, '+').replace(/＝/g, '=').replace(/－/g, '-')
    t = t.replace(/([0-9A-Za-z)\]）＝=+\-×\s])[ー−]([0-9A-Za-z(（\s])/g, '$1-$2')

    // 助数詞・比較語まわりのスペース詰め（80 回 → 80回、80回以上90 回以下 → 80回以上90回以下）
    const COUNTER = '回|倍|個|度|人|本|枚|台|匹|冊|問|つ'
    t = t.replace(new RegExp('([0-9０-９])\\s+(' + COUNTER + ')(?![A-Za-z])', 'g'), '$1$2')
    t = t.replace(/([0-9０-９A-Za-z%％)）\]])\s+(以上|以下|未満|超)/g, '$1$2')
    t = t.replace(/(以上|以下|未満|超)\s+([0-9０-９])/g, '$1$2')

    // log2 / log_2 → log₂
    t = t.replace(/log[_]?([0-9])/g, (_, d) => 'log' + (SUB_MAP[d] || d))
    // x^2 → x²
    t = t.replace(/\^([0-9]+)/g, (_, ds: string) =>
        ds.split('').map((d) => SUP_MAP[d] || d).join(''))
    // _2 → ₂（log以外の下付き）
    t = t.replace(/_([0-9]+)/g, (_, ds: string) =>
        ds.split('').map((d) => SUB_MAP[d] || d).join(''))

    return t
}

// 選択肢本文の先頭に付いた「番号・記号プレフィックス」を1個だけ剥がす。
//   例: 「（１）箱」→「箱」 / 「①箱」→「箱」 / 「1. 箱」→「箱」 / 「ア．箱」→「箱」
// choices にのみ適用する（question/explanation には適用しない＝本文中の数字を壊さない）。
// 先頭の1個だけを対象にし、続く区切り（. 、 ） : や空白）と前後の空白も詰める。
// 保存側（stock.ts）からも再利用するため export する。
export function stripChoicePrefix(s: string): string {
    if (typeof s !== 'string') return s
    let t = s.replace(/^\s+/, '')

    // 剥がす対象の先頭プレフィックス（いずれか1つ）:
    //  - 全角丸数字 ①〜⑳
    //  - （１）(1) など括弧つき数字（全角/半角の括弧・算用/漢数字）
    //  - カタカナ/英字の選択肢記号 ア イ ウ … / A B C …（後ろに区切りが続くもの）
    //  - 1 / １ など素の数字（後ろに . 、 ） : の区切りが続くもの）
    const patterns: RegExp[] = [
        /^[\u2460-\u2473]\s*/,                                  // ①②③…⑳
        /^[(（]\s*[0-9０-９一二三四五六七八九十]+\s*[)）]\s*/,    // （１）(1)（一）
        /^[アイウエオカキクケコ]\s*[.．、,）)：:]\s*/,            // ア． イ、 ウ) …
        /^[A-Za-zＡ-Ｚａ-ｚ]\s*[.．、,）)：:]\s*/,                 // A. B) …
        /^[0-9０-９]+\s*[.．、,）)：:]\s*/,                        // 1. ２） …
    ]
    for (const re of patterns) {
        if (re.test(t)) {
            t = t.replace(re, '')
            break // 先頭の1個だけ剥がす
        }
    }
    return t.replace(/^\s+/, '')
}

// question 末尾などに紛れ込んだ「選択肢の列挙」を取り除く。
// 安全条件（両方を満たす行だけ削除する）:
//   (1) その行が choices のいずれかの本文と実質一致する
//       （行頭の番号プレフィックスを剥がして比較。空白の差は無視）
//   (2) その行の冒頭が保護語（手順・ステップ等）で始まっていない
//       （正規の番号付き箇条書きを誤って消さないため）
// どの行も条件を満たさなければ question はそのまま返す。
// 保存側（stock.ts）からも再利用するため export する。
export function stripEnumeratedChoicesFromQuestion(question: string, choiceTexts: string[]): string {
    if (typeof question !== 'string') return question
    if (!Array.isArray(choiceTexts) || choiceTexts.length === 0) return question

    // 比較用に正規化（番号プレフィックス除去＋空白除去）
    const norm = (x: string) => stripChoicePrefix(x).replace(/\s+/g, '')
    const choiceSet = new Set(choiceTexts.map(norm).filter((x) => x !== ''))

    // 行の冒頭がこれらで始まる場合は、選択肢一致でも消さない（誤爆防止）
    const PROTECT = /^[(（]?\s*(手順|ステップ|操作|工程|段階|例|図|表|式|条件|状態)/

    const lines = question.split('\n')
    const kept = lines.filter((line) => {
        const trimmed = line.trim()
        if (trimmed === '') return true // 空行は残す（後でまとめて整える）
        if (PROTECT.test(trimmed)) return true // 保護語始まりは残す
        // 選択肢本文と一致する行だけ削除対象にする
        return !choiceSet.has(norm(trimmed))
    })

    // 連続する空行を1つに圧縮し、前後の余分な空白を整える
    return kept
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/, '')
        .replace(/^\s+/, '')
}

function normalizeQuestion(raw: RawQuestion): Question {
    // Geminiの返したキー順をそのまま採用（A,B,C,D が基本だが将来の増減にも耐える）
    const letters = Object.keys(raw.choices).length
        ? Object.keys(raw.choices)
        : [...CHOICE_LETTERS]

    const choices = letters.map((letter, i) => ({
        id: i as ChoiceId,
        // 表示用正規化に加え、選択肢本文の先頭に紛れた番号プレフィックス（（１）①ア 1. 等）を剥がす
        text: stripChoicePrefix(normalizeDisplayText(raw.choices[letter])),
    }))

    // 正解レターが何番目だったか = そのID
    const answerIndex = letters.indexOf(raw.answer)
    const answer: ChoiceId = (answerIndex >= 0 ? answerIndex : 0) as ChoiceId

    // question に選択肢が再掲されている場合、確定済み choices と一致する行だけ安全に取り除く
    const cleanedQuestion = stripEnumeratedChoicesFromQuestion(
        normalizeDisplayText(raw.question),
        choices.map((c) => c.text),
    )

    return {
        id: raw.id,
        // 表示ラベルは route.ts が unitId から確定させる。ここでは旧形式の unit が来ていれば
        // 予備として入れておく（無ければ空文字）。
        unit: typeof raw.unit === 'string' ? raw.unit : '',
        unitId: typeof raw.unitId === 'string' ? raw.unitId : undefined,
        question: cleanedQuestion,
        choices,
        answer,
        explanation: normalizeDisplayText(raw.explanation),
        keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    }
}

/** Gemini に1回プロンプトを送り、生のテキスト（JSON文字列）を返す。 */
async function callGeminiRaw(
    prompt: string,
    apiKey: string,
    opts?: { model?: string; temperature?: number },
): Promise<string> {
    const model = opts?.model ?? GEMINI_MODEL
    const temperature = opts?.temperature ?? GEMINI_TEMPERATURE
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    log('APIリクエスト送信', { model, temperature })

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature,
                maxOutputTokens: GEMINI_MAX_TOKENS,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingBudget: GEMINI_THINKING_BUDGET },
            },
        }),
    })

    log('APIレスポンス受信', { status: response.status })

    if (!response.ok) {
        const errText = await response.text()
        log('APIエラー', errText)
        throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]
    const finishReason: string = candidate?.finishReason ?? 'UNKNOWN'
    const rawText: string = candidate?.content?.parts?.[0]?.text ?? ''

    log('生テキスト先頭', rawText.slice(0, 120))
    log('finishReason', finishReason)
    // 実コスト把握用：input/output/thinking のトークン数を毎回ログに出す
    log('usage', data.usageMetadata)

    // 出力がトークン上限で途中打ち切りされたケースを明示的に検知
    if (finishReason === 'MAX_TOKENS') {
        log('トークン上限で打ち切り', { usage: data.usageMetadata })
        throw new Error(
            '生成が長すぎて途中で打ち切られました。問題数を減らすか、GEMINI_MAX_TOKENS を増やしてください。'
        )
    }
    if (!rawText) {
        log('空レスポンス', { finishReason, safety: candidate?.safetyRatings })
        throw new Error(`空のレスポンスが返されました（finishReason: ${finishReason}）`)
    }
    return rawText
}

/** 生テキストから RawQuestion[] を取り出す（破損は段階的に修復してから救出する）。 */
function parseRawQuestions(rawText: string): RawQuestion[] {
    const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
        log('JSON抽出失敗', rawText)
        throw new Error('JSONの抽出に失敗しました')
    }

    /**
     * 制御文字と改行を正規化してからパース。
     * モデルが値の途中に生の改行(\n,\r,\t)を挟むことがあり、それは
     * JSON的に不正な制御文字になる。文字列の内側か外側かを判定し、
     * 内側の改行はスペースに、構造上の改行・制御文字は除去する。
     */
    const sanitized = normalizeControlChars(jsonMatch[0])

    let parsed: { questions?: RawQuestion[] }
    try {
        parsed = JSON.parse(sanitized)
    } catch (firstError) {
        // Lite等が稀に出すクォート欠落を自動修復して再パースを試みる
        log('JSONパース失敗→修復を試行', String(firstError))
        const repaired = repairJson(sanitized)
        try {
            parsed = JSON.parse(repaired)
            log('修復後パース成功')
        } catch (secondError) {
            // 最終手段：付加情報の keywords 行を丸ごと捨てて、問題本体だけでも救出する
            log('修復後も失敗→keywords除去で再試行', String(secondError))
            const withoutKeywords = stripKeywordsLines(repaired)
            try {
                parsed = JSON.parse(withoutKeywords)
                log('keywords除去でパース成功（keywordsは欠落）')
            } catch (thirdError) {
                log('JSONパース失敗（生テキスト）', rawText)
                log('JSONパース失敗（最終）', withoutKeywords.slice(0, 300))
                throw new Error(`JSONのパースに失敗しました: ${thirdError}`)
            }
        }
    }

    if (!Array.isArray(parsed.questions)) {
        log('questions配列が見つからない', parsed)
        throw new Error('questions配列が見つかりませんでした')
    }
    return parsed.questions
}

/**
 * 選択肢が「2個未満・空・重複」のいずれかなら不備とみなす（正規化して比較）。
 * 金額・率の0埋めや重複（同じ金額が複数）をまとめて検出できる。
 */
function hasProblematicChoices(q: Question): boolean {
    const norm = (s: string) => (typeof s === 'string' ? s : '').replace(/\s+/g, '')
    const texts = q.choices.map((c) => norm(c.text))
    if (texts.length < 2) return true
    if (texts.some((t) => t === '')) return true
    return new Set(texts).size < texts.length
}

/**
 * 不備のある問題だけ choices/answer/explanation を1リクエストで作り直し、id でマージする。
 * 作り直し後も不備が残る問題は、悪化を避けて元の選択肢のまま残す。
 */
async function repairProblematicChoices(
    all: Question[],
    bad: Question[],
    apiKey: string,
): Promise<Question[]> {
    const prompt = buildChoiceRepairPrompt(bad.map((q) => ({ id: q.id, question: q.question })))
    // 再生成パスだけ上位モデル（Flash）＋低温で「確実に解かせる」。
    // 通常生成（Lite）では計算問題を作り直しても直らないため。
    const rawText = await callGeminiRaw(prompt, apiKey, {
        model: GEMINI_REPAIR_MODEL,
        temperature: GEMINI_REPAIR_TEMPERATURE,
    })
    const repaired = parseRawQuestions(rawText)

    const byId = new Map<number, RawQuestion>()
    for (const r of repaired) {
        if (typeof r.id === 'number' && r.choices) byId.set(r.id, r)
    }
    if (byId.size === 0) {
        log('再生成結果が空→元のまま')
        return all
    }

    let fixed = 0
    const merged = all.map((q) => {
        const r = byId.get(q.id)
        if (!r) return q
        // 作り直した choices を、元の問題文・単元・keywords を保ったまま内部形式へ正規化する。
        // explanation は再生成側が空なら元のものを使う。
        const next = normalizeQuestion({
            id: q.id,
            unitId: q.unitId,
            unit: q.unit,
            question: q.question,
            choices: r.choices,
            answer: r.answer,
            explanation:
                typeof r.explanation === 'string' && r.explanation.trim() ? r.explanation : q.explanation,
            keywords: q.keywords,
        })
        // 作り直し後も不備（重複・空）が残るなら、元の選択肢を維持して悪化させない
        if (hasProblematicChoices(next)) {
            log('再生成後も不備→元の選択肢を維持', { id: q.id })
            return q
        }
        fixed++
        return next
    })
    log('選択肢の再生成完了', { fixed, requested: bad.length })
    return merged
}

/** Gemini APIにプロンプトを送り、内部形式のQuizDataを返す */
export async function generateQuiz(prompt: string): Promise<QuizData> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません')

    const rawText = await callGeminiRaw(prompt, apiKey)
    let questions = parseRawQuestions(rawText).map(normalizeQuestion)
    log('パース・正規化成功', { questionCount: questions.length })

    // 選択肢に不備（重複・空）のある問題を、無くなるまで上位モデル（Flash）で作り直す。
    // 計算問題は Lite では作り直しても直らないため、再生成パスだけ Flash＋低温で解かせ、
    // それでも残るものは最大 MAX_CHOICE_REPAIR_ROUNDS 回まで繰り返す。
    // 「ユーザーに不備のある問題を出さない」ことを最優先する。
    for (let round = 1; round <= MAX_CHOICE_REPAIR_ROUNDS; round++) {
        const bad = questions.filter(hasProblematicChoices)
        if (bad.length === 0) break
        log('選択肢に不備のある問題を検出→再生成', { round, count: bad.length, ids: bad.map((q) => q.id) })
        try {
            questions = await repairProblematicChoices(questions, bad, apiKey)
        } catch (e) {
            // リクエスト自体の失敗は概ね一時的でないため、リトライせず打ち切る。
            log('選択肢の再生成に失敗（このラウンドで打ち切り）', { round, error: String(e) })
            break
        }
    }

    // 上限まで作り直しても不備が残る問題は、ユーザーに出さない（表示から除外する）。
    // 不備のある問題を見せるより、問題数が少し減る方を選ぶ。
    const stillBad = questions.filter(hasProblematicChoices)
    if (stillBad.length > 0) {
        log('再生成上限後も不備が残るため表示から除外', {
            count: stillBad.length,
            ids: stillBad.map((q) => q.id),
        })
        questions = questions.filter((q) => !hasProblematicChoices(q))
    }

    return { questions }
}