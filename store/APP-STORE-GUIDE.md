# Opening Quest on the Apple App Store: steps and ready answers

## What you need first

- **A Mac** with the latest **Xcode** (free from the Mac App Store). iPhone apps can only be built and uploaded from a Mac. A borrowed Mac or a cloud Mac (e.g. MacinCloud) works.
- **Apple Developer Program** membership: **US$99 per year** at <https://developer.apple.com/programs/enroll/>.
- An iPhone for testing is recommended (TestFlight).

> The iOS version (`ios/` folder) is written but has **not been built or run yet**, because that needs a Mac. Expect to fix small things the first time you build it.

## What's already made

| File | What it's for |
|---|---|
| `ios/project.yml` | Xcode project description (XcodeGen) |
| `ios/OpeningQuest/App.swift` | The iPhone app: the same web app in a WKWebView, served from the app bundle |
| `ios/OpeningQuest/Info.plist` | App settings (name, portrait only, no special encryption) |
| `ios/OpeningQuest/Assets.xcassets` | App icon (1024 × 1024) and launch colour |
| `store/screenshots/iphone-6.9/*.png` | 8 screenshots at 1320 × 2868 (the size Apple requires) |
| `store/privacy-policy.html` | Same privacy policy as Android (must be online) |

## Step 1 – Build it on the Mac

```bash
# copy the whole opening-quest folder to the Mac, then:
brew install xcodegen          # needs Homebrew: https://brew.sh
cd opening-quest/ios
xcodegen                       # creates OpeningQuest.xcodeproj
open OpeningQuest.xcodeproj
```
In Xcode:
1. Click the project → target **OpeningQuest** → **Signing & Capabilities** → tick *Automatically manage signing* → choose your **Team**.
2. If the bundle ID `com.openingquest.app` is taken, change it to e.g. `com.yourname.openingquest` (and use the same one in App Store Connect).
3. Plug in your iPhone (or choose a simulator) → press ▶ Run. Check that lessons, a bot game, review and Chess.com import work.

## Step 2 – App Store Connect: create the app

<https://appstoreconnect.apple.com> → My Apps → **+** → New App:

| Field | Answer |
|---|---|
| Platforms | iOS |
| Name (max 30) | `Opening Quest: Chess Openings` |
| Primary language | English (U.S.) |
| Bundle ID | `com.openingquest.app` (pick from the list; register it first under Certificates, IDs & Profiles if it isn't there) |
| SKU | `openingquest-ios-001` |
| User access | Full Access |

## Step 3 – Upload the build

In Xcode: choose **Any iOS Device (arm64)** → **Product → Archive** → Organizer opens → **Distribute App** → **App Store Connect** → Upload. It appears in App Store Connect under TestFlight after ~10–30 minutes.

Export compliance: already answered in `Info.plist` (`ITSAppUsesNonExemptEncryption = NO`, the app only uses standard HTTPS).

## Step 4 – App information

| Field | Answer |
|---|---|
| Subtitle (max 30) | `Learn, drill & beat the bots` |
| Category | Primary **Games → Board**; secondary **Education** |
| Content rights | "Does your app contain, show, or access third-party content?" → **Yes** (it loads public games from Chess.com when the user asks). "Do you have all necessary rights?" → **Yes** (Chess.com's public API is offered for this) |
| Age rating | Answer **None/No** to every item (violence, horror, mature themes, gambling, contests, profanity, medical, alcohol/drugs, sexual content, unrestricted web access, user-generated content/messaging). Result: **4+** |
| Privacy Policy URL | `[PRIVACY POLICY URL]` |
| Support URL | your GitHub page or website |

## Step 5 – App Privacy ("nutrition label")

Answer: **"No, we do not collect data from this app."**

Why that's correct: Apple counts data as *collected* only if it's kept longer than needed to answer the request. The Chess.com username is sent straight to Chess.com to fetch games in real time and isn't stored by you. Everything else stays on the phone.

## Step 6 – Version page (1.5.0)

**Screenshots:** iPhone 6.9" display → upload the 8 files from `store/screenshots/iphone-6.9/` (Apple scales them down for smaller iPhones).

**Promotional text** (170, can change any time):
```
46 openings, 10 bot levels each, Stockfish game analysis. No ads, no account.
```

**Description:** use the same full description as in `PLAY-STORE-GUIDE.md`.

**Keywords** (100 characters, comma-separated, no spaces needed):
```
chess,openings,trainer,stockfish,bots,lessons,gambit,sicilian,london,analysis,puzzle,strategy,learn
```

**Support URL / Marketing URL:** your GitHub or website.

**Version release:** Manually release (so you control the day) or Automatically.

**App Review Information**
- Sign-in required: **No**
- Contact: your name, phone, email
- Notes:
  ```
  No account is needed. To test: Home → "Begin with the Italian Game" for a guided lesson; Play tab for a bot game; Analyze tab → paste any PGN or type a public Chess.com username (e.g. "hikaru") to import and analyse games. The chess engine (Stockfish) runs fully on device.
  ```

**Build:** pick the build you uploaded → **Add for Review** → **Submit**.

## Things to know

- **Guideline 4.2 (minimum functionality):** Apple sometimes rejects apps that are "just a website". This one runs fully offline with an on-device engine, so it should pass; if rejected, reply that all content and the engine are bundled in the app and nothing is loaded from a website.
- **GPL licence:** Stockfish and chessground are GPL-3.0. Keep the source code public (GitHub) and linked in the description. Some people argue Apple's terms conflict with the GPL; several open-source Stockfish apps are on the App Store, but that's the one legal grey area to be aware of.
- Each update: raise `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in `ios/project.yml`, run `xcodegen` again, Archive, upload.
