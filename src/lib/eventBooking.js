import { isValidPhoneNumber } from 'libphonenumber-js/min'

export const EVENT_DELIVERY_OPTIONS = [
  'In person',
  'Online',
  'Hybrid',
]

export const EVENT_FORMAT_OPTIONS = [
  'Keynote',
  'Interactive workshop',
  'Corporate training',
  'Masterclass',
  'Panel',
  'Custom session',
  'Not sure yet',
]

export const EVENT_BUDGET_OPTIONS = [
  'Under USD 1,000',
  'USD 1,000 - 2,500',
  'USD 2,500 - 5,000',
  'USD 5,000 - 10,000',
  'USD 10,000+',
  'Let\'s discuss',
]

export const EVENT_BOOKING_INITIAL_VALUES = {
  organisation: '',
  contactName: '',
  contactRole: '',
  email: '',
  phone: '',
  eventDate: '',
  delivery: '',
  location: '',
  audience: '',
  attendance: '',
  topic: '',
  format: '',
  budget: '',
  context: '',
  website: '',
}

const textLength = (value) => String(value ?? '').trim().length

export function validateEventBookingField(name, value) {
  const cleanValue = String(value ?? '').trim()

  switch (name) {
    case 'organisation':
      if (!cleanValue) return 'Enter the organisation name.'
      if (cleanValue.length < 2) return 'Use at least 2 characters.'
      if (cleanValue.length > 120) return 'Keep this under 120 characters.'
      return ''
    case 'contactName':
      if (!cleanValue) return 'Enter the contact person.'
      if (cleanValue.length < 2) return 'Use at least 2 characters.'
      if (cleanValue.length > 100) return 'Keep this under 100 characters.'
      return ''
    case 'contactRole':
      if (!cleanValue) return 'Enter the contact person\'s role.'
      if (cleanValue.length < 2) return 'Use at least 2 characters.'
      if (cleanValue.length > 100) return 'Keep this under 100 characters.'
      return ''
    case 'email':
      if (!cleanValue) return 'Enter an email address.'
      if (cleanValue.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(cleanValue)) {
        return 'Enter a valid email address.'
      }
      return ''
    case 'phone': {
      if (!cleanValue) return 'Enter a phone number.'
      if (!isValidPhoneNumber(cleanValue)) {
        return 'Enter a valid phone number.'
      }
      return ''
    }
    case 'eventDate':
      if (!cleanValue) return 'Enter a date or preferred date range.'
      if (cleanValue.length > 120) return 'Keep this under 120 characters.'
      return ''
    case 'delivery':
      if (!EVENT_DELIVERY_OPTIONS.includes(cleanValue)) return 'Choose a delivery setting.'
      return ''
    case 'location':
      if (!cleanValue) return 'Enter the location or online platform.'
      if (cleanValue.length > 160) return 'Keep this under 160 characters.'
      return ''
    case 'audience':
      if (!cleanValue) return 'Tell us who will be in the room.'
      if (cleanValue.length > 180) return 'Keep this under 180 characters.'
      return ''
    case 'attendance': {
      if (!cleanValue) return 'Enter the expected attendance.'
      if (!/^\d{1,7}$/.test(cleanValue)) return 'Use a whole number.'
      const attendance = Number(cleanValue)
      if (attendance < 1 || attendance > 1000000) return 'Enter a number between 1 and 1,000,000.'
      return ''
    }
    case 'topic':
      if (!cleanValue) return 'Share the preferred topic or desired outcome.'
      if (cleanValue.length < 10) return 'Add a little more detail, at least 10 characters.'
      if (cleanValue.length > 600) return 'Keep this under 600 characters.'
      return ''
    case 'format':
      if (!EVENT_FORMAT_OPTIONS.includes(cleanValue)) return 'Choose a preferred format.'
      return ''
    case 'budget':
      if (!EVENT_BUDGET_OPTIONS.includes(cleanValue)) return 'Choose an available budget range.'
      return ''
    case 'context':
      if (cleanValue.length > 2000) return 'Keep this under 2,000 characters.'
      return ''
    default:
      return ''
  }
}

export function validateEventBooking(values) {
  const errors = {}

  Object.keys(EVENT_BOOKING_INITIAL_VALUES).forEach((name) => {
    if (name === 'website') return
    const error = validateEventBookingField(name, values?.[name])
    if (error) errors[name] = error
  })

  if (textLength(values?.website) > 0) errors.website = 'Unable to submit this request.'

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}
