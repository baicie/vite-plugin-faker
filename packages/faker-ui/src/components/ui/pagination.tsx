import { dynamic } from '../../lib/zeus'

export interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onChange: (page: number) => void
}

export default function Pagination(props: PaginationProps): JSX.Element {
  return (
    <div class="studio-pagination" aria-label="Pagination">
      <span class="studio-pagination-summary">
        {dynamic(function () {
          return props.total + (props.total === 1 ? ' item' : ' items')
        })}
      </span>
      <div class="studio-pagination-controls">
        <zw-button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          title="Previous page"
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
          aria-label="Next page"
          title="Next page"
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
