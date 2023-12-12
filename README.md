# Neil's Music Tools

Here are some mini tools for music apps that I personally find useful in day-to-day life.

## Spotify Library Album Sort

Provides some more ways to sort albums in your Spotify library.

![Spotify Library Album Sort](https://github.com/neilmenon/music-tools/assets/47338272/80ab657d-9222-45f3-94cf-0bd2715062a4)

- **Why:** I wanted to pick albums from my library that would take the time it took to do a task (e.g. washing dishes, driving). Spotify doesn't have a way to sort your albums by duration, among other relevant fields.
- **Under the hood**: Angular, Spotify API, and `localStorage`.

## Anniversify

Notifies you when an album in your Spotify Library has an anniversary. Features email notifications, push notifications, and a Spotify playlist updated daily.

![Anniversify Settings Page](https://github.com/neilmenon/music-tools/assets/47338272/5975be06-f85c-4610-82a6-f5d77db4813d)


- **Why:** Not wanting to forget albums in my library + a bit of love of nostalgia.
- **Under the hood**: Angular, Spotify API, and AWS (Lambda, EventBridge Scheduler, DynamoDB, SES, API Gateway, S3).
