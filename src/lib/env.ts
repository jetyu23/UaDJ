export type EnvStatus = {
  clientId: boolean;
  baseUrl: boolean;
  rapidApi: boolean;
  authReady: boolean;
};

export function envStatus(): EnvStatus {
  const clientId = !!process.env.SPOTIFY_CLIENT_ID;
  const baseUrl = !!process.env.NEXT_PUBLIC_BASE_URL;
  const rapidApi = !!process.env.RAPIDAPI_KEY;
  return { clientId, baseUrl, rapidApi, authReady: clientId && baseUrl };
}
