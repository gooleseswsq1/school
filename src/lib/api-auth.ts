import { NextRequest } from "next/server";
import { extractTokenFromHeader, verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export interface ApiAuthUser {
  id: string;
  email: string;
  role: string;
}

export async function getApiAuthUser(request: NextRequest): Promise<ApiAuthUser | null> {
  const headerToken = extractTokenFromHeader(request.headers.get("authorization"));
  const cookieToken = request.cookies.get("access_token")?.value || null;
  const token = headerToken || cookieToken;
  if (!token) return null;

  const decoded = verifyToken(token, "access");
  if (!decoded?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) return null;
  return user;
}
