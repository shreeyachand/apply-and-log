# apply & log

i apologize i couldn't come up with a more creative name but happy recruiting season...! i made this extension to help me log internship apps to my notion database so the process of keeping track of applications is way less tedious

it is meant to autodetect your database's schema to render the form, and autofills certain fields (title, company, location) from the job posting url. you can edit any of the fields before logging to notion!

## setup

### 0. set up your database
set up a table/database in Notion with the fields you want to log. i'm guessing that if you've chosen to use Notion to track your apps, you're probably already comfortable with doing this
### 1. integrate with Notion

1. Go to https://www.notion.so/my-integrations and create a new internal integration
2. Copy the **Internal Integration Secret** (API key)
3. Go to your target database in Notion, click **Share** → **Invite** → add your integration

### 2. find your database ID

Open your database in Notion. The URL looks like:

```
https://www.notion.so/workspace/DB_ID?v=...
```

The `DB_ID` is the 32-character hex string after the workspace name.

### 3. install the extension locally

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `apply-and-log` folder
4. Pin the extension for quick access

### 4. configure

1. Click the extension icon → **Settings**. This will open a menu with fields for your credentials.
2. Paste your **Notion API Key** and **Database ID**
3. Click **Save** — the extension fetches your schema automatically

## usage

1. navigate to any job posting
2. click the extension icon
3. review autofilled fields (title, company, location from URL)
4. edit as needed — status, location, source, deadline, notes
5. click **Log to Notion**# ehebclt-crm
