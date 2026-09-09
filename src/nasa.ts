export type NasaMedia = {
  title: string;
  media_type: string;
  url: string;
  hdurl?: string;
  explanation: string;
  date: string;
};

export async function fetchNasaApod(
  apiKey: string,
  baseUrl = "https://api.nasa.gov"
): Promise<NasaMedia> {
  const url = `${baseUrl}/planetary/apod?api_key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`NASA API returned error status: ${response.status}`);
  }

  return (await response.json()) as NasaMedia;
}
