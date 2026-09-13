import { isValidPhoneNumber } from 'libphonenumber-js/min'

export const LOCATION_OPTIONS = ['Lebanon', 'GCC', 'Europe', 'Other']
export const ROLE_OPTIONS = [
  'Entrepreneur / business owner',
  'Executive / manager / team leader',
  'Professional in transition',
  'Freelancer / consultant',
  'Other',
]
export const COMMITMENT_OPTIONS = [
  'Yes, I am ready to make the time',
  'Possibly, depending on the final schedule',
  'I would need more information first',
]
export const PARTICIPATION_OPTIONS = [
  'Hybrid: online and in-person',
  'Online only, if available',
  'In person, if available',
  'I am open to either format',
]
export const THEME_OPTIONS = [
  'Self-awareness and identity',
  'Emotional intelligence',
  'Personal leadership',
  'Resilience and recovery from difficult experiences',
  'Communication and relationships',
  'Decision-making',
  'Meaning, Values, and Purpose',
  'Living a Balancing life',
]
export const SOURCE_OPTIONS = [
  'ZakTalks podcast',
  'Instagram',
  'LinkedIn',
  'Friend / referral',
  'Event or workshop',
  'Other',
]

export const WAITING_LIST_INITIAL_VALUES = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  role: '',
  interest: '',
  goal: '',
  commitment: '',
  participation: '',
  waitingListAcknowledged: false,
  themes: [],
  source: '',
  contactConsent: false,
  additionalNotes: '',
  website: '',
}

export function validateWaitingListField(name, value) {
  const text = typeof value === 'string' ? value.trim() : ''

  switch (name) {
    case 'fullName':
      if (!text) return 'Enter your full name.'
      if (text.length < 2) return 'Use at least 2 characters.'
      if (text.length > 120) return 'Keep your name under 120 characters.'
      return ''
    case 'email':
      if (!text) return 'Enter your email address.'
      return text.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(text)
        ? '' : 'Enter a valid email address.'
    case 'phone':
      if (!text) return 'Enter your mobile or WhatsApp number.'
      return isValidPhoneNumber(text) ? '' : 'Enter a valid number with country code.'
    case 'location':
      return LOCATION_OPTIONS.includes(text) ? '' : 'Choose where you are currently based.'
    case 'role':
      return ROLE_OPTIONS.includes(text) ? '' : 'Choose what best describes you.'
    case 'interest':
      if (!text) return 'Tell us what interested you in the program.'
      if (text.length < 10) return 'Please add a little more detail.'
      return text.length <= 2000 ? '' : 'Keep this under 2,000 characters.'
    case 'goal':
      if (!text) return 'Tell us what you would like to gain.'
      if (text.length < 10) return 'Please add a little more detail.'
      return text.length <= 2000 ? '' : 'Keep this under 2,000 characters.'
    case 'commitment':
      return COMMITMENT_OPTIONS.includes(text) ? '' : 'Choose your availability for live sessions.'
    case 'participation':
      return PARTICIPATION_OPTIONS.includes(text) ? '' : 'Choose how you would prefer to participate.'
    case 'waitingListAcknowledged':
      return value === true ? '' : 'Please confirm that you understand this is a waiting list.'
    case 'themes':
      if (value == null) return ''
      return Array.isArray(value) && value.every((theme) => THEME_OPTIONS.includes(theme))
        && new Set(value).size === value.length ? '' : 'Choose from the listed themes only.'
    case 'source':
      return !text || SOURCE_OPTIONS.includes(text) ? '' : 'Choose an option from the list.'
    case 'contactConsent':
      return value === true ? '' : 'Please confirm that we may contact you about the next cohort.'
    case 'additionalNotes':
      return text.length <= 2000 ? '' : 'Keep this under 2,000 characters.'
    default:
      return ''
  }
}

export function validateWaitingList(values) {
  const errors = {}
  for (const name of Object.keys(WAITING_LIST_INITIAL_VALUES)) {
    if (name === 'website') continue
    const error = validateWaitingListField(name, values?.[name])
    if (error) errors[name] = error
  }
  if (String(values?.website ?? '').trim()) errors.website = 'Unable to submit this request.'
  return { errors, isValid: Object.keys(errors).length === 0 }
}
