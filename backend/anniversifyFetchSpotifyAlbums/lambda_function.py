import json
import boto3
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from DynamoSpotipyCacheHandler import DynamoSpotipyCacheHandler
import os
import datetime
import time
import pytz

def flatten_spotify_library(albums):
    mapped_albums = []
    for album in albums:
        sm_album = {}
        sm_album['added_at'] = album['added_at']
        album = album['album']
        sm_album['artist'] = ", ".join(a['name'] for a in album['artists'])
        sm_album['url'] = album['external_urls']['spotify']
        sm_album['image_url'] = album['images'][1]['url'] if len(album['images']) > 1 else album['images'][0]['url']
        sm_album['name'] = album['name']
        sm_album['release_date'] = album['release_date']
        sm_album['release_date_precision'] = album['release_date_precision']
        sm_album['total_tracks'] = album['total_tracks']
        sm_album['id'] = album['id']
        sm_album['album_type'] = album['album_type']
        
        mapped_albums.append(sm_album)
    return mapped_albums
    
def fetch_spotify_library(spotify: spotipy.Spotify, users_local_date: datetime.datetime) -> dict:
    # return { "mapped": [{"test": i} for i in range(1, 374)], "errors": [] }
    errors = []    
    try:
        results = spotify.current_user_saved_albums()
        albums = []
        albums.extend(results['items'])
        while results['next']:
            results = spotify.next(results)
            albums.extend(results['items'])
            time.sleep(0.25)
    except Exception as e:
        message = "An error occurred while trying to fetch your Spotify library. Error: {}".format(e)
        # print(message)
        raise Exception(message)
        errors.append({ "date": str(users_local_date), "message": message })
        return { "mapped": None, "errors": errors }

    mapped = flatten_spotify_library(albums)
    print("Albums fetched: {}".format(len(mapped)))
    return { "mapped": mapped, "errors": errors }

def lambda_handler(event, context):
    print(event)
    SpotifyUserId = event['SpotifyUserId']
    
    dynamodb = boto3.client('dynamodb')
    
    response = dynamodb.get_item(
        TableName=os.environ['TABLE_NAME'],
        Key={'SpotifyUserId': {'S': SpotifyUserId}}
    )
    
    if "Item" not in response:
        raise Exception("The user {} does not exist in the DB.".format(SpotifyUserId))
    
    cache_handler = DynamoSpotipyCacheHandler(SpotifyUserId)
    auth_manager = SpotifyOAuth(
        os.environ['SPOTIFY_CLIENT_ID'],
        os.environ['SPOTIFY_SECRET_ID'],
        "http://localhost:8080",
        scope=os.environ['SPOTIFY_SCOPES'],
        open_browser=False,
        cache_handler=cache_handler
    )
    spotify = spotipy.Spotify(auth_manager=auth_manager)
    spotify.oauth_manager

    user_details = json.loads(response['Item']['UserDetails']['S'])
    
    users_local_date = datetime.datetime.now().astimezone(tz=pytz.timezone(user_details['timezone']))
    print("User's local date is: {}".format(str(users_local_date)))
    
    print("Fetching Spotify library for user {}...".format(SpotifyUserId))
    fetch_response = fetch_spotify_library(spotify, users_local_date)

    if len(fetch_response['errors']):
        user_details['errors'] = fetch_response['errors'] + user_details['errors']
        user_details['errors'] = user_details['errors'] if len(user_details['errors']) <= 10 else user_details['errors'][0:9]
    else:
        user_details['errors'] = []
        user_details['libraryLastFetched'] = str(users_local_date)

        # delete cache records, if they exist. we need to first query to find them
        items_to_delete_response = dynamodb.query(
            TableName=os.environ['SPOTIFY_CACHE_TABLE_NAME'],
            KeyConditionExpression='SpotifyUserId = :spotifyUserId',
            ExpressionAttributeValues={
                ':spotifyUserId': {'S': SpotifyUserId},
            },
            ProjectionExpression='Part'
        )

        print("Found {} existing item(s) in cache table to delete: ScannedCount = {}".format(len(items_to_delete_response['Items']), items_to_delete_response['ScannedCount']))
        for item in items_to_delete_response['Items']:
            dynamodb.delete_item(
                TableName=os.environ['SPOTIFY_CACHE_TABLE_NAME'],
                Key={
                    'SpotifyUserId': {'S': SpotifyUserId},
                    'Part': {'N': str(item['Part']['N'])}
                }
            )
            print("Deleted part {}/{} from cache table.".format(item['Part']['N'], len(items_to_delete_response['Items'])))

        # store Spotify library in cache table, in parts if item size would exceed DynamoDB limits
        spotify_library = fetch_response['mapped']
        part_size = 500
        if len(spotify_library) > part_size:
            parts = [spotify_library[i:i + part_size] for i in range(0, len(spotify_library), part_size)]
        else:
            parts = [spotify_library]

        print("Inserting {} part(s) as separate items in the Spotify Library cache table...".format(len(parts)))
        for index, part in enumerate(parts):
            dynamodb.put_item(
                TableName=os.environ['SPOTIFY_CACHE_TABLE_NAME'],
                Item={
                    'SpotifyUserId': {'S': SpotifyUserId},
                    'Part': {'N': str(index + 1)},
                    'LibraryData': {'S': json.dumps(part, ensure_ascii=False)}
                }
            )
            print("Inserted item for part {}/{} into the cache table.".format(index + 1, len(parts)))

    dynamodb.update_item(
        TableName=os.environ['TABLE_NAME'],
        Key={'SpotifyUserId': {'S': SpotifyUserId}},
        UpdateExpression='SET UserDetails = :user_details',
        ExpressionAttributeValues={
            ':user_details': {'S': json.dumps(user_details, ensure_ascii=False)},
        }
    )

    return {
        'statusCode': 500 if len(fetch_response['errors']) else 200,
        'body': "Fetched library with {} error(s).".format(len(fetch_response['errors']))
    }