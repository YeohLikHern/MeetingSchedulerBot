# MeetingSchedulerBot
A Telegram bot to plan meetings for your group ([@MeetingSchedulerBot](https://t.me/MeetingSchedulerBot)).

## Usage
Create a new meeting:

`/schedule [DD/MM/YYYY]`

e.g. `/schedule 09/07/2021`

Computation of available times will automatically take place when everyone in the group has responded, or when the `/stop` command is called.

## Testing locally
Create a new Telegram bot through [@BotFather](https://t.me/BotFather), and set the value of the environment variable `TELEGRAM_BOT_TOKEN`.

[Create a new Firebase Project](https://console.firebase.google.com/), and create a Realtime Database instance.

Next, navigate to the "Service accounts" tab of the Project Settings page (under "Users and permissions) and generate a new private key.
Initialise the following environment variables:
```
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
FIREBASE_CLIENT_ID
FIREBASE_CLIENT_X509_CERT_URL
DATABASE_URL
```

Finally, run the server using the following command:

`node index.js`
