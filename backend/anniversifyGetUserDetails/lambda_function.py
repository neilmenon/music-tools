import json
import boto3
import os

def lambda_handler(event, context):
    spotify_user_id = event['headers']['spotifyuserid']
    dynamodb = boto3.client('dynamodb')
    
    response = dynamodb.get_item(
        TableName=os.environ['TABLE_NAME'],
        Key={
            'SpotifyUserId': {'S': spotify_user_id}
        },
        ProjectionExpression='UserDetails',
        ConsistentRead=True
    )
    
    if "Item" in response and "UserDetails" in response['Item']:
        user_details = json.loads(response['Item']['UserDetails']['S'])
    else:
        user_details = None
    
    return {
        'statusCode': 200,
        'headers': {"Content-Type": "application/json"},
        'body': json.dumps(user_details, ensure_ascii=False)
    }
