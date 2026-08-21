'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FaBookOpen,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaDownload,
  FaEye,
  FaExclamationCircle,
  FaHistory,
  FaPercent,
  FaReceipt,
  FaShoppingBag,
  FaTags,
  FaTimes,
  FaUndoAlt,
} from 'react-icons/fa'
import styles from './dashboard.module.css'

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Amount unavailable'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number(value) % 100 === 0 ? 0 : 2,
  }).format(Number(value) / 100)
}

function formatDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}

function couponDescription(order) {
  if (!order?.coupon_applied) return null
  if (!order.coupon) return 'Coupon discount'

  const value = number(order.coupon.discount_value)
  const offer = order.coupon.discount_type === 'percentage'
    ? `${value}% off`
    : `${formatMoney(value)} off`

  return `${order.coupon.code} · ${offer}`
}

function receiptFileName(order) {
  return `zaktalks-receipt-${String(order?.order_reference || 'order').toLowerCase()}.pdf`
}

async function downloadReceiptPdf(target, order) {
  const [{ toPng }, { PDFDocument }] = await Promise.all([
    import('html-to-image'),
    import('pdf-lib'),
  ])

  await document.fonts?.ready
  const dataUrl = await toPng(target, {
    cacheBust: true,
    pixelRatio: Math.min(3, Math.max(2, window.devicePixelRatio || 1)),
    backgroundColor: '#ffffff',
    width: target.scrollWidth,
    height: target.scrollHeight,
    style: {
      margin: '0',
      transform: 'none',
      width: `${target.scrollWidth}px`,
      maxWidth: `${target.scrollWidth}px`,
    },
  })

  const pdf = await PDFDocument.create()
  const image = await pdf.embedPng(dataUrl)
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 30
  const contentWidth = pageWidth - (margin * 2)
  const renderedHeight = image.height * (contentWidth / image.width)
  const scale = Math.min(1, (pageHeight - (margin * 2)) / renderedHeight)
  const renderedWidth = contentWidth * scale
  const finalHeight = renderedHeight * scale
  const page = pdf.addPage([pageWidth, pageHeight])

  page.drawImage(image, {
    x: (pageWidth - renderedWidth) / 2,
    y: pageHeight - margin - finalHeight,
    width: renderedWidth,
    height: finalHeight,
  })
  pdf.setTitle(`ZakTalks receipt ${order.order_reference}`)
  pdf.setSubject('Course purchase receipt')
  pdf.setCreator('ZakTalks')
  pdf.setProducer('ZakTalks')

  const bytes = await pdf.save()
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = receiptFileName(order)
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function purchaseStatus(order) {
  if (order.payment_state === 'partially_refunded') {
    return { key: 'refunded', label: 'Partially refunded', detail: 'Part of this payment was returned.', icon: FaUndoAlt }
  }
  if (['refunded', 'dispute_lost'].includes(order.payment_state) || order.fulfillment_state === 'revoked') {
    return { key: 'refunded', label: 'Refunded', detail: 'This payment was returned and access is no longer active.', icon: FaUndoAlt }
  }
  if (order.payment_state === 'disputed') {
    return { key: 'review', label: 'Under review', detail: 'The payment is currently being reviewed.', icon: FaExclamationCircle }
  }
  if (order.payment_state === 'failed') {
    return { key: 'closed', label: 'Payment unsuccessful', detail: 'No completed payment was recorded.', icon: FaExclamationCircle }
  }
  if (order.payment_state === 'expired' || order.checkout_status === 'expired') {
    return { key: 'closed', label: 'Checkout closed', detail: 'This checkout ended before payment was completed.', icon: FaClock }
  }
  if (['pending', 'processing'].includes(order.payment_state)) {
    return { key: 'pending', label: 'Processing', detail: 'Your payment has not reached a final state yet.', icon: FaClock }
  }
  if (['failed', 'requires_attention'].includes(order.fulfillment_state)) {
    return { key: 'pending', label: 'Payment received', detail: 'Your payment is confirmed and course access is being reviewed.', icon: FaClock }
  }
  if (['pending', 'processing'].includes(order.fulfillment_state)) {
    return { key: 'pending', label: 'Preparing access', detail: 'Your payment is confirmed and course access is being prepared.', icon: FaClock }
  }
  if (order.fulfillment_state === 'fulfilled') {
    return { key: 'complete', label: 'Completed', detail: 'Payment confirmed and course access granted.', icon: FaCheckCircle }
  }
  return { key: 'closed', label: 'Closed', detail: 'This checkout did not create course access.', icon: FaClock }
}

function PurchaseSkeleton() {
  return <div className={styles.learnerPurchaseSkeleton} role="status" aria-label="Loading purchase history">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div>
}

function OrderReceiptModal({ summary, order, loading, error, onClose }) {
  const closeRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const receiptId = `learner-receipt-${summary.id}`

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => event.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const status = purchaseStatus(order || summary)
  const StatusIcon = status.icon
  const originalPrice = order?.original_price_cents
  const paidPrice = order?.expected_amount_cents
  const savings = originalPrice !== null && originalPrice !== undefined && paidPrice !== null && paidPrice !== undefined
    ? Math.max(0, number(originalPrice) - number(paidPrice))
    : 0
  const purchaserName = order?.purchaser_name || 'ZakTalks learner'
  const discountRows = [
    order?.first_purchase_discount_applied && { icon: FaPercent, label: 'First-purchase offer', value: 'Applied' },
    number(order?.points_to_spend) > 0 && { icon: FaCoins, label: 'Points redeemed', value: `${number(order.points_to_spend).toLocaleString()} points` },
    order?.coupon_applied && { icon: FaTags, label: 'Coupon', value: couponDescription(order) },
  ].filter(Boolean)

  const handleDownload = async () => {
    const target = document.getElementById(receiptId)
    if (!target || !order || downloading) return
    setDownloading(true)
    setDownloadError('')
    try {
      await downloadReceiptPdf(target, order)
    } catch (downloadFailure) {
      console.error('Unable to download purchase receipt:', downloadFailure)
      setDownloadError('The receipt could not be downloaded. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return createPortal(
    <div className={styles.learnerReceiptLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.learnerReceiptModal} role="dialog" aria-modal="true" aria-labelledby="learner-receipt-title">
        <header className={styles.learnerReceiptModalHeader}>
          <div><h2 id="learner-receipt-title">Receipt</h2><small>ZakTalks</small></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close purchase receipt"><FaTimes /></button>
        </header>

        {loading && <div className={styles.learnerReceiptLoading} role="status"><span /><span /><span /></div>}
        {!loading && error && <div className={styles.learnerReceiptError}><FaExclamationCircle /><div><strong>Unable to open this order</strong><p>{error}</p></div></div>}

        {!loading && order && <>
          <div className={styles.learnerReceiptScroll}>
            <article className={styles.learnerReceipt} id={receiptId}>
              <div className={styles.learnerReceiptBrand}>
                <div><strong>ZakTalks</strong><span>{order.order_reference}</span></div>
                <span className={`${styles.learnerPurchaseStatus} ${styles[`learnerPurchaseStatus${status.key}`]}`}><StatusIcon />{status.label}</span>
              </div>

              <div className={styles.learnerReceiptCourse}>
                <h3>{order.course?.title || 'Course purchase'}</h3>
              </div>

              <dl className={styles.learnerReceiptFacts}>
                <div><dt>Order date</dt><dd>{formatDate(order.completed_at || order.created_at)}</dd></div>
                <div><dt>Purchased by</dt><dd>{purchaserName}</dd></div>
                <div className={styles.learnerReceiptEmail}><dt>Email</dt><dd>{order.email}</dd></div>
              </dl>

              <section className={styles.learnerReceiptPricing}>
                <header><span>Order summary</span><FaReceipt /></header>
                <div><span>Course price</span><strong>{formatMoney(originalPrice)}</strong></div>
                {discountRows.map((row) => {
                  const Icon = row.icon
                  return <div className={styles.learnerReceiptDiscount} key={row.label}><span><Icon />{row.label}</span><strong>{row.value}</strong></div>
                })}
                {savings > 0 && <div className={styles.learnerReceiptSavings}><span>Total savings</span><strong>−{formatMoney(savings)}</strong></div>}
                <div className={styles.learnerReceiptTotal}><span>Amount paid</span><strong>{formatMoney(paidPrice)}</strong></div>
              </section>

            </article>
          </div>

          <div className={styles.learnerReceiptActions}>
            <div>{downloadError && <span>{downloadError}</span>}</div>
            <button type="button" onClick={handleDownload} disabled={downloading}><FaDownload />{downloading ? 'Preparing receipt...' : 'Download receipt'}</button>
          </div>
        </>}
      </section>
    </div>,
    document.body
  )
}

function PurchaseCard({ order, index, onOpen }) {
  const status = purchaseStatus(order)
  const StatusIcon = status.icon
  const originalPrice = order.original_price_cents
  const paidPrice = order.expected_amount_cents
  const saved = originalPrice !== null && paidPrice !== null
    ? Math.max(0, number(originalPrice) - number(paidPrice))
    : 0
  const benefits = [
    order.first_purchase_discount_applied && 'First-purchase offer',
    number(order.points_to_spend) > 0 && `${number(order.points_to_spend).toLocaleString()} points used`,
    order.coupon_applied && 'Coupon applied',
  ].filter(Boolean)

  return <article className={styles.learnerPurchaseCard} style={{ '--purchase-delay': `${Math.min(index, 10) * 55}ms` }}>
    <div className={styles.learnerPurchaseVisual}>
      {order.course?.logo_url
        ? <img src={order.course.logo_url} alt="" />
        : <span><FaBookOpen /></span>}
    </div>

    <div className={styles.learnerPurchaseMain}>
      <div className={styles.learnerPurchaseTopline}>
        <span className={`${styles.learnerPurchaseStatus} ${styles[`learnerPurchaseStatus${status.key}`]}`}><StatusIcon />{status.label}</span>
        <time dateTime={order.created_at}>{formatDate(order.completed_at || order.created_at)}</time>
      </div>
      <div className={styles.learnerPurchaseCopy}>
        <span>Course purchase</span>
        <h2>{order.course?.title || 'Course purchase'}</h2>
        <p>{status.detail}</p>
      </div>
      {benefits.length > 0 && <div className={styles.learnerPurchaseBenefits}>{benefits.map((benefit) => <span key={benefit}>{benefit.includes('points') ? <FaCoins /> : <FaTags />}{benefit}</span>)}</div>}
    </div>

    <div className={styles.learnerPurchasePrice}>
      <span>Amount paid</span>
      <strong>{formatMoney(paidPrice)}</strong>
      {saved > 0 && <small className={styles.learnerPurchaseSaving}><s>Original {formatMoney(originalPrice)}</s><span>You saved {formatMoney(saved)}</span></small>}
      {!saved && paidPrice !== null && <small>Recorded purchase total</small>}
      <button type="button" onClick={() => onOpen(order)}><FaEye />Order details</button>
    </div>
  </article>
}

export default function PurchaseHistoryDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/dashboard/purchases', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load purchase history.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [])

  const loadMore = async () => {
    if (!data?.nextCursor || loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const response = await fetch(`/api/dashboard/purchases?cursor=${encodeURIComponent(data.nextCursor)}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to load more purchases.')
      setData((current) => ({ ...body, rows: [...(current?.rows || []), ...(body.rows || [])] }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoadingMore(false)
    }
  }

  const openOrder = async (summary) => {
    setReceipt({ summary, order: null, loading: true, error: '' })

    try {
      const response = await fetch(`/api/dashboard/purchases/${summary.id}`, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to load this order.')
      setReceipt((current) => current?.summary.id === summary.id
        ? { ...current, order: body.order, loading: false }
        : current)
    } catch (requestError) {
      setReceipt((current) => current?.summary.id === summary.id
        ? { ...current, error: requestError.message, loading: false }
        : current)
    }
  }

  return <section className={styles.learnerPurchasesDashboard}>
    <header className={styles.learnerPurchasesIntro}>
      <div>
        <span>Purchase history</span>
        <h1>Your learning orders</h1>
        <p>A simple record of your course purchases, amounts paid, discounts, and current payment status.</p>
      </div>
      {number(data?.totalCount) > 0 && <div className={styles.learnerPurchaseCount}><FaReceipt /><span><strong>{number(data.totalCount)}</strong><small>{number(data.totalCount) === 1 ? 'order' : 'orders'} recorded</small></span></div>}
    </header>

    {loading && <PurchaseSkeleton />}

    {error && <div className={styles.learnerPurchaseError}><FaExclamationCircle /><div><strong>Purchase history unavailable</strong><p>{error}</p></div></div>}

    {!loading && !error && !data?.rows?.length && <div className={styles.learnerPurchaseEmpty}>
      <span><FaShoppingBag /></span>
      <h2>No purchases yet</h2>
      <p>When you purchase a course, its payment status and pricing will appear here.</p>
      <Link href="/courses">Discover courses</Link>
    </div>}

    {data?.rows?.length > 0 && <>
      <div className={styles.learnerPurchaseList}>{data.rows.map((order, index) => <PurchaseCard order={order} index={index} onOpen={openOrder} key={order.id} />)}</div>
      <div className={styles.learnerPurchaseFooter}>
        <span>Showing {data.rows.length} of {number(data.totalCount)} {number(data.totalCount) === 1 ? 'order' : 'orders'}</span>
        {data.hasMore
          ? <button type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading more...' : 'Show more purchases'}</button>
          : <small><FaHistory />Your full history is shown</small>}
      </div>
    </>}
    {receipt && <OrderReceiptModal {...receipt} onClose={() => setReceipt(null)} />}
  </section>
}
