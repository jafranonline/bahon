import { useMemo, useState } from 'react'
import { TopBar } from '@components/layout/TopBar'
import { Screen } from '@components/layout/Screen'
import { Input } from '@components/primitives/Input'
import { useTranslation } from '@hooks/useTranslation'
import { FEEDBACK_FORM_URL } from '@utils/constants'
import styles from './HelpScreen.module.css'

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const Icons = {
  start: (
    <svg width="18" height="18" viewBox="0 0 22 22" {...stroke}>
      <path d="M11 3l2.4 5.1L19 9l-4 4 1 5.9L11 16l-5 2.9 1-5.9-4-4 5.6-.9L11 3z" />
    </svg>
  ),
  logging: (
    <svg width="18" height="18" viewBox="0 0 22 22" {...stroke}>
      <path d="M6 3h6l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M12 3v4h4M8 12h6M8 15.5h6" />
    </svg>
  ),
  reminders: (
    <svg width="18" height="18" viewBox="0 0 22 22" {...stroke}>
      <path d="M11 3a6 6 0 016 6v4l1.5 2.5h-15L5 13V9a6 6 0 016-6z" />
      <path d="M9 17.5a2 2 0 004 0" />
    </svg>
  ),
  documents: (
    <svg width="18" height="18" viewBox="0 0 22 22" {...stroke}>
      <path d="M4 6a2 2 0 012-2h6l4 4v8a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
      <path d="M12 4v4h4" />
    </svg>
  ),
  stats: (
    <svg width="18" height="18" viewBox="0 0 22 22" {...stroke}>
      <path d="M4 19V9M11 19V4M18 19v-7" />
    </svg>
  ),
  ai: (
    <svg width="18" height="18" viewBox="0 0 22 22" {...stroke}>
      <path d="M11 3v3M11 16v3M3 11h3M16 11h3M5.5 5.5l2 2M14.5 14.5l2 2M16.5 5.5l-2 2M7.5 14.5l-2 2" />
      <circle cx="11" cy="11" r="3.2" />
    </svg>
  ),
  account: (
    <svg width="18" height="18" viewBox="0 0 22 22" {...stroke}>
      <circle cx="11" cy="7.5" r="3.5" />
      <path d="M4.5 18a6.5 6.5 0 0113 0" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6Z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1Z" />
    </svg>
  ),
  offline: (
    <svg width="18" height="18" viewBox="0 0 22 22" {...stroke}>
      <path d="M4 9.5a11 11 0 0114 0M6.8 12.6a7 7 0 018.4 0M9.6 15.7a3 3 0 012.8 0" />
      <circle cx="11" cy="18.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
}

interface Topic {
  id: string
  icon: React.ReactNode
  titleKey: string
  bodyKey: string
  listKey?: string
}

const TOPICS: Topic[] = [
  { id: 'start', icon: Icons.start, titleKey: 'help.start_title', bodyKey: 'help.start_body', listKey: 'help.start_list' },
  { id: 'logging', icon: Icons.logging, titleKey: 'help.logging_title', bodyKey: 'help.logging_body', listKey: 'help.logging_list' },
  { id: 'reminders', icon: Icons.reminders, titleKey: 'help.reminders_title', bodyKey: 'help.reminders_body', listKey: 'help.reminders_list' },
  { id: 'documents', icon: Icons.documents, titleKey: 'help.documents_title', bodyKey: 'help.documents_body' },
  { id: 'stats', icon: Icons.stats, titleKey: 'help.stats_title', bodyKey: 'help.stats_body' },
  { id: 'ai', icon: Icons.ai, titleKey: 'help.ai_title', bodyKey: 'help.ai_body', listKey: 'help.ai_list' },
  { id: 'account', icon: Icons.account, titleKey: 'help.account_title', bodyKey: 'help.account_body' },
  { id: 'settings', icon: Icons.settings, titleKey: 'help.settings_title', bodyKey: 'help.settings_body' },
  { id: 'offline', icon: Icons.offline, titleKey: 'help.offline_title', bodyKey: 'help.offline_body' },
]

export function HelpScreen() {
  const { t } = useTranslation()
  const [openId, setOpenId] = useState<string | null>('start')
  const [query, setQuery] = useState('')

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id))

  const topicsWithText = useMemo(
    () =>
      TOPICS.map((topic) => {
        const list = topic.listKey
          ? (t(topic.listKey, { returnObjects: true }) as string[])
          : null
        const searchText = [t(topic.titleKey), t(topic.bodyKey), ...(list ?? [])]
          .join(' ')
          .toLowerCase()
        return { topic, list, searchText }
      }),
    [t],
  )

  const trimmedQuery = query.trim().toLowerCase()
  const filtered = trimmedQuery
    ? topicsWithText.filter(({ searchText }) => searchText.includes(trimmedQuery))
    : topicsWithText

  return (
    <div className={styles.root}>
      <TopBar title={t('help.title')} />
      <Screen>
        <p className={styles.intro}>{t('help.intro')}</p>

        <div className={styles.search}>
          <Input
            type="text"
            value={query}
            onChange={setQuery}
            placeholder={t('help.search_placeholder')}
            aria-label={t('help.search_placeholder')}
          />
        </div>

        {filtered.length === 0 ? (
          <p className={styles.noResults}>{t('help.no_results', { query })}</p>
        ) : (
        <div className={styles.list}>
          {filtered.map(({ topic, list }) => {
            const open = trimmedQuery ? true : openId === topic.id
            return (
              <div key={topic.id} className={styles.item}>
                <button
                  type="button"
                  className={styles.trigger}
                  onClick={() => toggle(topic.id)}
                  aria-expanded={open}
                  aria-controls={`help-panel-${topic.id}`}
                >
                  <span className={styles.triggerIcon} aria-hidden="true">{topic.icon}</span>
                  <span className={styles.triggerTitle}>{t(topic.titleKey)}</span>
                  <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M7 4l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                {open && (
                  <div id={`help-panel-${topic.id}`} className={styles.panel}>
                    <p>{t(topic.bodyKey)}</p>
                    {Array.isArray(list) && list.length > 0 && (
                      <ul>
                        {list.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )}

        <div className={styles.footer}>
          {FEEDBACK_FORM_URL && (
            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.feedbackLink}
            >
              {t('help.still_need_help')}
            </a>
          )}
          <a href="mailto:mail@jafran.online" className={styles.contactLink}>
            {t('help.contact')}
          </a>
        </div>
      </Screen>
    </div>
  )
}
