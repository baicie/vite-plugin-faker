import { dynamic } from '../../lib/zeus'
import { t } from '../../i18n'

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onChange: (page: number) => void
}

export default function Pagination(props: PaginationProps): JSX.Element {
  return (
    <div class="studio-pagination" aria-label={t('Pagination')}>
      <span class="studio-pagination-summary">
        {dynamic(function () {
          return props.total + ' ' + t(props.total === 1 ? 'item' : 'items')
        })}
      </span>
      <div class="studio-pagination-controls">
        <zw-button
          variant="outline"
          size="icon"
          aria-label={t('Previous page')}
          title={t('Previous page')}
          disabled={function () {
            return props.page <= 1
          }}
          onClick={function (): void {
            if (props.page > 1) {
              props.onChange(props.page - 1)
            }
          }}
        >
          <zw-icon-chevron-left size="16" />
        </zw-button>
        <span class="studio-page-number">
          {dynamic(function () {
            return props.page + ' / ' + Math.max(props.totalPages, 1)
          })}
        </span>
        <zw-button
          variant="outline"
          size="icon"
          aria-label={t('Next page')}
          title={t('Next page')}
          disabled={function () {
            return props.page >= Math.max(props.totalPages, 1)
          }}
          onClick={function (): void {
            if (props.page < props.totalPages) {
              props.onChange(props.page + 1)
            }
          }}
        >
          <zw-icon-chevron-right size="16" />
        </zw-button>
      </div>
    </div>
  )
}
