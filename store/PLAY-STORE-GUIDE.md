# Opening Quest on Google Play: steps and ready answers

Everything Play Console asks you, in the order it asks, with the answer to paste or tick.
Replace the few `[BRACKETED]` bits with your own details.

## What's already made (in this folder)

| File | What it's for |
|---|---|
| `dist/OpeningQuest-1.5.0.aab` | The app bundle you upload (signed with your upload key, targets Android 16 / API 36) |
| `android/upload-keystore.jks` + `android/upload-keystore-password.txt` | Your **upload key**. Back both up (USB stick + cloud). If you lose them you must ask Google to reset the key. Never share them. |
| `store/graphics/icon-512.png` | App icon (512 × 512) |
| `store/graphics/feature-graphic-1024x500.png` | Feature graphic (1024 × 500) |
| `store/screenshots/phone/*.png` | 8 phone screenshots (1082 × 2163) |
| `store/privacy-policy.html` | Privacy policy. Must be put online (step 2) |

To make a new version later: raise `versionCode` and `versionName` in `android/AndroidManifest.xml`, then run `bash android/build-aab.sh`.

---

## Step 1 – Developer account (one time)

1. Go to <https://play.google.com/console/signup>, sign in with the Google account you want to own the app.
2. Choose **Personal** (just you) or **Organization** (needs a D-U-N-S number).
3. Pay the one-time **US$25** fee and complete **identity verification** (government ID; can take a few days).
4. Verify your contact email and phone number.

> **Important for new personal accounts:** before you can publish to everyone, Google requires a **closed test with at least 12 testers who stay opted in for 14 days in a row** (step 7). Organization accounts skip this.

## Step 2 – Put the privacy policy online

You need a public web address for it. Easiest free options:
- **GitHub Pages**: create a public repo, upload `privacy-policy.html` as `index.html`, Settings → Pages → enable. URL looks like `https://<you>.github.io/<repo>/`.
- **Google Sites**: create a site, paste the policy text, publish.

First fill in `[YOUR NAME OR STUDIO NAME]` and `[YOUR CONTACT EMAIL]` in the file.

## Step 3 – Publish the source code (required by the licences)

The app includes **Stockfish** and **chessground**, which are GPL-3.0. That means anyone who gets the app must be able to get its source code.
- Put the whole `opening-quest` folder in a **public GitHub repository**, but **without** `android/upload-keystore.jks`, `android/upload-keystore-password.txt` and `android/debug.keystore`. The `.gitignore` already excludes them.
- Add the repo link to the store description (a line is already in the text below) as `[SOURCE CODE URL]`.

## Step 4 – Create the app

Play Console → **Create app**:

| Question | Answer |
|---|---|
| App name | `Opening Quest: Chess Openings` |
| Default language | English (United States) – en-US |
| App or game | **Game** |
| Free or paid | **Free** |
| Developer Program Policies | ✅ tick |
| Play App Signing | ✅ tick (Google keeps the final signing key; you keep the upload key) |
| US export laws | ✅ tick |

## Step 5 – "Set up your app" (Dashboard → App content)

### Privacy policy
`[PRIVACY POLICY URL]` (from step 2)

### App access
**All functionality in my app is available without any access restrictions.**

### Ads
**No, my app does not contain ads.**

### Content rating (IARC questionnaire)
- Email: `[YOUR CONTACT EMAIL]`
- Category: **Game** (it may also offer "All other app types": choose Game)

| Question | Answer |
|---|---|
| Violence (any kind, including cartoon/fantasy) | No |
| Fear / horror | No |
| Sexuality / nudity | No |
| Language (profanity, crude humour) | No. Bots only use mild friendly teasing, no swearing |
| Controlled substances (drugs, alcohol, tobacco) | No |
| Gambling, simulated gambling, betting on outcomes | No |
| Real-money gambling / loot boxes | No |
| Does the app let users interact or exchange content with each other (chat, sharing)? | No |
| Does the app share the user's current location with other users? | No |
| Can users buy digital goods? | No |
| Is it a web browser or search engine? | No |
| Unrestricted internet access? | No |
| Does it contain promotion of age-restricted products? | No |

Expected result: **Everyone / PEGI 3 / USK 0**.

### Target audience and content
| Question | Answer |
|---|---|
| Target age groups | **13–15, 16–17, 18 and over** |
| Could your store listing unintentionally appeal to children? | **No** |
| (if asked) Does the app appeal to children? | No. It's a chess training tool for teens and adults |

> Choosing an under-13 age group puts the app under Google's **Families policy** (extra review and rules). With no ads and no data collection the app would likely pass, but 13+ is the fastest route. You can add younger ages later.

### News app
**No.**

### COVID-19 contact tracing / status
**My app is not a publicly available COVID-19 app.**

### Data safety
| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** (only because the optional Chess.com username leaves the device) |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS) |
| Which account creation methods does your app support? | **My app does not allow users to create an account** |
| Do you provide a way for users to request that their data is deleted? | **No**. Nothing is stored on any server; on-device data is deleted with "Reset progress" or by uninstalling |

Data types – tick **only**:
- **Personal info → User IDs** (the Chess.com username typed for import)
  - Collected: **Yes**. Shared: **No** (the user sends it to Chess.com themselves to load their games; that counts as a user-initiated transfer, not sharing)
  - Processed ephemerally: **Yes**
  - Required or optional: **Optional** (users can choose whether to use import)
  - Why collected: **App functionality**

Everything else (location, contacts, financial, health, messages, photos, audio, files, calendar, app activity, web history, device IDs, crash logs, diagnostics): **not collected**.

### Advertising ID
**No**, my app does not use the advertising ID.

### Government apps
**No.**

### Financial features
**My app doesn't provide any financial features.**

### Health apps
**My app does not have any health features.**

## Step 6 – Store listing (Grow → Store presence → Main store listing)

**App name** (max 30):
```
Opening Quest: Chess Openings
```

**Short description** (max 80):
```
Learn 46 chess openings, beat 10 bot levels in each, and analyse your games.
```

**Full description** (max 4000):
```
Master the chess openings, one move at a time.

Opening Quest teaches you 46 openings – from the Italian Game and Ruy López to the Sicilian, Caro-Kann, King's Indian and London – and then makes you prove them against bots that get stronger every level.

LEARN EVERY OPENING
• Guided lessons: an arrow shows the next move and every move is explained in plain English
• Wrong move? A ✕ appears beside the piece and the move is taken back so you can try again
• Drills: play the line from memory, with no arrows

10 LEVELS PER OPENING
• Each level's bot answers with a different variation and plays stronger (400 → 2200)
• Play your opening correctly, then beat the bot
• Earn stars and titles: Strong Beginner, Intermediate, Advanced and Master

9 BOTS WITH PERSONALITY
• Friendly coaches, patient teachers and trash-talking rivals
• Pick any rating from 400 to 2500 and play as White, Black or random

ANALYSE YOUR GAMES
• Import your recent Chess.com games by username, or paste any PGN
• Every move checked by the built-in Stockfish engine
• Accuracy, an evaluation graph, your key mistakes and what you should have played instead

PLAY YOUR WAY
• Advantage bar, move grades and hints – or switch them all off and get a review at the end
• Confirm moves, premoves, hold-and-drag arrows, take-backs
• 9 boards, 7 piece sets, dark and light mode
• Works offline. No ads, no account, no tracking.

Opening Quest is free and open source (GPL-3.0). Source code: [SOURCE CODE URL]
Uses Stockfish 17.1 (GPL-3.0). Not affiliated with Chess.com.
```

**Graphics**
- App icon: `store/graphics/icon-512.png`
- Feature graphic: `store/graphics/feature-graphic-1024x500.png`
- Phone screenshots (2–8): all 8 from `store/screenshots/phone/` in number order
- Tablet screenshots: optional. Skip, or upload the phone ones if Play insists.
- Video: optional. Leave empty.

**Categorisation**
- App category: **Board**
- Tags (choose up to 5 from Google's list): **Chess**, **Board**, **Strategy**, **Educational**, **Single player**

**Contact details**
- Email: `[YOUR CONTACT EMAIL]` (shown publicly)
- Website: optional (your GitHub page works)
- Phone: optional

**Store settings / Pricing**
- Price: Free
- Countries: All countries (or choose)

## Step 7 – Closed test (needed before production for new personal accounts)

1. Testing → **Closed testing** → Create track (e.g. "Testers") → **Create new release**.
2. Upload `dist/OpeningQuest-1.5.0.aab`.
3. Release name: `1.5.0`. Release notes:
   ```
   <en-US>
   First release: 46 openings, 10 levels each, 9 bots, Chess.com game analysis, boards, piece sets, light mode.
   </en-US>
   ```
4. **Testers** tab → create an email list with **at least 12 Gmail addresses** (friends, family, chess club, or communities like r/AndroidClosedTesting).
5. Send them the **opt-in link**. Each tester must open it, tap "Become a tester", install the app from Play, and **stay opted in for 14 days**. Ask them to actually open and play it a few times, because Google checks engagement.
6. Countries: all.
7. Review → **Start rollout to closed testing**. Google reviews it (usually 1–7 days).

### After 14 days: "Apply for production" – ready answers

| Question | Draft answer (edit to match what really happened) |
|---|---|
| How did you recruit users for your closed test? | I invited friends, family and members of a chess community by email and shared the opt-in link with them. |
| How easy was it to recruit testers? | (pick the honest option, e.g.) Neither easy nor difficult |
| Describe the engagement you received from testers | Testers played lessons and level games over the two weeks, tried the bots at different ratings and imported their Chess.com games for analysis. [add numbers from the Statistics page if you have them] |
| Summary of feedback, and how you collected it | I collected feedback through messages and a short form. Testers liked the opening lessons and bot personalities; they asked for [e.g. stronger bots / bigger buttons]. |
| Who is the intended audience? | Chess players aged 13+ – beginners to club players – who want to learn openings and improve their games. |
| How does your app provide value to users? | It teaches 46 chess openings step by step, lets players practise them against bots of increasing strength, and analyses their real games with Stockfish to explain mistakes – free, offline, with no ads or account. |
| How many installs do you expect in the first year? | (pick a realistic range, e.g.) 1,000 – 10,000 |
| What changes did you make based on testing? | [list fixes, e.g. made bots stronger, moved review buttons under the board, added light mode] |
| How did you decide the app is ready for production? | All testers could complete lessons and games without crashes, the feedback was addressed, and Play Console's pre-launch report showed no critical issues. |

## Step 8 – Production

Production → **Create new release** → upload the same (or a newer) `.aab` → release notes → **Start rollout**. Google reviews it (hours to several days). After that it's live.

## Checklist before you press "rollout"

- [ ] Upload key backed up in 2 places
- [ ] Privacy policy online and URL pasted
- [ ] Source code on GitHub (without the keystores) and URL in description
- [ ] `[YOUR NAME]`, `[YOUR CONTACT EMAIL]`, `[SOURCE CODE URL]` replaced everywhere
- [ ] App tested on your own phone from the closed-testing track

## Things to know

- The package name `com.openingquest.app` is permanent once uploaded. If Play says it's taken, change `package=` in `android/AndroidManifest.xml` (e.g. `com.yourname.openingquest`) and rebuild.
- "Opening Quest" may be similar to other app names. That's allowed, but if Google flags it, add your own twist.
- Don't use the Chess.com logo anywhere. Mentioning the name with "Not affiliated with Chess.com" is fine.
- Every year Google raises the minimum target API (currently Android 16 / API 36). Updates must keep up.
