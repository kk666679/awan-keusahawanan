import { type NextRequest, NextResponse } from "next/server"
import { uploadFile, getNextProvider, reportProviderSuccess, reportProviderFailure } from "@/lib/cloud"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Token tidak disediakan" }, { status: 401 })
    }

    const user = await getCurrentUser(token)
    if (!user) {
      return NextResponse.json({ error: "Token tidak sah" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const provider = formData.get('provider') as string || getNextProvider()
    const bucketName = formData.get('bucketName') as string

    if (!file) {
      return NextResponse.json({ error: "Fail tidak disediakan" }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Attempt upload with failover and monitoring
    const providersToTry = [provider, ...['aws', 'azure', 'gcp'].filter(p => p !== provider)]
    let url: string | undefined
    let successfulProvider: string | undefined
    let lastError: Error | undefined

    for (const prov of providersToTry) {
      try {
        console.log(`Attempting upload to ${prov}...`)
        const startTime = Date.now()
        url = await uploadFile(buffer, file.name, prov as 'aws' | 'azure' | 'gcp', bucketName)
        const duration = Date.now() - startTime

        // Report success for monitoring
        reportProviderSuccess(prov as 'aws' | 'azure' | 'gcp')
        successfulProvider = prov

        console.log(`Upload to ${prov} successful in ${duration}ms`)

        // Log successful operation
        try {
          await fetch(`${request.nextUrl.origin}/api/cloud/logs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': request.headers.get("authorization") || '',
            },
            body: JSON.stringify({
              level: 'info',
              message: `File uploaded successfully to ${prov}`,
              provider: prov,
              operation: 'upload',
              metadata: {
                fileName: file.name,
                fileSize: file.size,
                duration,
                bucketName,
              },
            }),
          })
        } catch (logError) {
          console.warn('Failed to log upload success:', logError)
        }

        break
      } catch (error) {
        console.warn(`Upload to ${prov} failed:`, error)
        const err = error as Error
        lastError = err

        // Report failure for monitoring
        reportProviderFailure(prov as 'aws' | 'azure' | 'gcp')

        // Log failure
        try {
          await fetch(`${request.nextUrl.origin}/api/cloud/logs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': request.headers.get("authorization") || '',
            },
            body: JSON.stringify({
              level: 'error',
              message: `File upload failed to ${prov}: ${err.message}`,
              provider: prov,
              operation: 'upload',
              metadata: {
                fileName: file.name,
                fileSize: file.size,
                error: err.message,
              },
            }),
          })
        } catch (logError) {
          console.warn('Failed to log upload failure:', logError)
        }

        if (prov === providersToTry[providersToTry.length - 1]) {
          throw new Error(`All cloud providers failed. Last error: ${lastError.message}`)
        }
      }
    }

    if (!url) {
      throw new Error('Upload failed on all providers')
    }

    return NextResponse.json({
      url,
      provider: successfulProvider,
      message: 'File uploaded successfully'
    })
  } catch (error) {
    console.error("Cloud upload error:", error)
    return NextResponse.json({ error: "Ralat dalaman pelayan" }, { status: 500 })
  }
}
