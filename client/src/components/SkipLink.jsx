import { useI18n } from '../i18n/i18nContext'

/**
 * Skip to main content link for keyboard navigation
 * First focusable element on the page for accessibility
 */
export default function SkipLink() {
  const { t } = useI18n()

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
    >
      {t('accessibility.skipToContent')}
    </a>
  )
}

// Made with Bob
