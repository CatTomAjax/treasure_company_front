import { proxyBackend } from '@/lib/backend-proxy';
const handler=(request:Request)=>proxyBackend(request);
export const GET=handler;
export const POST=handler;
export const PUT=handler;
export const PATCH=handler;
export const DELETE=handler;
export const HEAD=handler;
export const OPTIONS=handler;
