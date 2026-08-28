import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const requestHeaders = await headers()
  const country = requestHeaders.get('x-vercel-ip-country')
    || requestHeaders.get('cf-ipcountry')
    || ''

  const normalizedCountry = /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : null

  return NextResponse.json(
    { country: normalizedCountry },
    { headers: { 'Cache-Control': 'private, max-age=86400' } }
  )
}
