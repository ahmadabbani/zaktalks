'use client'
import InternationalPhoneField from './InternationalPhoneField'
import styles from './whish-checkout.module.css'

export default function WhishCheckoutFields({phone,onChange,disabled,error}) {
  return <div className={styles.whishFields}>
    <div><strong>Pay With Whish To Whish</strong><p>We will email you the recipient number and payment instructions. Access is activated within 48 hours after we receive and verify your transfer.</p></div>
    <div className={styles.phone}><label htmlFor="whish-phone">Your Whish / Mobile Number</label>
      <InternationalPhoneField id="whish-phone" name="whish_phone" value={phone} onChange={onChange} disabled={disabled} error={error} describedBy="whish-phone-error"/>
      <small>Use the number you will send the transfer from, including country code.</small>
      {error&&<p className={styles.error} id="whish-phone-error" role="alert">{error}</p>}
    </div>
  </div>
}
