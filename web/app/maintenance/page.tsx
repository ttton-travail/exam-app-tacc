// ===========================
// 準備中（メンテナンス）ページ
// app/maintenance/page.tsx
//
// SITE_MODE=closed のとき、全アクセスがここに書き換えられて表示される。
// ===========================

export default function MaintenancePage() {
    return (
        <main
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                fontFamily: 'system-ui, sans-serif',
                color: '#1f2937',
            }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/assets/app-icon.svg"
                alt=""
                aria-hidden="true"
                style={{ width: '48px', height: '48px', marginBottom: '16px' }}
            />
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 12px' }}>
                かたてスト
                <span style={{ fontSize: '0.7em', marginLeft: '0.4em', whiteSpace: 'nowrap' }}>
                    1Click税務学習
                </span>
            </h1>
            <p style={{ fontSize: '16px', color: '#6b7280', margin: 0, lineHeight: 1.7 }}>
                ただいま公開準備中です。
                <br />
                もうしばらくお待ちください。
            </p>
        </main>
    )
}