// app/sitemap.ts
// サイトマップ。公開ページを列挙してクローラーに伝える。
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date()
    return [
        {
            url: SITE_URL,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${SITE_URL}/privacy`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ]
}
