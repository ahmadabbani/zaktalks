'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaBookOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaCoins,
  FaCopy,
  FaCreditCard,
  FaEnvelope,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaHistory,
  FaInfoCircle,
  FaReceipt,
  FaShieldAlt,
  FaShoppingBag,
  FaTags,
  FaTimes,
  FaUndoAlt,
  FaUser,
  FaUserCheck,
  FaWallet,
} from 'react-icons/fa'
import styles from './admin-users.module.css'
import { AdminDashboardLoading, AdminDashboardUpdate } from './AdminDashboardLoading'

const RANGE_OPTIONS = [
  ['7', 'Last 7 days'],
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['365', 'Last 12 months'],
  ['all', 'All time'],
]

const PAYMENT_OPTIONS = [
  ['all', 'All payment states'],
  ['paid', 'Paid'],
  ['processing', 'Processing'],
  ['failed', 'Failed'],
  ['expired', 'Expired'],
  ['refunded', 'Refunded'],
  ['disputed', 'Disputed'],
]

const FULFILLMENT_OPTIONS = [
  ['all', 'All access outcomes'],
  ['fulfilled', 'Access granted'],
  ['processing', 'Access processing'],
  ['attention', 'Needs attention'],
  ['revoked', 'Access revoked'],
  ['not_required', 'No access expected'],
]

const DISCOUNT_OPTIONS = [
  ['all', 'All pricing'],
  ['discounted', 'Discounted orders'],
  ['full_price', 'Full-price orders'],
  ['first_purchase', 'First-purchase offer'],
  ['points', 'Points used'],
  ['coupon', 'Coupon used'],
]

const SORT_OPTIONS = [
  ['newest', 'Newest first'],
  ['oldest', 'Oldest first'],
  ['amount_high', 'Highest paid'],
  ['amount_low', 'Lowest paid'],
  ['discount_high', 'Highest savings'],
]

const initialFilters = {
  range: '90',
  course: 'all',
  payment: 'all',
  fulfillment: 'all',
  discount: 'all',
  sort: 'newest',
  pageSize: '20',
}

const paymentDetails = {
  paid: { label: 'Paid', tone: 'success', description: 'Stripe confirmed this payment.' },
  processing: { label: 'Processing', tone: 'yellow', description: 'The payment has not reached a final state.' },
  failed: { label: 'Failed', tone: 'danger', description: 'Stripe did not confirm a successful payment.' },
  expired: { label: 'Expired', tone: 'neutral', description: 'The checkout closed before payment completed.' },
  refunded: { label: 'Refunded', tone: 'neutral', description: 'The payment was refunded or lost after a dispute.' },
  disputed: { label: 'Disputed', tone: 'danger', description: 'The payment currently has an open dispute.' },
}

const fulfillmentDetails = {
  fulfilled: { label: 'Access granted', tone: 'success', description: 'The enrollment is linked and course access is active.' },
  processing: { label: 'Access processing', tone: 'yellow', description: 'Automatic fulfillment is still running.' },
  attention: { label: 'Needs attention', tone: 'danger', description: 'Payment was recorded, but fulfillment needs review.' },
  revoked: { label: 'Access revoked', tone: 'neutral', description: 'Course access was removed after a payment reversal.' },
  not_required: { label: 'No access granted', tone: 'neutral', description: 'This checkout did not require course access.' },
}

const discountLabels = {
  first_purchase: 'First-purchase offer',
  points: 'Points',
  coupon: 'Coupon',
  recorded_discount: 'Recorded discount',
  full_price: 'Full price',
}

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value, fallback = 'Not recorded') {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return fallback
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) / 100)
}

function formatDate(value, withTime = false) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return new Intl.DateTimeFormat('en', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function formatTrendDate(value, range) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  if (range === 'all' || range === '365') return date.toLocaleDateString('en', { month: 'short', year: '2-digit' })
  return date.toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

function initials(row) {
  return (row?.customer_name || row?.email || 'Customer')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function statusInfo(group, map, fallback) {
  return map[group] || fallback
}

function AnimatedNumber({ value, suffix = '' }) {
  const target = number(value)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 620
    const draw = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      setDisplay(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return <>{display.toLocaleString()}{suffix}</>
}

function AnimatedMoney({ value }) {
  const target = number(value)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame
    const start = performance.now()
    const draw = (now) => {
      const progress = Math.min(1, (now - start) / 650)
      setDisplay(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return <>{money(display, '$0.00')}</>
}

function PaymentSelect({ label, name, value, options, onChange }) {
  return (
    <label className={styles.paymentSelectLabel}>
      <span>{label}</span>
      <span className={styles.paymentSelectShell}>
        <select name={name} value={value} onChange={onChange}>
          {options.map(([optionValue, optionLabel]) => (
            <option value={optionValue} key={optionValue}>{optionLabel}</option>
          ))}
        </select>
        <FaChevronDown aria-hidden="true" />
      </span>
    </label>
  )
}

function StatusPill({ group, type = 'payment' }) {
  const map = type === 'payment' ? paymentDetails : fulfillmentDetails
  const detail = statusInfo(group, map, { label: 'Recorded', tone: 'neutral' })
  return <span className={`${styles.paymentPill} ${styles[`paymentPill${detail.tone}`]}`}>{detail.label}</span>
}

function PaymentTrend({ rows, range }) {
  const maxAmount = Math.max(1, ...rows.map((row) => number(row.settled_sales_cents)))
  const maxOrders = Math.max(1, ...rows.map((row) => number(row.orders)))

  if (!rows.length) {
    return <div className={styles.paymentChartEmpty}><FaHistory /><span>No orders in this period</span></div>
  }

  return (
    <div className={styles.paymentTrend}>
      {rows.map((row) => (
        <article key={row.bucket} title={`${row.orders} orders · ${money(row.settled_sales_cents, '$0.00')} settled`}>
          <div className={styles.paymentTrendPlot}>
            <span className={styles.paymentTrendAmount} style={{ height: `${Math.max(5, number(row.settled_sales_cents) / maxAmount * 100)}%` }} />
            <i style={{ bottom: `${Math.max(4, number(row.orders) / maxOrders * 88)}%` }}>{row.orders}</i>
          </div>
          <small>{formatTrendDate(row.bucket, range)}</small>
        </article>
      ))}
    </div>
  )
}

function MixBars({ rows, labels, total }) {
  if (!rows.length) return <div className={styles.paymentMixEmpty}>No matching records</div>

  return (
    <div className={styles.paymentMixBars}>
      {rows.map((row) => {
        const key = row.status || row.source || row.method
        const records = number(row.records)
        const percentage = total ? Math.round(records * 100 / total) : 0
        return (
          <div key={key}>
            <span><strong>{labels[key] || key.replaceAll('_', ' ')}</strong><b>{records} · {percentage}%</b></span>
            <i><em style={{ width: `${percentage}%` }} /></i>
          </div>
        )
      })}
    </div>
  )
}

function CopyValue({ value, label }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <span className={styles.paymentMissingValue}>Not recorded</span>

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className={styles.paymentCopyValue}>
      <code title={value}>{value}</code>
      <button type="button" onClick={copy} aria-label={`Copy ${label}`}><FaCopy />{copied ? 'Copied' : 'Copy'}</button>
    </span>
  )
}

function NoticeState({ label, sentAt, error, idleText }) {
  const state = sentAt ? 'sent' : error ? 'error' : 'idle'
  return (
    <div className={styles.paymentNoticeRow}>
      <span className={styles[`paymentNotice${state}`]}>{sentAt ? <FaCheckCircle /> : error ? <FaExclamationTriangle /> : <FaClock />}</span>
      <div><strong>{label}</strong><small>{sentAt ? `Sent ${formatDate(sentAt, true)}` : error || idleText}</small></div>
    </div>
  )
}

function PaymentDrawer({ payment, onClose }) {
  const closeButton = useRef(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    closeButton.current?.focus()
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/admin/users/payments/${payment.checkout_id}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load payment details.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [payment.checkout_id])

  const order = data?.order || payment
  const paymentInfo = statusInfo(order.payment_group, paymentDetails, { label: order.payment_state || 'Recorded', tone: 'neutral', description: 'A payment state is recorded.' })
  const accessInfo = statusInfo(order.fulfillment_group, fulfillmentDetails, { label: order.fulfillment_state || 'Recorded', tone: 'neutral', description: 'A fulfillment state is recorded.' })
  const methods = Array.isArray(order.discount_methods) ? order.discount_methods : []
  const hasNotificationHistory = Boolean(
    order.password_setup_email_sent_at || order.password_setup_email_error
      || order.fulfillment_first_failed_at || order.fulfillment_customer_notice_sent_at
      || order.fulfillment_customer_notice_error || order.fulfillment_admin_notice_sent_at
      || order.fulfillment_admin_notice_error || order.fulfillment_customer_recovery_sent_at
      || order.fulfillment_customer_recovery_error || order.fulfillment_admin_recovery_sent_at
      || order.fulfillment_admin_recovery_error
  )

  return (
    <div className={styles.drawerLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className={`${styles.userDrawer} ${styles.paymentDrawer}`} role="dialog" aria-modal="true" aria-labelledby="payment-drawer-title">
        <header className={styles.paymentDrawerHeader}>
          <div className={styles.paymentDrawerIdentity}>
            <span>{initials(order)}</span>
            <div><small>Payment record</small><h3 id="payment-drawer-title">{order.customer_name}</h3><a href={`mailto:${order.email}`}>{order.email}</a></div>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Close payment details"><FaTimes /></button>
        </header>

        <div className={styles.paymentDrawerBody}>
          <div className={styles.paymentDrawerPills}>
            <StatusPill group={order.payment_group} />
            <StatusPill group={order.fulfillment_group} type="fulfillment" />
            <span className={styles.paymentSourcePill}>{order.customer_source === 'guest' ? 'Guest checkout' : 'Account checkout'}</span>
          </div>

          <section className={styles.paymentHeroDetail}>
            <div><span>Amount paid</span><strong>{money(order.expected_amount_cents)}</strong><small>{paymentInfo.description}</small></div>
            <div><span>Original price</span><strong>{money(order.original_price_cents)}</strong><small>{order.discount_cents ? `${money(order.discount_cents)} saved` : 'No recorded savings'}</small></div>
            <div><span>Course access</span><strong>{accessInfo.label}</strong><small>{accessInfo.description}</small></div>
          </section>

          {loading && <div className={styles.paymentDrawerLoading}><span /><span /><span /><span /></div>}
          {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Payment details unavailable</strong><span>{error}</span></div></div>}

          {!loading && !error && data && (
            <>
              <section className={styles.paymentDrawerSection}>
                <header><span><FaReceipt /></span><div><small>Order</small><h4>Purchase summary</h4></div></header>
                <dl className={styles.paymentDetailGrid}>
                  <div><dt>Course</dt><dd>{order.course_title}</dd></div>
                  <div><dt>Course path</dt><dd>/{order.course_slug}</dd></div>
                  <div><dt>Order created</dt><dd>{formatDate(order.created_at, true)}</dd></div>
                  <div><dt>Payment completed</dt><dd>{formatDate(order.completed_at, true)}</dd></div>
                  <div><dt>Checkout status</dt><dd>{order.checkout_status}</dd></div>
                  <div><dt>Currency</dt><dd>USD</dd></div>
                </dl>
              </section>

              <section className={styles.paymentDrawerSection}>
                <header><span><FaTags /></span><div><small>Pricing</small><h4>Discounts and rewards</h4></div></header>
                <div className={styles.paymentDiscountCards}>
                  <article><span><FaWallet /></span><div><small>Total savings</small><strong>{money(order.discount_cents, '$0.00')}</strong></div></article>
                  <article className={order.first_purchase_discount_applied ? styles.paymentDiscountActive : ''}><span><FaShoppingBag /></span><div><small>First-purchase offer</small><strong>{order.first_purchase_discount_applied ? 'Applied' : 'Not used'}</strong></div></article>
                  <article className={order.points_to_spend ? styles.paymentDiscountActive : ''}><span><FaCoins /></span><div><small>Points spent</small><strong>{number(order.points_to_spend).toLocaleString()}</strong></div></article>
                  <article className={order.coupon_id ? styles.paymentDiscountActive : ''}><span><FaTags /></span><div><small>Coupon</small><strong>{order.coupon_code || 'Not used'}</strong></div></article>
                </div>
                {methods.length > 0 && <div className={styles.paymentMethodTags}>{methods.map((method) => <span key={method}>{discountLabels[method] || method}</span>)}</div>}
                {number(order.discount_cents) > 0 && <p className={styles.paymentAccuracyNote}><FaInfoCircle />The paid total and total savings are exact. Older orders may not preserve a separate dollar amount for every discount source.</p>}
              </section>

              <section className={styles.paymentDrawerSection}>
                <header><span><FaUserCheck /></span><div><small>Customer and access</small><h4>Account fulfillment</h4></div></header>
                <dl className={styles.paymentDetailGrid}>
                  <div><dt>Customer</dt><dd>{order.customer_name}</dd></div>
                  <div><dt>Checkout type</dt><dd>{order.customer_source === 'guest' ? 'Guest checkout' : 'Signed-in account'}</dd></div>
                  <div><dt>Email status</dt><dd>{order.email_verified ? 'Verified' : 'Not verified'}</dd></div>
                  <div><dt>Password status</dt><dd>{order.password_set ? 'Ready' : 'Setup pending'}</dd></div>
                  <div><dt>Enrollment</dt><dd>{order.enrollment_id ? order.enrollment_payment_status || 'Linked' : 'Not linked'}</dd></div>
                  <div><dt>Access created</dt><dd>{formatDate(order.access_created_at, true)}</dd></div>
                  <div><dt>Fulfillment attempts</dt><dd>{number(order.fulfillment_attempts)}</dd></div>
                  <div><dt>Last fulfillment try</dt><dd>{formatDate(order.last_fulfillment_attempt_at, true)}</dd></div>
                </dl>
                {order.last_fulfillment_error && <div className={styles.paymentFailureBox}><FaExclamationTriangle /><div><strong>Latest fulfillment error</strong><p>{order.last_fulfillment_error}</p></div></div>}
              </section>

              {hasNotificationHistory && <section className={styles.paymentDrawerSection}>
                <header><span><FaEnvelope /></span><div><small>Delivery</small><h4>Account and recovery notices</h4></div></header>
                <div className={styles.paymentNoticeList}>
                  {order.customer_source === 'guest' && <NoticeState label="Guest password setup" sentAt={order.password_setup_email_sent_at} error={order.password_setup_email_error} idleText="No setup email recorded" />}
                  {order.fulfillment_first_failed_at && <>
                    <NoticeState label="Customer delay notice" sentAt={order.fulfillment_customer_notice_sent_at} error={order.fulfillment_customer_notice_error} idleText="Not sent" />
                    <NoticeState label="Admin delay notice" sentAt={order.fulfillment_admin_notice_sent_at} error={order.fulfillment_admin_notice_error} idleText="Not sent" />
                    <NoticeState label="Customer recovery notice" sentAt={order.fulfillment_customer_recovery_sent_at} error={order.fulfillment_customer_recovery_error} idleText="Not required yet" />
                    <NoticeState label="Admin recovery notice" sentAt={order.fulfillment_admin_recovery_sent_at} error={order.fulfillment_admin_recovery_error} idleText="Not required yet" />
                  </>}
                </div>
              </section>}

              <section className={styles.paymentDrawerSection}>
                <header><span><FaCreditCard /></span><div><small>Stripe references</small><h4>Payment identifiers</h4></div></header>
                <div className={styles.paymentReferenceList}>
                  <div><strong>Checkout Session</strong><CopyValue value={order.stripe_session_id} label="Checkout Session ID" /></div>
                  <div><strong>PaymentIntent</strong><CopyValue value={order.stripe_payment_intent_id} label="PaymentIntent ID" /></div>
                  <div><strong>Internal order</strong><CopyValue value={order.checkout_id} label="internal order ID" /></div>
                  <div><strong>Enrollment</strong><CopyValue value={order.enrollment_id} label="enrollment ID" /></div>
                </div>
              </section>

              <section className={styles.paymentDrawerSection}>
                <header><span><FaShieldAlt /></span><div><small>Webhook health</small><h4>Related Stripe events</h4></div></header>
                {!data.webhookEvents.length ? <p className={styles.paymentEmptyDetail}>No related webhook event is preserved for this order. Older records may predate event tracking.</p> : <div className={styles.paymentEventList}>
                  {data.webhookEvents.map((event) => <article key={event.id}>
                    <span className={event.processing_status === 'completed' ? styles.paymentEventSuccess : styles.paymentEventWarning}>{event.processing_status === 'completed' ? <FaCheckCircle /> : <FaExclamationTriangle />}</span>
                    <div><strong>{event.event_type}</strong><small>{formatDate(event.received_at, true)} · {event.attempts} {number(event.attempts) === 1 ? 'attempt' : 'attempts'}</small>{event.last_error && <p>{event.last_error}</p>}</div>
                    <em>{event.processing_status}</em>
                  </article>)}
                </div>}
              </section>

              {data.pointTransactions.length > 0 && <section className={styles.paymentDrawerSection}>
                <header><span><FaCoins /></span><div><small>Points ledger</small><h4>Purchase-related points</h4></div></header>
                <div className={styles.paymentPointList}>{data.pointTransactions.map((transaction) => <article key={transaction.id}><span className={number(transaction.amount) >= 0 ? styles.paymentPointsEarned : styles.paymentPointsSpent}>{number(transaction.amount) >= 0 ? '+' : ''}{number(transaction.amount).toLocaleString()}</span><div><strong>{transaction.description || transaction.type}</strong><small>{formatDate(transaction.created_at, true)}</small></div></article>)}</div>
              </section>}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

export default function PaymentsDashboard() {
  const [filters, setFilters] = useState(initialFilters)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [selectedPayment, setSelectedPayment] = useState(null)

  const query = useMemo(() => {
    const params = new URLSearchParams(filters)
    if (filters.course === 'all') params.delete('course')
    return params.toString()
  }, [filters])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true)
        setError('')
      }
    })

    fetch(`/api/admin/users/payments?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load payments.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))

    return () => controller.abort()
  }, [query])

  const loadMore = async () => {
    if (!data?.nextCursor || loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/users/payments?${query}&cursor=${encodeURIComponent(data.nextCursor)}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to load more payments.')
      setData((current) => ({ ...body, rows: [...(current?.rows || []), ...(body.rows || [])] }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingMore(false)
    }
  }

  const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
  const resetFilters = () => setFilters(initialFilters)
  const summary = data?.summary || {}
  const hasFilters = Object.entries(filters).some(([key, value]) => value !== initialFilters[key])
  const rangeLabel = RANGE_OPTIONS.find(([value]) => value === filters.range)?.[1] || 'Selected period'
  const courseOptions = [['all', 'All courses'], ...(data?.courses || []).map((course) => [course.course_id, course.course_title])]
  const total = number(data?.totalCount)
  const metrics = [
    { label: 'Settled sales', display: <AnimatedMoney value={summary.settled_sales_cents} />, detail: 'Paid and fulfilled orders currently settled', icon: FaWallet },
    { label: 'Paid orders', value: summary.paid_orders, detail: `${number(summary.fulfilled_orders)} with course access granted`, icon: FaCreditCard },
    { label: 'Customer savings', display: <AnimatedMoney value={summary.savings_cents} />, detail: `${number(summary.discounted_orders)} discounted orders`, icon: FaTags },
    { label: 'Average paid', display: <AnimatedMoney value={summary.average_paid_cents} />, detail: 'Average among paid, fulfilled orders', icon: FaReceipt },
    { label: 'Needs attention', value: summary.attention_orders, detail: 'Fulfillment records requiring review', icon: FaExclamationTriangle, warning: number(summary.attention_orders) > 0 },
  ]

  if (loading && !data) return <AdminDashboardLoading label="Loading payment records" />

  return (
    <div className={styles.paymentsDashboard} aria-busy={loading || loadingMore}>
      {loading && data && <AdminDashboardUpdate label="Updating payments" />}

      <div className={styles.paymentRangeBar}>
        <div><span>Payment window</span><p>Filters order creation, payment health, access fulfillment, discounts, and the report below.</p></div>
        <div>{RANGE_OPTIONS.map(([value, label]) => <button type="button" key={value} className={filters.range === value ? styles.paymentRangeActive : ''} onClick={() => setFilters((current) => ({ ...current, range: value }))}>{label}</button>)}</div>
      </div>

      <div className={styles.paymentMetricGrid}>
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return <article className={metric.warning ? styles.paymentMetricWarning : ''} style={{ '--payment-delay': `${index * 55}ms` }} key={metric.label}><span><Icon /></span><div><small>{metric.label}</small><strong>{metric.display || <AnimatedNumber value={metric.value} />}</strong><p>{metric.detail}</p></div></article>
        })}
      </div>

      <div className={styles.paymentInsightsGrid}>
        <section className={styles.paymentInsightWide}>
          <header><div><span>Order flow</span><h3>Payments over time</h3></div><em>{rangeLabel}</em></header>
          <PaymentTrend rows={data?.trend || []} range={filters.range} />
          <div className={styles.paymentTrendLegend}><span><i />Settled sales</span><span><b />Orders created</span></div>
        </section>

        <section>
          <header><div><span>Payment health</span><h3>Current outcomes</h3></div><em>{total} orders</em></header>
          <MixBars rows={data?.statusMix || []} labels={{ paid: 'Paid', processing: 'Processing', failed: 'Failed', expired: 'Expired', refunded: 'Refunded', disputed: 'Disputed' }} total={total} />
        </section>

        <section>
          <header><div><span>Checkout mix</span><h3>Customers and pricing</h3></div><em>Current filters</em></header>
          <div className={styles.paymentSplitSummary}>
            {(data?.sourceMix || []).map((source) => <article key={source.source}><span>{source.source === 'guest' ? <FaUser /> : <FaUserCheck />}</span><div><strong>{source.records}</strong><small>{source.source === 'guest' ? 'Guest checkout' : 'Account checkout'}</small></div></article>)}
          </div>
          <MixBars rows={data?.discountMix || []} labels={discountLabels} total={Math.max(1, total)} />
        </section>
      </div>

      <section className={styles.paymentRecordsSection}>
        <div className={styles.paymentSectionHeading}>
          <div><span>Payment records</span><h3>Orders and fulfillment</h3></div>
          <p>One row per checkout order. Open a row to inspect Stripe references, access, discounts, notifications, and webhook health.</p>
        </div>

        <div className={styles.paymentToolbar}>
          <div className={styles.paymentToolbarTitle}><span><FaFilter /></span><div><strong>Refine the report</strong><small>{total.toLocaleString()} matching {total === 1 ? 'order' : 'orders'}</small></div></div>
          <div className={styles.paymentFilterGrid}>
            <PaymentSelect label="Course" name="course" value={filters.course} options={courseOptions} onChange={updateFilter} />
            <PaymentSelect label="Payment" name="payment" value={filters.payment} options={PAYMENT_OPTIONS} onChange={updateFilter} />
            <PaymentSelect label="Access" name="fulfillment" value={filters.fulfillment} options={FULFILLMENT_OPTIONS} onChange={updateFilter} />
            <PaymentSelect label="Pricing" name="discount" value={filters.discount} options={DISCOUNT_OPTIONS} onChange={updateFilter} />
            <PaymentSelect label="Order" name="sort" value={filters.sort} options={SORT_OPTIONS} onChange={updateFilter} />
          </div>
          {hasFilters && <button type="button" className={styles.paymentResetButton} onClick={resetFilters}><FaUndoAlt />Reset filters</button>}
        </div>

        {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Payment report unavailable</strong><span>{error}</span></div></div>}
        {!loading && !error && !data?.rows?.length && <div className={styles.directoryEmpty}><FaReceipt /><strong>No matching payment records</strong><span>Try a broader time range or reset the filters.</span></div>}

        <div className={loading ? styles.paymentTableUpdating : styles.paymentTable}>
          <div className={styles.paymentTableHeader}><span>Customer</span><span>Course</span><span>Payment</span><span>Paid / saved</span><span>Course access</span><span>Created</span><span>Open</span></div>
          {(data?.rows || []).map((row, index) => <article style={{ '--payment-row-delay': `${Math.min(index, 20) * 28}ms` }} key={row.checkout_id}>
            <span className={styles.paymentCustomer}><i>{initials(row)}</i><span><strong>{row.customer_name}</strong><small>{row.email}</small><em>{row.customer_source === 'guest' ? 'Guest checkout' : 'Account checkout'}</em></span></span>
            <span className={styles.paymentCourse}><strong>{row.course_title}</strong><small>/{row.course_slug}</small></span>
            <span className={styles.paymentStatusCell}><StatusPill group={row.payment_group} /><small>{row.payment_state.replaceAll('_', ' ')}</small></span>
            <span className={styles.paymentAmountCell}><strong>{money(row.expected_amount_cents)}</strong><small>{number(row.discount_cents) > 0 ? `${money(row.discount_cents)} saved` : row.expected_amount_cents === null ? 'Legacy total unavailable' : 'Full price'}</small></span>
            <span className={styles.paymentStatusCell}><StatusPill group={row.fulfillment_group} type="fulfillment" /><small>{row.enrollment_id ? 'Enrollment linked' : 'No linked enrollment'}</small></span>
            <span className={styles.paymentDateCell}><strong>{formatDate(row.created_at)}</strong><small>{row.completed_at ? `Paid ${formatDate(row.completed_at)}` : 'Not completed'}</small></span>
            <button type="button" className={styles.paymentOpenButton} onClick={() => setSelectedPayment(row)} aria-label={`Open payment for ${row.customer_name}`}><FaEye /></button>
          </article>)}
        </div>

        {(data?.rows?.length > 0) && <div className={styles.paymentLoadMore}>
          <span>Showing {data.rows.length.toLocaleString()} of {total.toLocaleString()} orders</span>
          {data.hasMore ? <button type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? <><span className={styles.adminLoadingSpinner} />Loading more</> : 'Load more payments'}</button> : <em>All matching orders loaded</em>}
        </div>}
      </section>

      <div className={styles.paymentMethodNote}><FaShieldAlt /><p><strong>How to read this report:</strong> Stripe verification and payment state come from the durable checkout record. Course access is reported separately, so a paid order with delayed or failed fulfillment cannot be mistaken for a completed enrollment.</p></div>

      {selectedPayment && <PaymentDrawer payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
    </div>
  )
}
