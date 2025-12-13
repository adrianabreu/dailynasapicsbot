use anyhow::{Context, Result};
use chrono::{DateTime, NaiveDate, Utc};
use reqwest::Client;
use serde::{Deserialize, Deserializer, Serialize};
use std::env;
use std::process;
use teloxide::prelude::*;
use teloxide::types::{InputFile, ParseMode};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NasaMedia {
    title: String,
    #[serde(rename = "media_type")]
    media_type: String,
    url: String,
    #[serde(rename = "hdurl")]
    hdurl: Option<String>,
    explanation: String,
    #[serde(deserialize_with = "deserialize_date")]
    date: DateTime<Utc>,
}

fn deserialize_date<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    Ok(NaiveDate::parse_from_str(&s, "%Y-%m-%d")
        .map_err(serde::de::Error::custom)?
        .and_hms_opt(0, 0, 0)
        .ok_or_else(|| serde::de::Error::custom("Invalid date"))?
        .and_utc())
}

struct NasaBot {
    bot: Bot,
    channel: String,
    http_client: Client,
}

impl NasaBot {
    fn new(token: String, channel: String) -> Self {
        let bot = Bot::new(token);
        let http_client = Client::new();
        Self {
            bot,
            channel,
            http_client,
        }
    }

    fn parse_channel_id(&self) -> Result<ChatId> {
        if let Ok(id) = self.channel.parse::<i64>() {
            if id > 0 {
                eprintln!("Warning: Channel ID is positive ({}). Channel IDs are usually negative (e.g., -1001234567890). Make sure this is correct.", id);
            }
            Ok(ChatId(id))
        } else if self.channel.starts_with('@') {
            let username = self.channel.strip_prefix('@').unwrap_or(&self.channel);
            return Err(anyhow::anyhow!(
                "Channel username '@{}' not supported. Please use numeric channel ID.\n\nTo get your channel ID:\n1. Forward a message from your channel to @userinfobot\n2. Or use @RawDataBot in your channel\n3. Channel IDs are usually negative (e.g., -1001234567890)",
                username
            ));
        } else {
            Err(anyhow::anyhow!(
                "Invalid channel format: '{}'. Use numeric channel ID (e.g., -1001234567890).\n\nTo get your channel ID:\n1. Forward a message from your channel to @userinfobot\n2. Or use @RawDataBot in your channel",
                self.channel
            ))
        }
    }

    async fn send_media(&self, media: NasaMedia) -> Result<()> {
        let channel_id = self.parse_channel_id()?;
        
        match media.media_type.as_str() {
            "image" => {
                eprintln!("Sending picture media type: image");
                
                let photo_url = reqwest::Url::parse(&media.url)
                    .context("Invalid photo URL")?;
                
                self.bot
                    .send_photo(channel_id, InputFile::url(photo_url))
                    .caption(&media.title)
                    .await
                    .map_err(|e| {
                        if e.to_string().contains("ChatNotFound") {
                            anyhow::anyhow!(
                                "Chat not found. Channel ID: {}. Make sure:\n1. The bot is added as an administrator to the channel\n2. The channel ID is correct (format: -1001234567890)\n3. You can get the channel ID by forwarding a message from your channel to @userinfobot",
                                self.channel
                            )
                        } else {
                            anyhow::anyhow!("Failed to send photo: {}", e)
                        }
                    })?;
                
                if let Some(hd_url) = media.hdurl {
                    eprintln!("Retrieving HD picture");
                    let response = self.http_client
                        .get(&hd_url)
                        .send()
                        .await
                        .context("Failed to fetch HD image")?;
                    
                    if !response.status().is_success() {
                        eprintln!("Warning: HD image fetch returned status {}", response.status());
                    } else {
                        eprintln!("Sending HD picture as document");
                        let hd_url_parsed = reqwest::Url::parse(&hd_url)
                            .context("Invalid HD URL")?;
                        self.bot
                            .send_document(channel_id, InputFile::url(hd_url_parsed))
                            .await
                            .map_err(|e| {
                                if e.to_string().contains("ChatNotFound") {
                                    anyhow::anyhow!(
                                        "Chat not found when sending HD document. Channel ID: {}. Make sure the bot is added as an administrator to the channel.",
                                        self.channel
                                    )
                                } else {
                                    anyhow::anyhow!("Failed to send HD document: {}", e)
                                }
                            })?;
                    }
                }
                
                eprintln!("Sending explanation");
                self.bot
                    .send_message(channel_id, &media.explanation)
                    .parse_mode(ParseMode::Html)
                    .await
                    .map_err(|e| {
                        if e.to_string().contains("ChatNotFound") {
                            anyhow::anyhow!(
                                "Chat not found when sending explanation. Channel ID: {}. Make sure the bot is added as an administrator to the channel.",
                                self.channel
                            )
                        } else {
                            anyhow::anyhow!("Failed to send explanation: {}", e)
                        }
                    })?;
            }
            "video" => {
                eprintln!("Sending video media type: video");
                let first_message = format!("{} - {}", media.title, media.url);
                self.bot
                    .send_message(channel_id, &first_message)
                    .await
                    .map_err(|e| {
                        if e.to_string().contains("ChatNotFound") {
                            anyhow::anyhow!(
                                "Chat not found when sending video message. Channel ID: {}. Make sure the bot is added as an administrator to the channel.",
                                self.channel
                            )
                        } else {
                            anyhow::anyhow!("Failed to send video message: {}", e)
                        }
                    })?;
                
                self.bot
                    .send_message(channel_id, &media.explanation)
                    .parse_mode(ParseMode::Html)
                    .await
                    .map_err(|e| {
                        if e.to_string().contains("ChatNotFound") {
                            anyhow::anyhow!(
                                "Chat not found when sending explanation. Channel ID: {}. Make sure the bot is added as an administrator to the channel.",
                                self.channel
                            )
                        } else {
                            anyhow::anyhow!("Failed to send explanation: {}", e)
                        }
                    })?;
            }
            _ => {
                eprintln!("Unknown media type: {}", media.media_type);
                return Err(anyhow::anyhow!("Unsupported media type: {}", media.media_type));
            }
        }
        Ok(())
    }
}

async fn fetch_nasa_apod(api_key: &str, base_url: Option<&str>) -> Result<NasaMedia> {
    let base = base_url.unwrap_or("https://api.nasa.gov");
    let url = format!("{}/planetary/apod?api_key={}", base, api_key);
    let client = Client::new();
    
    eprintln!("Retrieving NASA image from: {}", url);
    let response = client
        .get(&url)
        .send()
        .await
        .context("Failed to fetch NASA APOD")?;
    
    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "NASA API returned error status: {}",
            response.status()
        ));
    }
    
    let media: NasaMedia = response
        .json()
        .await
        .context("Failed to parse NASA API response")?;
    
    Ok(media)
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    
    if let Err(e) = run().await {
        eprintln!("Error: {}", e);
        eprintln!("Caused by: {:?}", e.source());
        process::exit(1);
    }
    
    eprintln!("Bot execution completed successfully");
}

async fn run() -> Result<()> {
    let token = env::var("TELEGRAM_BOT_TOKEN")
        .context("TELEGRAM_BOT_TOKEN environment variable not set")?;
    let channel = env::var("TELEGRAM_CHANNEL")
        .context("TELEGRAM_CHANNEL environment variable not set")?;
    let api_key = env::var("NASA_API_KEY").unwrap_or_else(|_| "DEMO_KEY".to_string());
    
    eprintln!("Executing bot at: {}", chrono::Utc::now());
    
    let media = fetch_nasa_apod(&api_key, None).await?;
    let bot = NasaBot::new(token, channel);
    
    eprintln!("Sending media to telegram");
    bot.send_media(media).await?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::{Matcher, Server};
    use serde_json::json;

    #[tokio::test]
    async fn test_fetch_nasa_apod() {
        let mut server = Server::new_async().await;
        let mock_response = json!({
            "title": "Test Image",
            "media_type": "image",
            "url": "https://example.com/image.jpg",
            "hdurl": "https://example.com/image_hd.jpg",
            "explanation": "This is a test explanation",
            "date": "2024-01-01"
        });
        
        let _m = server
            .mock("GET", "/planetary/apod")
            .match_query(Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(serde_json::to_string(&mock_response).unwrap())
            .create_async()
            .await;
        
        let base_url = server.url();
        let media = fetch_nasa_apod("TEST_KEY", Some(&base_url)).await.unwrap();
        
        assert_eq!(media.title, "Test Image");
        assert_eq!(media.media_type, "image");
        assert_eq!(media.url, "https://example.com/image.jpg");
        assert!(media.hdurl.is_some());
        assert_eq!(media.hdurl.unwrap(), "https://example.com/image_hd.jpg");
    }

    #[tokio::test]
    async fn test_fetch_nasa_apod_video() {
        let mut server = Server::new_async().await;
        let mock_response = json!({
            "title": "Test Video",
            "media_type": "video",
            "url": "https://example.com/video.mp4",
            "explanation": "This is a test video explanation",
            "date": "2024-01-01"
        });
        
        let _m = server
            .mock("GET", "/planetary/apod")
            .match_query(Matcher::Any)
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(serde_json::to_string(&mock_response).unwrap())
            .create_async()
            .await;
        
        let base_url = server.url();
        let media = fetch_nasa_apod("TEST_KEY", Some(&base_url)).await.unwrap();
        
        assert_eq!(media.media_type, "video");
        assert_eq!(media.url, "https://example.com/video.mp4");
        assert!(media.hdurl.is_none());
    }
    
    #[tokio::test]
    async fn test_fetch_nasa_apod_error_handling() {
        let mut server = Server::new_async().await;
        let _m = server
            .mock("GET", "/planetary/apod")
            .match_query(Matcher::Any)
            .with_status(500)
            .create_async()
            .await;
        
        let base_url = server.url();
        let result = fetch_nasa_apod("TEST_KEY", Some(&base_url)).await;
        
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("error status"));
    }
    
    #[tokio::test]
    async fn test_channel_id_parsing() {
        let bot = NasaBot::new("test_token".to_string(), "123456789".to_string());
        let channel_id = bot.parse_channel_id().unwrap();
        assert_eq!(channel_id, ChatId(123456789));
        
        let bot2 = NasaBot::new("test_token".to_string(), "-1001234567890".to_string());
        let channel_id2 = bot2.parse_channel_id().unwrap();
        assert_eq!(channel_id2, ChatId(-1001234567890));
        
        let bot3 = NasaBot::new("test_token".to_string(), "@testchannel".to_string());
        assert!(bot3.parse_channel_id().is_err());
    }

    #[tokio::test]
    async fn test_nasa_media_deserialization() {
        let json = r#"{
            "title": "Test",
            "media_type": "image",
            "url": "https://example.com/img.jpg",
            "hdurl": "https://example.com/img_hd.jpg",
            "explanation": "Test explanation",
            "date": "2024-01-01"
        }"#;
        
        let media: NasaMedia = serde_json::from_str(json).unwrap();
        assert_eq!(media.title, "Test");
        assert_eq!(media.media_type, "image");
        assert!(media.hdurl.is_some());
    }
}
