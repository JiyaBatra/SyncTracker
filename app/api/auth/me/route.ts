import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User } from "@/lib/db/models"
import { getAuthTokens, verifyAccessToken, verifyRefreshToken, createAccessToken, setAuthCookies } from "@/lib/auth"
import { decrypt } from "@/lib/encryption"

export async function GET() {
  try {
    const { accessToken, refreshToken } = await getAuthTokens()

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    let payload = accessToken ? await verifyAccessToken(accessToken) : null

    // If access token is invalid/expired, try refresh token
    if (!payload && refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken)
      
      if (refreshPayload) {
        await connectToDatabase()
        
        // Verify refresh token exists in database
        const user = await User.findOne({
          _id: refreshPayload.userId,
          "refreshTokens.token": refreshToken,
        })

        if (user) {
          // Create new access token
          const newAccessToken = await createAccessToken({
            userId: refreshPayload.userId,
            email: refreshPayload.email,
            mfaVerified: true,
          })

          await setAuthCookies(newAccessToken, refreshToken)
          payload = refreshPayload
        }
      }
    }

    if (!payload) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    await connectToDatabase()
    const user = await User.findById(payload.userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Decrypt user data
    const decryptedName = user.profile.name ? await decrypt(user.profile.name) : null

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: payload.email,
        name: decryptedName,
        mfaEnabled: user.mfaEnabled,
        onboardingComplete: user.profile.onboardingComplete,
        averageCycleLength: user.profile.averageCycleLength,
        averagePeriodLength: user.profile.averagePeriodLength,
      },
    })
  } catch (error) {
    console.error("Auth check error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
  }
}
