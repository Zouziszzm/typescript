import { neonAuth } from "@/lib/auth/server";

export const { GET, POST, PUT, DELETE, PATCH } = neonAuth.handler();
