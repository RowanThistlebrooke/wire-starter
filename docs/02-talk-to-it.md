# Episode 2: talk to it

Log readings by talking to Claude on your phone. You need BODY deployed first: [setup](../README.md#first-deploy-body).

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

## 4. Say it

In the Claude app on your phone, with YOU turned on:

```
log my weight, [your number] pounds
```

Claude shows the exact row it will save. Say yes. Open BODY: the new point is on the graph.

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
