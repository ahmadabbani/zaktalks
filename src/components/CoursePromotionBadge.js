import styles from './CoursePromotionBadge.module.css'

function formatPercent(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return ''
  return Number.isInteger(parsed)
    ? String(parsed)
    : parsed.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export default function CoursePromotionBadge({ promotion, className = '' }) {
  if (!promotion?.applied) return null

  const percent = formatPercent(promotion.discountPercent)
  if (!percent) return null

  return <span className={`${styles.badge} ${className}`.trim()}>{percent}% Off</span>
}
