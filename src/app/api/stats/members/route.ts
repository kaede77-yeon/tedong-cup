import { handle } from "@/server/api";
import { getMemberStatsList } from "@/server/repo";

export async function GET() {
  return handle(() => getMemberStatsList());
}
