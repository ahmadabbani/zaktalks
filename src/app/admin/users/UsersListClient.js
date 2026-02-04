'use client'

import { useState, useEffect } from 'react'
import { FaChevronLeft, FaChevronRight, FaCheckCircle, FaTimesCircle, FaTag, FaCoins, FaGift } from 'react-icons/fa'
import styles from './admin-users.module.css'

const USERS_PER_PAGE = 10

export default function UsersListClient({ users }) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE)
  const startIndex = (currentPage - 1) * USERS_PER_PAGE
  const endIndex = startIndex + USERS_PER_PAGE
  const currentUsers = users.slice(startIndex, endIndex)

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentPage])

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  return (
    <>
      <div className={styles.usersGrid}>
        {currentUsers.map(user => (
          <div key={user.id} className={styles.userCard}>
            {/* User Header */}
            <div className={styles.userHeader}>
              <div className={styles.userInfo}>
                <h3>{user.first_name} {user.last_name}</h3>
                <p>{user.email}</p>
              </div>
              <div className={styles.userBadges}>
                {user.email_verified ? (
                  <span className={`${styles.badge} ${styles.badgeVerified}`}>
                    Verified
                  </span>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeNotVerified}`}>
                    Not Verified
                  </span>
                )}
                <span className={`${styles.badge} ${styles.badgeRole}`}>
                  {user.role || 'user'}
                </span>
              </div>
            </div>

            {/* Purchases Section */}
            <div className={styles.purchasesSection}>
              <h4 className={styles.sectionTitle}>
                Purchases ({user.completedPurchases.length})
              </h4>
              
              {user.completedPurchases.length === 0 ? (
                <div className={styles.noPurchases}>
                  No completed purchases yet
                </div>
              ) : (
                <div className={styles.purchasesList}>
                  {user.completedPurchases.map(purchase => {
                    const originalPrice = (purchase.original_price_cents / 100).toFixed(2)
                    const amountPaid = (purchase.amount_paid_cents / 100).toFixed(2)
                    const discountAmount = (purchase.discount_applied_cents / 100).toFixed(2)
                    const hasDiscount = purchase.discount_applied_cents > 0

                    const pointsDiscount = !purchase.first_purchase_discount_applied && !purchase.coupon_id && hasDiscount
                    
                    return (
                      <div key={purchase.id} className={styles.purchaseItem}>
                        <div className={styles.purchaseHeader}>
                          <span className={styles.courseTitle}>
                            {purchase.course?.title || 'Unknown Course'}
                          </span>
                          <span className={styles.purchaseAmount}>
                            ${amountPaid}
                          </span>
                        </div>

                        {hasDiscount && (
                          <div className={styles.discountsInfo}>
                            <div className={styles.discountRow}>
                              <span className={styles.discountLabel}>
                                Original Price:
                              </span>
                              <span className={`${styles.discountValue} ${styles.originalPrice}`}>
                                ${originalPrice}
                              </span>
                            </div>

                            {purchase.first_purchase_discount_applied && (
                              <div className={styles.discountRow}>
                                <span className={styles.discountLabel}>
                                  <FaGift /> First Purchase (10%)
                                </span>
                                <span className={styles.discountValue}>
                                  -${((purchase.original_price_cents * 0.10) / 100).toFixed(2)}
                                </span>
                              </div>
                            )}

                            {purchase.coupon && (
                              <div className={styles.discountRow}>
                                <span className={styles.discountLabel}>
                                  <FaTag /> Coupon: {purchase.coupon.code} ({purchase.coupon.discount_type === 'percentage' ? `${purchase.coupon.discount_value}%` : `$${purchase.coupon.discount_value}`})
                                </span>
                                <span className={styles.discountValue}>
                                  -${purchase.coupon.discount_type === 'percentage' 
                                    ? ((purchase.original_price_cents * (purchase.coupon.discount_value / 100)) / 100).toFixed(2)
                                    : purchase.coupon.discount_value}
                                </span>
                              </div>
                            )}

                            {pointsDiscount && (
                              <div className={styles.discountRow}>
                                <span className={styles.discountLabel}>
                                  <FaCoins /> Points Used
                                </span>
                                <span className={styles.discountValue}>
                                  -${discountAmount}
                                </span>
                              </div>
                            )}

                            <div className={styles.discountRow} style={{ borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                              <span className={styles.discountLabel}>
                                <strong>Total Discount:</strong>
                              </span>
                              <span className={styles.discountValue}>
                                <strong>-${discountAmount}</strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={styles.paginationButton}
          >
            <FaChevronLeft /> Previous
          </button>
          
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
          >
            Next <FaChevronRight />
          </button>
        </div>
      )}
    </>
  )
}
