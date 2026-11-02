import { BUILD_INFO } from '@/lib/build-info';
export async function GET(){return Response.json({...BUILD_INFO,service:'frontend'},{headers:{'Cache-Control':'no-store, max-age=0'}});}
