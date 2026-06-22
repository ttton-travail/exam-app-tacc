// app/robots.ts
// クローラー向けディレクティブ。/privacy 等も含め全体をクロール許可。
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // APIは検索結果に出す必要がないので除外
            disallow: ['/api/'],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    }
}
