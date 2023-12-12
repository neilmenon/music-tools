import json
import boto3
import requests
import datetime
import os

def verify_spotify_access_token_validity(spotify_user_id, access_token):
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token,
    }
    auth_response = requests.get("https://api.spotify.com/v1/users/{}".format(spotify_user_id), headers=headers)
    print(json.dumps(auth_response.json()))
    return auth_response.ok
    
def update_last_authenticated(dynamodb, spotify_user_id):
    response = dynamodb.get_item(
        TableName=os.environ['TABLE_NAME'],
        Key={
            'SpotifyUserId': {'S': spotify_user_id}
        },
        ProjectionExpression='UserDetails',
        ConsistentRead=True
    )
    if "UserDetails" in response['Item']:
        user_details = json.loads(response['Item']['UserDetails']['S'])
    else:
        user_details = {}
        
    user_details['lastAuthenticated'] = str(datetime.datetime.now())
    
    dynamodb.update_item(
        TableName=os.environ['TABLE_NAME'],
        Key={
            'SpotifyUserId': {'S': spotify_user_id}
        },
        UpdateExpression='SET UserDetails = :details',
        ExpressionAttributeValues={
            ':details': {'S': json.dumps(user_details, ensure_ascii=False)}
        }
    )

def lambda_handler(event, context):
    # Authorization and SpotifyUserId are required before this function is called
    auth_token = event['headers']['authorization'] if 'authorization' in event['headers'] else None # will be 'refresh_token' for existing auth, new auth will be 'access_token'
    spotify_user_id = event['headers']['spotifyuserid'] if 'spotifyuserid' in event['headers'] else None
    
    if not auth_token:
        print("Authorization token not specified.")
        return { "isAuthorized": False }
    
    if not spotify_user_id:
        print("SpotifyUserId not specified.")
        return { "isAuthorized": False }
    
    print("Authorizing request for SpotifyUserId: {}".format(spotify_user_id))
    
    dynamodb = boto3.client('dynamodb')
    
    response = dynamodb.get_item(
        TableName=os.environ['TABLE_NAME'],
        Key={
            'SpotifyUserId': {'S': spotify_user_id}
        },
        ProjectionExpression='SpotifyAuth',
        ConsistentRead=True
    )
    
    user_exists = False
    auth_valid = False
    
    # check if user exists in the DB
    if 'Item' in response:
        user_exists = True
        if "SpotifyAuth" in response['Item']:
            auth_token_list = spotify_albums = json.loads(response['Item']['SpotifyAuth']['S'])
            for token_object in auth_token_list:
                if token_object['refresh_token'] == auth_token:
                    auth_valid = True
                    break
            if not auth_valid:
                # if we get here, token not in DB, user is providing new access_token to store in DB.
                # need to validate that this token is a valid Spotify token
                print("User exists but is providing a new auth token. Verifying token validity against Spotify...")
                auth_valid = verify_spotify_access_token_validity(spotify_user_id, auth_token)
            
            if auth_valid:
                print("Updating last authenticated date in DB.")
                update_last_authenticated(dynamodb, spotify_user_id)
    else:
        print("User does not exist in DB. Checking Spotify user ID and token against Spotify API...")
        auth_valid = verify_spotify_access_token_validity(spotify_user_id, auth_token)
    
    if auth_valid:
        print("Authorization successful: user_exists: {}, auth_valid: {}".format(user_exists, auth_valid))
        return { "isAuthorized": True }
    
    print("Authorization failed: user_exists: {}, auth_valid: {}".format(user_exists, auth_valid))
    return { "isAuthorized": False }
