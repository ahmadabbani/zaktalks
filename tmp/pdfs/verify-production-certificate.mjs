import { readFile, writeFile } from 'node:fs/promises'
import { generateCourseCertificatePdf } from '../../src/lib/certificates/generate-certificate.mjs'

const source = 'C:/Users/User/Downloads/Okayness Certification ICD.pdf'
const output = 'output/pdf/okayness-certificate-production-engine.pdf'

const pdf = await generateCourseCertificatePdf({
  templateBytes: await readFile(source),
  learnerName: 'Zak Dakkash',
  courseTitle: 'Interpersonal Communication Dynamics',
  completedAt: '2026-09-19T10:00:00.000Z',
})

await writeFile(output, pdf)
console.log(output)
