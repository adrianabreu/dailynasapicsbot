## Daily Nasa Pics

Every day NASA publishes a photo through its open api. 
Since I really like those images and I usually share them with my friends I decided to create this bot.

It justs download a JSON through the api once per day (using a cron trigger for the azure function), and
then sends: The title, the normal pic as photo, the hd pic as a document to a telegram channel.


## Pictures

![Live bot](imgs/live.png)
![Live bot 2](imgs/live2.png)

## Like it?

[Join the telegram channel](https://telegram.me/dailynasapictures) **and star this repo!**

## Usage

Setup a new function on your azure instance and deploy the code using the params: *token* and *channelName*.

## License 

MIT
