import json
import boto3
from botocore.exceptions import ClientError
import os

def lambda_handler(event, context):
    spotify_user_id = event['headers']['spotifyuserid']
    dynamodb = boto3.client('dynamodb')
    
    print("Deleting schedules for {}...".format(spotify_user_id))
    scheduler = boto3.client('scheduler')
    
    # delete initial fetch schedule
    try:
        scheduler.delete_schedule(
            GroupName='Anniversify-InitialFetch',
            Name='{}-InitialFetch'.format(spotify_user_id)
        )
        print("Deleted initial fetch schedule.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print(e.response['Error']['Message'])
        else:
            raise Exception(e.response['Error']['Message'])
            
    # delete library update schedule
    try:
        scheduler.delete_schedule(
            GroupName='Anniversify-LibraryUpdate',
            Name='{}-LibraryUpdate'.format(spotify_user_id)
        )
        print("Deleted library update schedule.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print(e.response['Error']['Message'])
        else:
            raise Exception(e.response['Error']['Message'])
            
    # delete notifications schedule
    try:
        scheduler.delete_schedule(
            GroupName='Anniversify-Notifications',
            Name='{}-Notifications'.format(spotify_user_id),
        )
        print("Deleted notifications schedule.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print(e.response['Error']['Message'])
        else:
            raise Exception(e.response['Error']['Message'])
            
    # delete items from the cache table. we need to first query to find them
    items_to_delete_response = dynamodb.query(
        TableName=os.environ['SPOTIFY_CACHE_TABLE_NAME'],
        KeyConditionExpression='SpotifyUserId = :spotifyUserId',
        ExpressionAttributeValues={
            ':spotifyUserId': {'S': spotify_user_id},
        },
        ProjectionExpression='Part'
    )

    print("Found {} existing item(s) in cache table to delete: ScannedCount = {}".format(len(items_to_delete_response['Items']), items_to_delete_response['ScannedCount']))
    for item in items_to_delete_response['Items']:
        dynamodb.delete_item(
            TableName=os.environ['SPOTIFY_CACHE_TABLE_NAME'],
            Key={
                'SpotifyUserId': {'S': spotify_user_id},
                'Part': {'N': str(item['Part']['N'])}
            }
        )
        print("Deleted part {}/{} from cache table.".format(item['Part']['N'], len(items_to_delete_response['Items'])))
        
    # delete user from main table
    dynamodb.delete_item(
        TableName=os.environ['TABLE_NAME'],
        Key={
            'SpotifyUserId': {'S': spotify_user_id},
        }
    )
    
    return {
        'statusCode': 200,
        'headers': {"Content-Type": "application/json"},
        'body': json.dumps({"message": "Success"})
    }
