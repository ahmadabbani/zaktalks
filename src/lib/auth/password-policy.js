export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 72

export const PASSWORD_REQUIREMENTS = [
  {
    key: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    key: 'lowercase',
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    key: 'uppercase',
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    key: 'number',
    label: 'One number',
    test: (password) => /[0-9]/.test(password),
  },
  {
    key: 'symbol',
    label: 'One special character',
    test: (password) => /[^A-Za-z0-9\s]/.test(password),
  },
]

export function passwordChecks(value) {
  const password = typeof value === 'string' ? value : ''

  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    key: requirement.key,
    label: requirement.label,
    met: requirement.test(password),
  }))
}

export function passwordStrength(value) {
  const password = typeof value === 'string' ? value : ''
  const checks = passwordChecks(password)
  const metCount = checks.filter((check) => check.met).length
  const tooLong = password.length > PASSWORD_MAX_LENGTH

  if (!password) {
    return { label: 'Enter a password', level: 0, tone: 'empty', checks, tooLong }
  }

  if (metCount === PASSWORD_REQUIREMENTS.length && !tooLong) {
    return { label: 'Strong password', level: 3, tone: 'strong', checks, tooLong }
  }

  if (metCount >= 3) {
    return { label: 'Getting stronger', level: 2, tone: 'medium', checks, tooLong }
  }

  return { label: 'Weak password', level: 1, tone: 'weak', checks, tooLong }
}

export function validateNewPassword(value) {
  const password = typeof value === 'string' ? value : ''

  if (!password) return 'Password is required.'
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`
  }

  const missing = passwordChecks(password).filter((check) => !check.met)
  if (!missing.length) return null

  return `Use ${PASSWORD_MIN_LENGTH}+ characters with uppercase, lowercase, a number, and a special character.`
}

export function isStrongPassword(value) {
  return validateNewPassword(value) === null
}
