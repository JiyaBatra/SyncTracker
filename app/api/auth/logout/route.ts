import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db/mongodb"
import { User } from "@/lib/db/models"
import { getAuthTokens, clearAuthCookies, verifyAccessToken } from "@/lib/auth"

export async function POST() {
  try {
    const { accessToken, refreshToken } = await getAuthTokens()

    if (accessToken) {
      const payload = await verifyAccessToken(accessToken)
      
      if (payload && refreshToken) {
        await connectToDatabase()
        
        // Remove refresh token from user's stored tokens
        await User.updateOne(
          { _id: payload.userId },
          { $pull: { refreshTokens: { token: refreshToken } } }
        )
      }
    }

    await clearAuthCookies()

    return NextResponse.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    // Still clear cookies even if there's an error
    await clearAuthCookies()
    return NextResponse.json({ message: "Logged out" })
  }
}
