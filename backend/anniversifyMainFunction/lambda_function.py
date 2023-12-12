import json
import boto3
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from DynamoSpotipyCacheHandler import DynamoSpotipyCacheHandler
import os
import datetime
import pytz
import requests
import base64
import time
from pywebpush import webpush, WebPushException

def replace_template_variables(replacements: dict, template: str) -> str:
    # in the replacements being done, the key is surrounded like {{key}}
    for variable, replacement in replacements.items():
        template = template.replace("{{" + variable + "}}", replacement)
    return template

def build_and_send_email(anniversaries: list, users_local_date: datetime.datetime, user_details):
    ses = boto3.client("ses", region_name="us-east-1")

    # build HTML content for each release that has an anniversary
    album_box_html = ""
    for release in anniversaries:
        release_template_html = os.environ['EMAIL_TEMPLATE_ALBUM_BOX_HTML']
        replacements = {
            "th": release['ordinal'],
            "spotifyArtworkUrl": release['image_url'],
            "spotifyReleaseUrl": release['url'],
            "artist": release['artist'],
            "album": release['name'],
            "year": release['release_date'][:4],
            "savedDate": datetime.datetime.strftime(datetime.datetime.strptime(release['added_at'], "%Y-%m-%dT%H:%M:%SZ"), "%b %d, %Y"),
        }
        album_box_html += replace_template_variables(replacements, release_template_html)

    # set replacements for main email template
    subject = "Your anniversaries for {}".format(users_local_date.strftime("%m-%d-%Y"))
    template_data = {
        "subject": subject,
        "spotifyUserName": user_details['name'],
        "tipAboutAlbumArt": os.environ['EMAIL_TEMPLATE_TIP_HTML'],
        "numberOfReleases": "1 release" if len(anniversaries) == 1 else "{} releases".format(len(anniversaries)),
        "todaysDate": users_local_date.strftime("%B %-d"),
        "spotifyPlaylistId": user_details['spotifyPlaylistId'],
        "anniversifyAppUrl": os.environ['ANNIVERSIFY_APP_URL'],
        "anniversariesHtml": album_box_html
    }

    # send the email
    email_response = ses.send_templated_email(
        ConfigurationSetName="Anniversify",
        Source=os.environ['ANNIVERSIFY_EMAIL_FROM'],
        Destination={'ToAddresses': [user_details['email']]},
        Tags=[{ "Name": "Type", "Value": "Anniversify" }],
        Template="AnniversifyMainTemplate",
        TemplateData=json.dumps(template_data, ensure_ascii=False),
    )
    print(email_response)
    
def upload_playlist_cover_image(spotify: spotipy.Spotify, created_playlist_id):
    # fetch base64 playlist cover image
    img_response = requests.get(os.environ['SPOTIFY_PLAYLIST_COVER_URL'])
    base64_image = base64.b64encode(img_response.content).decode('utf-8')
    spotify.playlist_upload_cover_image(created_playlist_id, base64_image)

def create_playlist(spotify: spotipy.Spotify, users_local_date: datetime.datetime, user_details: dict, spotify_user_id) -> str:
    playlist_name = "Anniversify • {}".format(users_local_date.strftime("%m-%d-%Y"))
    # create playlist
    try:
        create_response = spotify.user_playlist_create(user=spotify_user_id, name=playlist_name, public=True, description=os.environ['SPOTIFY_PLAYLIST_DESC'])
        created_playlist_id = create_response['id']
    except Exception as e:
        print("Error creating playlist: {}".format(e))
        raise Exception(e)
        
    # upload playlist cover image
    try:
        upload_playlist_cover_image(spotify, created_playlist_id)
    except Exception as e:
        print("Error uploading playlist image cover. Retrying...: {}".format(e))
        time.sleep(3)
        try:
            upload_playlist_cover_image(spotify, created_playlist_id)
        except Exception as e:
            print("Error uploading playlist image cover on retry. Skipping...: {}".format(e))

    print("Created playlist with ID: {}".format(created_playlist_id))
    return created_playlist_id

def add_anniversaries_to_playlist(spotify: spotipy.Spotify, albums: list, users_local_date: datetime.datetime, spotify_playlist_id: str):
    errors = []
    # update playlist name
    playlist_name = "Anniversify • {}".format(users_local_date.strftime("%m-%d-%Y"))
    print("Updating playlist name to {}, as well as description.".format(playlist_name))
    try:
        spotify.playlist_change_details(playlist_id=spotify_playlist_id, name=playlist_name, description=os.environ['SPOTIFY_PLAYLIST_DESC'])
        print("Updated.")

        track_ids = []
        for a in albums:
            print("Fetching track IDs for {} - {}".format(a['artist'], a['name']))
            tracks = spotify.album_tracks(a['id'])
            album_track_ids = []
            album_track_ids.extend([t['id'] for t in tracks['items']])
            while tracks['next']:
                tracks = spotify.next(tracks)
                album_track_ids.extend([t['id'] for t in tracks['items']])
            print("\t Fetched {} track(s).".format(len(album_track_ids)))
            track_ids.extend(album_track_ids)
        
        print("Replacing playlist tracks with {} tracks(s) from {} album(s)...".format(len(track_ids), len(albums)))
        spotify.playlist_replace_items(spotify_playlist_id, track_ids)
        print("Replaced.")
    except Exception as e:
        message = "An error occurred while trying to update the Spotify playlist. Skipping playlist update. Error: {}".format(e)
        print(message)
        errors.append({ "date": str(users_local_date), "message": message })
        print("Skipping playlist update.")
        return errors
    
    return errors
    
def find_anniversaries(albums: list, users_local_date: datetime.datetime):
    anniversary_albums = []
    
    todays_date = datetime.datetime.strptime(users_local_date.strftime("%Y-%m-%d"), "%Y-%m-%d")

    for a in albums:
        if a['release_date_precision'] == "day":
            release_date = datetime.datetime.strptime(a['release_date'], "%Y-%m-%d")

            if todays_date.day == release_date.day and todays_date.month == release_date.month:
                print("Anniversary found! {} - {}".format(a['artist'], a['name']))
                
                # calculate ordinal
                delta = round((todays_date - release_date).days / 365)
                ordinal = lambda n: "%d%s" % (n,"tsnrhtdd"[(n//10%10!=1)*(n%10<4)*n%10::4])
                th = ordinal(delta)
                a['ordinal'] = th

                anniversary_albums.append(a)
    
    return anniversary_albums

def lambda_handler(event, context):
    print(event)
    SpotifyUserId = event['SpotifyUserId']
    
    dynamodb = boto3.client('dynamodb')
    
    # fetch user details
    response = dynamodb.get_item(
        TableName=os.environ['TABLE_NAME'],
        Key={'SpotifyUserId': {'S': SpotifyUserId}},
        ProjectionExpression='UserDetails'
    )
    
    if "Item" not in response:
        raise Exception("The user {} does not exist in the DB.".format(SpotifyUserId))
    
    user_details = json.loads(response['Item']['UserDetails']['S'])
        
    # fetch Spotify library from cache table
    cache_items = dynamodb.query(
        TableName=os.environ['SPOTIFY_CACHE_TABLE_NAME'],
        KeyConditionExpression='SpotifyUserId = :spotifyUserId',
        ExpressionAttributeValues={
            ':spotifyUserId': {'S': SpotifyUserId},
        },
        ProjectionExpression='LibraryData'
    )

    if not len(cache_items['Items']):
        raise Exception("The user's library was not found in the cache table.")
    
    print("Fetched Spotify library from cache table (Parts: {}).".format(len(cache_items['Items'])))

    # rebuild full JSON library from the individual parts
    spotify_library = []
    for part in cache_items['Items']:
        spotify_library.extend(json.loads(part['LibraryData']['S']))
    
    # instantiate Spotify resources
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
        
    print("Finding anniversaries for {} | {} | Library Size: {}".format(SpotifyUserId, user_details['email'], len(spotify_library)))

    # filter out non-album types if flag is set by user
    if user_details['albumsOnly']:
        spotify_library = list(filter(lambda x: x['album_type'] == "album", spotify_library))

    # get timezone-aware local date for the user based on the timezone entered in the app
    users_local_date = datetime.datetime.now().astimezone(tz=pytz.timezone(user_details['timezone']))
    print("User's local date is: {}".format(str(users_local_date)))
    
    album_anniversaries = find_anniversaries(spotify_library, users_local_date)

    errors = []
    
    # create playlist if needed
    if user_details['playlistEnabled'] and not user_details['spotifyPlaylistId']:
        user_details['spotifyPlaylistId'] = create_playlist(spotify, users_local_date, user_details, SpotifyUserId)

    if user_details['spotifyPlaylistId']:
        print("Updating Spotify playlist (ID: {}) with {} release(s)...".format(user_details['spotifyPlaylistId'], len(album_anniversaries)))
        playlist_errors = add_anniversaries_to_playlist(spotify, album_anniversaries, users_local_date, user_details['spotifyPlaylistId'])
        errors.extend(playlist_errors)

    if len(album_anniversaries):
        if user_details['emailsEnabled']:
            print("Sending email to {} with {} release(s)...".format(user_details['email'], len(album_anniversaries)))
            build_and_send_email(album_anniversaries, users_local_date, user_details)
        if user_details.get('pushNotificationObject', False):
            payload = {
                "notification": {
                    "title": "Anniversify",
                    "body": "{} from your Spotify Library came out today, {}. Tap to view 🎉".format("1 release" if len(album_anniversaries) == 1 else "{} releases".format(len(album_anniversaries)), users_local_date.strftime("%B %-d")),
                    "data": {
                        "onActionClick": {
                            "default": {"operation": "openWindow", "url": "/anniversify/report/{}/{}/{}".format(users_local_date.strftime("%m-%d-%Y"), len(album_anniversaries), user_details['spotifyPlaylistId'])}
                        }
                    }
                }
            }
            try:
                webpush(
                    subscription_info=user_details['pushNotificationObject']['subscription'],
                    data=json.dumps(payload),
                    vapid_private_key=os.environ['VAPID_PRIVATE_KEY'],
                    vapid_claims={"sub": "mailto:neil@neilmenon.com"}
                )
                print("Sent push notification.")
            except WebPushException as e:
                if e.response.status_code == 410:
                    print("Push notification subscription expired. Deleting...")
                    user_details['pushNotificationObject'] = None
                else:
                    raise e
            

    if len(errors):
        user_details['errors'] = errors + user_details['errors']
        user_details['errors'] = user_details['errors'] if len(user_details['errors']) <= 10 else user_details['errors'][0:9]
    else:
        user_details['errors'] = []

    user_details['lastRun'] = str(users_local_date)

    dynamodb.update_item(
        TableName=os.environ['TABLE_NAME'],
        Key={'SpotifyUserId': {'S': SpotifyUserId}},
        UpdateExpression='SET UserDetails = :user_details',
        ExpressionAttributeValues={
            ':user_details': {'S': json.dumps(user_details, ensure_ascii=False)}
        }
    )
    
    return {
        'statusCode': 500 if len(errors) else 200,
        'body': "Ran Anniversify with {} error(s).".format(len(errors)),
    }