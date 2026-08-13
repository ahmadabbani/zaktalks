export const CONTACT_SOURCE_OPTIONS = [
  'Instagram',
  'YouTube',
  'TikTok',
  'Facebook',
  'ZakTalks podcast',
  'An event or workshop',
  'A friend or colleague',
  'Search engine',
  'Other',
]

export const CONTACT_INITIAL_VALUES = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  source: '',
  message: '',
  website: '',
}

export function validateContactField(name, value) {
  const cleanValue = String(value ?? '').trim()

  switch (name) {
    case 'firstName':
      if (!cleanValue) return 'Enter your first name.'
      if (cleanValue.length < 2) return 'Use at least 2 characters.'
      if (cleanValue.length > 80) return 'Keep this under 80 characters.'
      return ''
    case 'lastName':
      if (!cleanValue) return 'Enter your last name.'
      if (cleanValue.length < 2) return 'Use at least 2 characters.'
      if (cleanValue.length > 80) return 'Keep this under 80 characters.'
      return ''
    case 'email':
      if (!cleanValue) return 'Enter your email address.'
      if (cleanValue.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(cleanValue)) {
        return 'Enter a valid email address.'
      }
      return ''
    case 'phone': {
      if (!cleanValue) return 'Enter your phone number.'
      const digits = cleanValue.replace(/\D/g, '').length
      if (!/^[+\d().\-\s]+$/.test(cleanValue) || digits < 7 || digits > 15) {
        return 'Enter a valid phone number.'
      }
      return ''
    }
    case 'source':
      if (!CONTACT_SOURCE_OPTIONS.includes(cleanValue)) return 'Choose how you heard about us.'
      return ''
    case 'message':
      if (!cleanValue) return 'Enter your message.'
      if (cleanValue.length < 15) return 'Please add a little more detail, at least 15 characters.'
      if (cleanValue.length > 2500) return 'Keep this under 2,500 characters.'
      return ''
    default:
      return ''
  }
}

export function validateContactForm(values) {
  const errors = {}

  Object.keys(CONTACT_INITIAL_VALUES).forEach((name) => {
    if (name === 'website') return
    const error = validateContactField(name, values?.[name])
    if (error) errors[name] = error
  })

  if (String(values?.website ?? '').trim()) errors.website = 'Unable to submit this message.'

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
  }
}

