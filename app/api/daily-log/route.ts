// app/api/daily-log/route.ts
import { connectToDatabase } from "@/lib/db/mongodb";
import { DailyLog } from "@/lib/db/models/daily-log";
export async function GET() {
  await connectToDatabase();

  const logs = await DailyLog.find();
  return Response.json(logs);
}