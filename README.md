# Neil's Music Tools

Here are some mini tools for music apps that I personally find useful in day-to-day life.

## Spotify Library Album Sort

Provides some more ways to sort albums in your Spotify library.

![tools neilmenon com_spotify-album-sort](https://github.com/neilmenon/music-tools/assets/47338272/80ab657d-9222-45f3-94cf-0bd2715062a4)

- **Why:** I wanted to pick albums from my that would take the time it took to do a task (e.g. washing dishes, driving). Spotify doesn't have a way to sort your albums by duration.
- **Under the hood**: Angular, Spotify API, and `localStorage`.

## Anniversify

Notifies you when an album in your Spotify Library has an anniversary.

Email notifications             |  Spotify playlist
:-------------------------:|:-------------------------:
![Email notifications](https://github.com/neilmenon/music-tools/assets/47338272/62228baa-4358-4321-b1cd-aca7b2aa40b3)  |  ![IMG_AF679A541DF5-1 (2)](https://github.com/neilmenon/music-tools/assets/47338272/9c1a5e2b-9f99-4cf2-b6db-23ec79842594)

... also push notifications for iOS users (when app installed via Safari).

- **Why:** Not wanting to forget albums in my library + a bit of love of nostalgia.
- **Under the hood**: Angular, Spotify API, and AWS (Lambda, EventBridge Scheduler, DynamoDB, SES, API Gateway, S3).
