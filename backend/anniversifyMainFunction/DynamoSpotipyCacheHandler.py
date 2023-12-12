import boto3
import json
import random
from spotipy import CacheHandler
import os

class DynamoSpotipyCacheHandler(CacheHandler):
    """
    Implements Spotipy's CacheHandler to get and set auth from DyanmoDB
    """

    def __init__(self, spotify_user_id):
        self.spotify_user_id = spotify_user_id
        self.dynamodb = boto3.client('dynamodb')
        
    def get_tokens_from_db(self):
        response = self.dynamodb.get_item(
            TableName=os.environ['TABLE_NAME'],
            Key={
                'SpotifyUserId': {'S': self.spotify_user_id}
            },
            ProjectionExpression='SpotifyAuth'
        )
        return json.loads(response.get('Item')['SpotifyAuth']['S'])

    def get_cached_token(self):
        """
        Get and return a token_info dictionary object.
        """
        
        # DB stores list of tokens (one-per-device)
        token_info_list = self.get_tokens_from_db()
        token_info = random.choice(token_info_list)
        
        # expires_at not set by default but managed by Spotipy
        if "expires_at" not in token_info:
            token_info['expires_at'] = 1
        return token_info

    def save_token_to_cache(self, token_info):
        """
        Save a token_info dictionary object to the cache and return None.
        """
        
        # get existing list of tokens, then replace/add entry in list
        token_info_list = self.get_tokens_from_db()
        token_index = -1
        for index, token in enumerate(token_info_list):
            if token['refresh_token'] == token_info['refresh_token']:
                token_index = index
                break
        
        if token_index == -1: # new token, append
            token_info_list.append(token_info)
        else: # existing token, replace
            token_info_list[token_index] = token_info
        
        self.dynamodb.update_item(
            TableName=os.environ['TABLE_NAME'],
            Key={
                'SpotifyUserId': {'S': self.spotify_user_id}
            },
            UpdateExpression='SET SpotifyAuth = :auth_details',
            ExpressionAttributeValues={
                ':auth_details': {'S': json.dumps(token_info_list)}
            }
        )
        return None