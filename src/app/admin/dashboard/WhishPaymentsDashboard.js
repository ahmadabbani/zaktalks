'use client'
import { useState,useEffect,useCallback,useRef } from 'react'
import { createPortal } from 'react-dom'
import { FaCheck,FaTimes,FaSearch,FaSyncAlt,FaEnvelope,FaLock,FaCheckCircle,FaClock } from 'react-icons/fa'
import { getWhishOrders,reviewWhishOrder,reopenWhishOrder,retryWhishEmail } from './whish.actions'
import { whishReference } from '@/lib/payments/whish-config'
import { WhishIcon } from '@/components/PaymentMethodChoice'
import styles from './whish-payments.module.css'

const money=cents=>`$${(Number(cents||0)/100).toFixed(2)}`
const date=value=>value?new Date(value).toLocaleString(): '—'

function ReviewDialog({order,onClose,onSaved}) {
  const [amount,setAmount]=useState((order.quoted_amount_cents/100).toFixed(2))
  const [reference,setReference]=useState('')
  const [note,setNote]=useState('')
  const [verified,setVerified]=useState(false)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const dialog=useRef(null)
  useEffect(()=>{
    const previous=document.body.style.overflow,focus=document.activeElement
    document.body.style.overflow='hidden';dialog.current?.focus()
    const key=e=>{
      if(e.key==='Escape'&&!busy)onClose()
      if(e.key==='Tab') {
        const items=dialog.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')
        if(!items?.length)return
        if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items[items.length-1].focus()}
        else if(!e.shiftKey&&document.activeElement===items[items.length-1]){e.preventDefault();items[0].focus()}
      }
    }
    document.addEventListener('keydown',key)
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',key);focus?.focus()}
  },[busy,onClose])
  const submit=async action=>{
    if(action==='confirm'&&!verified){setError('Confirm that you verified this transfer in Whish.');return}
    if(action==='cancel'&&!note.trim()){setError('Add a reason before closing this request.');return}
    setBusy(true);setError('')
    try {
      const result=await reviewWhishOrder({id:order.id,action,amount,reference,note})
      if(result.error)setError(result.error)
      else onSaved()
    } catch {setError('The request could not be updated. Please try again.')}
    finally{setBusy(false)}
  }
  return createPortal(<div className={styles.overlay}>
    <section className={styles.dialog} ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="whish-review-title">
      <header><div><small>Okayness Request ID · {whishReference(order.id)}</small><h3 id="whish-review-title">Verify Whish Payment</h3></div><button className={styles.round} onClick={onClose} disabled={busy} aria-label="Close"><FaTimes/></button></header>
      <p><strong>{order.first_name} {order.last_name}</strong><br/>{order.email}<br/>{order.course_title}</p>
      <div className={styles.details}><span>Sender number<strong>{order.phone}</strong></span><span>Quoted amount<strong>{money(order.quoted_amount_cents)} USD</strong></span></div>
      <form onSubmit={e=>{e.preventDefault();submit('confirm')}}>
        <label>Actual Amount Received (USD)<input inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required disabled={busy}/></label>
        <label>Whish Transfer Reference<input value={reference} onChange={e=>setReference(e.target.value)} maxLength={160} required disabled={busy}/></label>
        <label>Admin Note<textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} disabled={busy} placeholder="Required if the amount differs or the request is closed"/></label>
        <label className={styles.verification}><input type="checkbox" role="switch" checked={verified} onChange={e=>setVerified(e.target.checked)} disabled={busy}/><span>I verified the transfer in Whish and matched it to this customer.</span></label>
        {error&&<p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}><button type="submit" className={styles.primary} disabled={busy||!verified}><FaCheck/>{busy?'Saving…':'Confirm Payment & Grant Access'}</button><button type="button" className={styles.secondary} onClick={()=>submit('cancel')} disabled={busy}>Close Request Without Access</button></div>
      </form>
    </section>
  </div>,document.body)
}

export default function WhishPaymentsDashboard() {
  const [status,setStatus]=useState('pending'),[search,setSearch]=useState(''),[page,setPage]=useState(0)
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState(null),[sending,setSending]=useState(''),[reopening,setReopening]=useState('')
  const [version,setVersion]=useState(0)
  const close=useCallback(()=>setSelected(null),[])
  useEffect(()=>{
    let active=true
    setLoading(true)
    const timer=setTimeout(()=>getWhishOrders({status,search,page}).then(result=>{if(active){setData(result);setError(result.error||'')}}).catch(()=>active&&setError('Requests could not be loaded.')).finally(()=>active&&setLoading(false)),200)
    return()=>{active=false;clearTimeout(timer)}
  },[status,search,page,version])
  const resend=async(id,kind)=>{
    setSending(`${id}:${kind}`);setError('')
    try{const result=await retryWhishEmail(id,kind);if(result.error)setError(result.error);setVersion(v=>v+1)}catch{setError('Unable to retry the email.')}
    finally{setSending('')}
  }
  const reopen=async id=>{
    setReopening(id);setError('')
    try {const result=await reopenWhishOrder(id);if(result.error)setError(result.error);else {setStatus('pending');setPage(0);setVersion(v=>v+1)}}
    catch {setError('The request could not be reopened. Please try again.')}
    finally{setReopening('')}
  }
  return <div className={styles.panel}>
    {data?.configuration&&(!data.configuration.enabled||!data.configuration.ready)&&<div className={styles.notice}><FaLock/><p>Whish checkout is not live. Set the recipient number and enable Whish payments before accepting requests. Current recipient: <strong>{data.configuration.recipientNumber}</strong></p></div>}
    <div className={styles.toolbar}><div className={styles.tabs}>{['pending','confirmed','cancelled','all'].map(value=><button type="button" key={value} aria-pressed={status===value} className={status===value?styles.active:''} onClick={()=>{setStatus(value);setPage(0)}}>{value==='pending'?'Awaiting Verification':value==='confirmed'?'Approved':value==='cancelled'?'Closed':'All Requests'}</button>)}</div><button className={styles.round} aria-label="Refresh requests" onClick={()=>setVersion(v=>v+1)}><FaSyncAlt/></button></div>
    <label className={styles.search}><FaSearch/><input placeholder="Search by email, course, or phone" aria-label="Search requests" value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/></label>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {loading?<div className={styles.empty} role="status">Loading Requests…</div>:!data?.rows?.length?<div className={styles.empty}>No matching requests.</div>:data.rows.map(order=>{
      const d=order.discounts||{}
      return <article className={styles.card} key={order.id}>
        <header><span className={styles.icon}><WhishIcon/></span><div><small>Okayness Request ID · {whishReference(order.id)} · {date(order.created_at)}</small><h3>{order.first_name} {order.last_name}</h3><a href={`mailto:${order.email}`}>{order.email}</a></div><span className={styles.status}>{order.status==='confirmed'?<FaCheckCircle/>:<FaClock/>}{order.status==='confirmed'?'Approved':order.status==='cancelled'?'Closed':'Pending'}</span></header>
        <h4>{order.course_title}</h4>
        <div className={styles.details}><span>Sender Number<strong>{order.phone}</strong></span><span>Quoted Price<strong>{money(order.quoted_amount_cents)} USD</strong></span><span>Amount Received<strong>{order.amount_received_cents===null?'Not confirmed':`${money(order.amount_received_cents)} USD`}</strong></span><span>Account<strong>{order.account?.password_set?'Password ready':'Setup pending'} · {order.account?.email_verified?'Email verified':'Email not verified'}</strong></span></div>
        <div className={styles.discounts}><span>Original: {money(order.original_price_cents)}</span>{d.promotion?.applied&&<span>{d.promotion.name}: −{money(d.promotion.discountCents)}</span>}{d.firstPurchase?.eligible&&<span>First purchase: −{money(d.firstPurchase.discountCents)}</span>}{order.points_to_spend>0&&<span>{order.points_to_spend} points: −{money(d.points?.discountCents)}</span>}{d.coupon?.valid&&<span>Coupon {d.coupon.couponCode}: −{money(d.coupon.discountCents)}</span>}</div>
        {order.status==='pending'&&<p className={styles.hint}>Selected benefits are not consumed until approval. Approval awards 1,000 purchase points.</p>}
        {order.reviewed_at&&<p className={styles.hint}>Reviewed {date(order.reviewed_at)} by {[order.reviewer?.first_name,order.reviewer?.last_name].filter(Boolean).join(' ')||'Administrator'}{order.transfer_reference&&` · Transfer ${order.transfer_reference}`}</p>}
        {order.admin_note&&<p>{order.admin_note}</p>}
        <div className={styles.deliveries}>{(order.status==='confirmed'?[...(order.is_guest?['password']:[]),'approved']:order.status==='pending'?['instructions',...(order.is_guest?['password']:[])]:[]).map(kind=>{
          const email=order.emails?.find(item=>item.kind===kind)
          return <div key={kind}><FaEnvelope/><span>{kind==='password'?'Account Setup':kind==='approved'?'Payment Confirmation':'Payment Instructions'}<small>{email?.state==='sent'?`Sent ${date(email.sent_at)}`:email?.state==='not_required'?'Already set up':email?.last_error||'Not sent yet'}</small></span>{!['sent','not_required'].includes(email?.state)&&<button type="button" className={styles.secondary} disabled={Boolean(sending)} onClick={()=>resend(order.id,kind)}>{sending===`${order.id}:${kind}`?'Sending…':'Retry Email'}</button>}</div>
        })}</div>
        {order.status==='pending'&&<div className={styles.actions}><button type="button" className={styles.primary} onClick={()=>setSelected(order)}><FaCheck/>Review & Grant Access</button></div>}
        {order.status==='cancelled'&&<div className={styles.actions}><button type="button" className={styles.secondary} disabled={Boolean(reopening)} onClick={()=>reopen(order.id)}><FaSyncAlt/>{reopening===order.id?'Reopening…':'Reopen Request'}</button></div>}
      </article>
    })}
    <div className={styles.actions}><button className={styles.secondary} disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page+1} · {data?.count||0} requests</span><button className={styles.secondary} disabled={loading||(page+1)*20>=(data?.count||0)} onClick={()=>setPage(p=>p+1)}>Next</button></div>
    {selected&&<ReviewDialog order={selected} onClose={close} onSaved={()=>{close();setVersion(v=>v+1)}}/>}
  </div>
}
