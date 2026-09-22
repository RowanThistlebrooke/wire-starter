# Episode 2: talk to it

Log readings by talking to Claude on your phone. You need BODY deployed first: [setup](../README.md#first-deploy-body).

## How it works

Your data lives in Supabase. That is the vault.

This episode adds a small door to your page on Vercel, at `/api/mcp`. When you text Claude, Claude knocks on that door with a secret key. The door checks the key, signs into Supabase as you, and does only what it is allowed to do: save a reading, read your history, save a guess from a photo, list what you track. Nothing on that list edits or deletes.

Claude never touches your database directly. It only talks to the door.

**Already have BODY from episode 1?** In Claude Code, on your own repo, paste this, then merge the pull request:

```
Copy api/mcp.mjs, api/photo, the mcp folder, and any package.json and vercel.json changes from https://github.com/RowanThistlebrooke/wire-starter into this repo. Keep my index.html as it is. Then create a pull request to main.
```

## 1. Make a token

Mac, in Terminal:

```
openssl rand -hex 32
```

Windows, in PowerShell:

```
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ($b | % { $_.ToString('x2') }) -join ''
```

Copy the line it prints. Never share it.

**Why:** this is the key to your door. Anyone with it can knock, so it never goes in your code, a screenshot or a chat.

## 2. Add three settings in Vercel

Your project → Settings → Environment Variables. Add these, then Redeploy:

```
WIRE_EMAIL
```
```
WIRE_PASSWORD
```
```
WIRE_TOKEN
```

Email and password are your BODY login. The token is from step 1.

**Why:** these are environment variables, the place every host keeps secrets. Your code reads them when it runs, so the secrets never sit in the code itself. The door logs into Supabase with your login, so it can only ever see your own rows.

## 3. Connect Claude

claude.ai → Settings → Connectors → Add custom connector. Name it YOU. URL:

```
https://YOUR-PAGE.vercel.app/api/mcp
```

Authentication: **No sign-in**. Request headers → Add header → `authorization`. Value:

```
Bearer YOUR-TOKEN
```

The word Bearer, one space, then your token.

**Why:** a connector gives Claude new tools. This one tells Claude where your door is and hands it the key. It works on your phone and your computer.

## 4. Say it

In the Claude app on your phone, with YOU turned on:

```
log my weight, [your number] pounds
```

Claude shows the exact row it will save. Say yes. Open BODY: the new point is on the graph.

**Why:** nothing is saved without your yes. Build that into anything AI writes for you.

## 5. Send a photo

Send a progress photo in the same chat:

```
estimate my body fat and muscle from this photo
```

It saves a guess, marked as a guess, never next to your measured weight. Say yes.

## 6. Send photos from your camera roll

Add this Shortcut on your iPhone: [add photo](https://www.icloud.com/shortcuts/09a1d2f5360f4336aa85c9ff9b53bd1f)

Open it and change two things:

- `YOUR-URL` to your page (the part before .vercel.app)
- `YOUR-TOKEN` to your token from step 1 (keep the word Bearer and the space in front)

Then in Photos, pick a photo → Share → **add photo**. It shows up in BODY under Progress photos.

## Your own project

Anything that is online and holds data can have a door. Steps 1 to 4 stay the same. Only the start changes: instead of copying this code, Claude Code builds the door for your project.

In Claude Code, on your project, paste this and fill in the brackets:

```
Build an MCP endpoint for this project so I can use it from Claude as a custom connector. Use api/mcp.mjs in https://github.com/RowanThistlebrooke/wire-starter as the example.

What data: [the table or data it works with]
What it may do: [for example: add a row, read my rows]. Nothing that edits or deletes.
Ask first: before any write, show me the exact row and save only after I say yes.

One URL, and one secret token checked on every request. The token goes in an environment variable, never in the code. Use this project's own database and login. Then create a pull request and tell me exactly what to paste into claude.ai connectors.
```

What each part does:

- **Use ... as the example:** Claude copies the shape of a door that already works instead of guessing.
- **What data:** which part of your vault the door can reach. Nothing else.
- **What it may do:** the door's list of tools. Leave out edit and delete, and a mistake can never wipe anything.
- **Ask first:** you see every write before it happens.
- **Token in an environment variable:** the key stays out of your code.
- **Pull request:** you read the change before it goes live, and Claude hands you what you need for steps 1 to 3.

Every build prompt you write needs the same three things: what data it touches, what it may do, and when it has to ask you first.
