type TelegramResponse = {
  ok: boolean;
  description?: string;
};

export function normalizeChannel(channel: string): string {
  const trimmed = channel.trim();
  if (trimmed.startsWith("@") || /^-?\d+$/.test(trimmed)) {
    return trimmed;
  }
  return `@${trimmed}`;
}

const DIRECT_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];

function isDirectVideoUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

function telegramErrorMessage(channel: string, description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("chat not found") || lower.includes("not a member of the channel")) {
    return `${description}. Channel: ${channel}. Add the bot from TELEGRAM_BOT_TOKEN as a channel admin with Post Messages, and set TELEGRAM_CHANNEL to @channelusername or a numeric ID like -1001234567890.`;
  }
  return description;
}

async function telegramCall(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as TelegramResponse;

  if (!data.ok) {
    const description = data.description ?? `Telegram ${method} failed`;
    throw new Error(telegramErrorMessage(String(body.chat_id), description));
  }
}

async function sendFile(
  token: string,
  channel: string,
  method: "sendDocument" | "sendVideo",
  field: "document" | "video",
  fileUrl: string,
  fileResponse: Response,
  extra: Record<string, string> = {}
): Promise<void> {
  const filename = new URL(fileUrl).pathname.split("/").pop() || "nasa-apod-file";
  const form = new FormData();
  form.append("chat_id", channel);
  form.append(field, new Blob([await fileResponse.arrayBuffer()]), filename);
  for (const [key, value] of Object.entries(extra)) {
    form.append(key, value);
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    body: form,
  });
  const data = (await response.json()) as TelegramResponse;

  if (!data.ok) {
    const description = data.description ?? `Telegram ${method} failed`;
    throw new Error(telegramErrorMessage(channel, description));
  }
}

export async function sendMediaToTelegram(
  token: string,
  channel: string,
  media: {
    title: string;
    media_type: string;
    url: string;
    hdurl?: string;
    explanation: string;
  }
): Promise<void> {
  channel = normalizeChannel(channel);

  switch (media.media_type) {
    case "image": {
      await telegramCall(token, "sendPhoto", {
        chat_id: channel,
        photo: media.url,
        caption: media.title,
      });

      if (media.hdurl) {
        const fileResponse = await fetch(media.hdurl);
        if (!fileResponse.ok) {
          console.warn(`HD image fetch returned status ${fileResponse.status}`);
        } else {
          await sendFile(token, channel, "sendDocument", "document", media.hdurl, fileResponse);
        }
      }

      await telegramCall(token, "sendMessage", {
        chat_id: channel,
        text: media.explanation,
        parse_mode: "HTML",
      });
      return;
    }
    case "video": {
      if (isDirectVideoUrl(media.url)) {
        const fileResponse = await fetch(media.url);
        if (!fileResponse.ok) {
          throw new Error(`Video fetch returned status ${fileResponse.status}`);
        }
        await sendFile(token, channel, "sendVideo", "video", media.url, fileResponse, {
          caption: media.title,
          supports_streaming: "true",
        });
      } else {
        await telegramCall(token, "sendMessage", {
          chat_id: channel,
          text: `${media.title} - ${media.url}`,
        });
      }
      await telegramCall(token, "sendMessage", {
        chat_id: channel,
        text: media.explanation,
        parse_mode: "HTML",
      });
      return;
    }
    default:
      throw new Error(`Unsupported media type: ${media.media_type}`);
  }
}
