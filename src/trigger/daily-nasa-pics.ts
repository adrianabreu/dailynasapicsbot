import { logger, schedules } from "@trigger.dev/sdk";
import { fetchNasaApod } from "../nasa";
import { normalizeChannel, sendMediaToTelegram } from "../telegram";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable not set`);
  }
  return value;
}

export const dailyNasaPics = schedules.task({
  id: "daily-nasa-pics",
  cron: {
    pattern: "0 8 * * *",
    timezone: "Europe/Madrid",
    environments: ["PRODUCTION"],
  },
  maxDuration: 300,
  run: async () => {
    const token = requiredEnv("TELEGRAM_BOT_TOKEN");
    const channel = requiredEnv("TELEGRAM_CHANNEL");
    const apiKey = process.env.NASA_API_KEY ?? "DEMO_KEY";

    logger.log("Fetching NASA APOD");
    const media = await fetchNasaApod(apiKey);
    logger.log("Sending media to Telegram", {
      title: media.title,
      mediaType: media.media_type,
      date: media.date,
      channel: normalizeChannel(channel),
    });

    await sendMediaToTelegram(token, channel, media);

    return {
      title: media.title,
      mediaType: media.media_type,
      date: media.date,
    };
  },
});
