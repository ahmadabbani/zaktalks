'use client'
import { useEffect,useRef,useState } from 'react'
import { createPortal } from 'react-dom'
import { FaTimes,FaArrowRight } from 'react-icons/fa'
import { isValidPhoneNumber } from 'libphonenumber-js'
import WhishCheckoutFields from './WhishCheckoutFields'
import styles from './whish-checkout.module.css'

export default function WhishGuestModal({courseName,pricing,onClose,onConfirm,loading,error}) {
  const [phone,setPhone]=useState('')
  const [phoneError,setPhoneError]=useState('')
  const dialog=useRef(null)
  useEffect(()=>{
    const previous=document.body.style.overflow
    const previousFocus=document.activeElement
    document.body.style.overflow='hidden'
    dialog.current?.focus()
    const key=(e)=>{
      if(e.key==='Escape'&&!loading)onClose()
      if(e.key==='Tab') {
        const items=dialog.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')
        if(!items?.length)return
        const first=items[0],last=items[items.length-1]
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    }
    document.addEventListener('keydown',key)
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',key);previousFocus?.focus()}
  },[loading,onClose])
  const confirm=()=>{
    if(!isValidPhoneNumber(phone)){setPhoneError('Enter a valid phone number including country code.');return}
    onConfirm(phone)
  }
  const money=v=>`$${(Number(v||0)/100).toFixed(2)}`
  return createPortal(<div className={styles.overlay} onMouseDown={e=>e.target===e.currentTarget&&!loading&&onClose()}>
    <section className={styles.modal} ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="whish-title">
      <header><div><small>Whish Payment Request</small><h2 id="whish-title">One More Detail</h2></div><button type="button" aria-label="Close" onClick={onClose} disabled={loading}><FaTimes/></button></header>
      <h3>{courseName}</h3>
      <div className={styles.summary}>
        {pricing?.promotion?.applied&&<p><span>{pricing.promotion.name}</span><strong>−{money(pricing.promotion.discountCents)}</strong></p>}
        {pricing?.firstPurchase?.eligible&&<p><span>First-purchase offer</span><strong>−{money(pricing.firstPurchase.discountCents)}</strong></p>}
        {pricing?.coupon?.valid&&<p><span>Coupon {pricing.coupon.couponCode}</span><strong>−{money(pricing.coupon.discountCents)}</strong></p>}
        <p><span>Amount To Transfer</span><strong>{money(pricing?.finalPrice)} USD</strong></p>
      </div>
      <WhishCheckoutFields phone={phone} onChange={v=>{setPhone(v);setPhoneError('')}} disabled={loading} error={phoneError}/>
      {error&&<p className={styles.error} role="alert">{error}</p>}
      <button type="button" className={styles.primary} onClick={confirm} disabled={loading}>{loading?'Saving Your Request…':'Send Payment Instructions'}<FaArrowRight/></button>
    </section>
  </div>,document.body)
}
