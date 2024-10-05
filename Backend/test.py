import requests

client_id = '496c242a-8df3-43b3-a4aa-4db85e00e8f2'
client_secret = 'lrBHf77WZrhZfv3nsv27lcJyTKVtqOjz'

response = requests.post('https://services.sentinel-hub.com/oauth/token',
    data={
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret,
    }
)

token = response.json()['access_token']
print(f"Your API key (OAuth token): {token}")