# Opening Quest ♞

A mobile chess trainer: learn 46 openings, beat 10 levels of each, play characterful bots and get your Chess.com games analysed.

## Install (Android)
Copy `dist/OpeningQuest-1.5.1.apk` to your phone (it installs over earlier versions and keeps your progress) and open it. Android will ask you to allow installing apps from that source (Files / Chrome) the first time.

## What's inside
- **46 openings** (22 as White, 24 as Black), each with a description, key ideas and the main line.
- **Lessons**: a green arrow shows your next move, each move is explained, and a wrong move gets a red ✕ next to the piece and is taken back.
- **Drills**: the same line with no arrows (the arrow appears after 2 misses).
- **10 levels per opening**: every level's bot answers with a *different* variation and plays stronger (400 → 2200). Play the opening (three lives for moves that leave it), then beat the bot. Stars: win · no opening mistakes · no take-backs/hints. Titles: Strong Beginner (level 3), Intermediate (5), Advanced (8), Master (10).
- **9 bots with personalities**: Pip the Pawn and Grandma Rosa encourage you, Sassy Sam and the Blitz Baron trash-talk your mistakes, Coach Lila, Professor Knightley and Master Hoshi teach, Iron Viktor intimidates and BEEP-9000 tells robot jokes. Rating slider 400–2500.
- **Help options**: arrow aid, advantage bar and coach tips can be switched on/off, or pick **No help** — then the game asks if you want a review at the end.
- **In-game**: advantage bar after every move, live move grades (★ best, ?! inaccuracy, ? mistake, ?? blunder) with a badge beside the piece, better-move arrows, hints and a Back button that rewinds your move.
- **Analyzer**: import your recent games from Chess.com by username (or paste a PGN). Every move is checked by Stockfish; you get accuracy, an eval graph, key mistakes and plain-English explanations of what went wrong and what to play instead.
- **Game settings**: dark, light or phone-matched appearance, sound, analysis during the game (or only at the end), Hint button, confirm moves, premoves, piece animation speed (off/fast/normal/slow), 9 boards and 7 piece sets.
- **Progress**: XP and ranks (Pawn → Grandmaster), 27 achievements, daily streak, rating, sounds and vibration.

## Look (1.5.1)
A warm dark design with dark-orange accents in the spirit of Lichess's minimal style: serif headings, thin line icons, no emoji. The bots' portraits, the walnut board, the home-screen scene and the app icon are rendered in Blender from procedurally modelled Staunton pieces (`tools/blender_assets.py`). A flat Slate board is available in Settings.

## Develop
```
node tools/serve.mjs 5180          # then open http://localhost:5180/index.html
node tools/test.mjs                # data, bots, analysis and engine tests
DEPTH=15 node tools/generate.mjs   # regenerate web/data/openings.json from tools/catalog.mjs
bash android/build.sh              # build + sign dist/OpeningQuest-1.5.1.apk (Android SDK + Android Studio JDK)
bash android/build-aab.sh           # signed app bundle for Google Play (dist/OpeningQuest-<version>.aab)
node tools/store-screenshots.mjs    # store screenshots (needs tools/serve.mjs running)
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P tools/blender_assets.py -- build/assets   # re-render 3D art
```
The Android app is a small WebView wrapper (`android/src/.../MainActivity.java`) that serves `web/` from the APK.

## Licences
Board sounds made from Kenney's Impact Sounds (CC0). Piece sets from Lichess (see web/vendor/piecesets/LICENSES.txt). Stockfish 17.1 via stockfish.js (GPLv3), chessground (GPLv3), chess.js (BSD-2-Clause); the app is GPL-3.0-or-later. Chess.com import uses Chess.com's public API; not affiliated with Chess.com.

## Publishing
See `store/PLAY-STORE-GUIDE.md` (Google Play, with every Play Console answer) and `store/APP-STORE-GUIDE.md` (iPhone; the `ios/` project builds on a Mac with Xcode).
