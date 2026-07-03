import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/oauth/'],
    },
    sitemap: 'https://www.campuslifeos.site/sitemap.xml',
  }
}
