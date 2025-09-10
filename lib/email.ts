import crypto from "crypto"

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function sendVerificationEmail(email: string, token: string, name: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`
  
  // In production, use actual email service (SendGrid, AWS SES, etc.)
  console.log(`
    Verification Email for ${name} (${email}):
    Click to verify: ${verificationUrl}
    Token: ${token}
  `)
  
  return { success: true }
}