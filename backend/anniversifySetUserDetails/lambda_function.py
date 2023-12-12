import json
import os
import boto3
from datetime import datetime, timedelta
import random
from botocore.exceptions import ClientError
import pytz
from pywebpush import webpush, WebPushException

def replace_template_variables(replacements: dict, template: str) -> str:
    # in the replacements being done, the key is surrounded like {{key}}
    for variable, replacement in replacements.items():
        template = template.replace("{{" + variable + "}}", replacement)
    return template

def create_schedules(spotify_user_id, user_details):
    scheduler = boto3.client('scheduler')
    
    cron_hour = int(user_details['notifyTime'].split(":")[0])
    cron_minute = int(user_details['notifyTime'].split(":")[1])
    
    # create schedule for main Anniversify task
    try:
        scheduler.create_schedule(
            FlexibleTimeWindow={
                'MaximumWindowInMinutes': 5,
                'Mode': 'FLEXIBLE'
            },
            Description="Anniversify notification schedule for {} <{}>.".format(user_details['name'], user_details['email']),
            GroupName='Anniversify-Notifications',
            Name='{}-Notifications'.format(spotify_user_id),
            ScheduleExpression="cron({} {} * * ? *)".format(cron_minute, cron_hour),
            ScheduleExpressionTimezone=user_details['timezone'],
            Target={
                'Arn': os.environ['MAIN_TASK_LAMBDA_ARN'],
                'RoleArn': os.environ['EVENT_BRIDGE_SCHEDULER_ROLE_ARN'],
                'Input': json.dumps({ "SpotifyUserId": spotify_user_id })
            }
        )
        print("Created Anniversify notification schedule.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConflictException':
            print(e.response['Error']['Message'])
        else:
            raise Exception(e.response['Error']['Message'])
        
    # create one-time schedule for initial library fetch
    try:
        run_date_string = (datetime.utcnow() + timedelta(minutes=random.randint(1, 5))).strftime("%Y-%m-%dT%H:%M:%S")
        scheduler.create_schedule(
            # ActionAfterCompletion="NONE",
            FlexibleTimeWindow={
                'MaximumWindowInMinutes': 5,
                'Mode': 'FLEXIBLE'
            },
            Description="Initial one-time libray fetch schedule for {} <{}>.".format(user_details['name'], user_details['email']),
            GroupName='Anniversify-InitialFetch',
            Name='{}-InitialFetch'.format(spotify_user_id),
            ScheduleExpression="at({})".format(run_date_string),
            Target={
                'Arn': os.environ['LIBRARY_UPDATE_LAMBDA_ARN'],
                'RoleArn': os.environ['EVENT_BRIDGE_SCHEDULER_ROLE_ARN'],
                'Input': json.dumps({ "SpotifyUserId": spotify_user_id })
            }
        )
        print("Created Anniversify one-time initial fetch schedule.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConflictException':
            print(e.response['Error']['Message'])
        else:
            raise Exception(e.response['Error']['Message'])
    
    # create recurring schedule for library fetch
    try:
        scheduler.create_schedule(
            FlexibleTimeWindow={
                'MaximumWindowInMinutes': 60,
                'Mode': 'FLEXIBLE'
            },
            Description="Anniversify library update schedule for {} <{}>.".format(user_details['name'], user_details['email']),
            GroupName='Anniversify-LibraryUpdate',
            Name='{}-LibraryUpdate'.format(spotify_user_id),
            ScheduleExpression="cron({} {} ? * {} *)".format(random.randint(0, 59), random.randint(0, 23), random.randint(1, 7)),
            Target={
                'Arn': os.environ['LIBRARY_UPDATE_LAMBDA_ARN'],
                'RoleArn': os.environ['EVENT_BRIDGE_SCHEDULER_ROLE_ARN'],
                'Input': json.dumps({ "SpotifyUserId": spotify_user_id })
            }
        )
        print("Created Anniversify library update schedule.")
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConflictException':
            print(e.response['Error']['Message'])
        else:
            raise Exception(e.response['Error']['Message'])
    
def update_notifications_schedule(spotify_user_id, user_details):
    scheduler = boto3.client('scheduler')
    
    # convert 12-hour time to 24 hour time e.g. 3:05 AM -> 3:5
    cron_hour = int(user_details['notifyTime'].split(":")[0])
    cron_minute = int(user_details['notifyTime'].split(":")[1])

    scheduler.update_schedule(
        FlexibleTimeWindow={
            'MaximumWindowInMinutes': 5,
            'Mode': 'FLEXIBLE'
        },
        Description="Anniversify notification schedule for {} <{}>.".format(user_details['name'], user_details['email']),
        GroupName='Anniversify-Notifications',
        Name='{}-Notifications'.format(spotify_user_id),
        ScheduleExpression="cron({} {} * * ? *)".format(cron_minute, cron_hour),
        ScheduleExpressionTimezone=user_details['timezone'],
        Target={
            'Arn': os.environ['MAIN_TASK_LAMBDA_ARN'],
            'RoleArn': os.environ['EVENT_BRIDGE_SCHEDULER_ROLE_ARN'],
            'Input': json.dumps({ "SpotifyUserId": spotify_user_id })
        },
        State='ENABLED'
    )
    print("Updated Anniversify notifications schedule per user settings changes.")

def lambda_handler(event, context):
    is_create = event['requestContext']['http']['method'] == "POST"
    body = json.loads(event['body'])
    spotify_user_id = event['headers']['spotifyuserid']
    dynamodb = boto3.client('dynamodb')
    
    UserDetails = SpotifyAuth = None
    if not is_create:
        existing = dynamodb.get_item(
            TableName=os.environ['TABLE_NAME'],
            Key={
                'SpotifyUserId': {'S': spotify_user_id}
            },
            ProjectionExpression='UserDetails, SpotifyAuth'
        )
        UserDetails = json.loads(existing['Item']['UserDetails']['S'])
        SpotifyAuth = json.loads(existing['Item']['SpotifyAuth']['S'])
        
    if is_create:
        new_spotify_auth = [body['SpotifyAuth']]
        body['UserDetails']['registerDate'] = str(datetime.now().astimezone(tz=pytz.timezone(body['UserDetails']['timezone'])))
    elif not is_create and body['SpotifyAuth']:
        SpotifyAuth.append(body['SpotifyAuth'])
        new_spotify_auth = SpotifyAuth
    else:
        new_spotify_auth = SpotifyAuth
        
    # create or update event schedules for the user
    email_pref_change_to_yes = email_pref_change_to_no = is_time_pref_change = False
    if not is_create:
        email_pref_change_to_yes = body['UserDetails']['emailsEnabled'] and not UserDetails['emailsEnabled']
        email_pref_change_to_no = not body['UserDetails']['emailsEnabled'] and UserDetails['emailsEnabled']
        is_time_pref_change = body['UserDetails']['timezone'] != UserDetails['timezone'] or body['UserDetails']['notifyTime'] != UserDetails['notifyTime']
    
    
    if is_create:
        create_schedules(spotify_user_id, body['UserDetails'])
    if is_time_pref_change or email_pref_change_to_no or email_pref_change_to_yes:
        update_notifications_schedule(spotify_user_id, body['UserDetails'])
    
    dynamodb.put_item(
        TableName=os.environ['TABLE_NAME'],
        Item={
            'SpotifyUserId': {'S': spotify_user_id},
            'SpotifyAuth': {'S': json.dumps(new_spotify_auth)},
            'UserDetails': {'S': json.dumps(body['UserDetails'], ensure_ascii=False)}
        }
    )
    
    # send welcome email
    if is_create and body['UserDetails']['emailsEnabled']:
        ses = boto3.client("ses", region_name="us-east-1")
        subject = "Welcome to Anniversify🎉"
        template_data = {
            "subject": subject,
            "spotifyUserName": body['UserDetails']['name'],
            "anniversifyAppUrl": os.environ['ANNIVERSIFY_APP_URL'],
            "welcomeMessageBody": os.environ['WELCOME_EMAIL_BODY']
        }
        
        email_response = ses.send_templated_email(
            ConfigurationSetName="Anniversify",
            Source=os.environ['ANNIVERSIFY_EMAIL_FROM'],
            Destination={'ToAddresses': [body['UserDetails']['email']]},
            Tags=[{ "Name": "Type", "Value": "Anniversify" }],
            Template="AnniversifyWelcomeTemplate",
            TemplateData=json.dumps(template_data, ensure_ascii=False),
        )
        print(email_response)
    
    # send push notification confirmation upon enable
    if not UserDetails.get('pushNotificationObject', False) and body['UserDetails'].get('pushNotificationObject', False):
        welcome_notification_text = "Rediscover albums in your library and celebrate their milestones with Anniversify! ➡️ Consider updating/decluttering your Spotify Library to get the most out of your notifications — you'll receive at most one per day."
        payload = {
            "notification": {
                "title": "Welcome to Anniversify🎉",
                "body": welcome_notification_text
            }
        }
        try:
            webpush(
                subscription_info=body['UserDetails']['pushNotificationObject']['subscription'],
                data=json.dumps(payload),
                vapid_private_key=os.environ['VAPID_PRIVATE_KEY'],
                vapid_claims={"sub": "mailto:neil@neilmenon.com"}
            )
            print("Sent welcome push notification.")
        except WebPushException as e:
            if e.response.status_code == 410:
                print("Push notification subscription expired! But they just enabled it...")
            else:
                raise e
    
    return {
        'statusCode': 200,
        'headers': {"Content-Type": "application/json"},
        'body': json.dumps(body['UserDetails'])
    }
