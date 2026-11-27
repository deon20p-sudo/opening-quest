// Named variations of every opening, checked move by move with chess.js and
// written to web/data/variations.json.   Run: node tools/variations.mjs
import { Chess } from '../web/vendor/chess.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

// [name, moves, one-line idea]
const V = {
  italian: [
    ['Giuoco Piano', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5', 'The classical centre: c3 and d4 build a big pawn duo in the middle.'],
    ['Giuoco Pianissimo', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O a6 a4 O-O Re1 Ba7', 'The slow, modern way: d3, a4 and Re1, then a later d4 or Nbd2-f1-g3.'],
    ['Evans Gambit', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O', 'Give a pawn to gain time for c3 and d4 and attack fast.'],
    ['Two Knights, quiet d3', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3', 'Against ...Nf6, protect e4 with d3 and play a calm manoeuvring game.'],
  ],
  'ruy-lopez': [
    ['Closed (Morphy) Defence', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3', 'The main road: keep the bishop, play c3, h3 and prepare d4.'],
    ['Berlin Defence', 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8', 'The "Berlin Wall": an early queen trade where White has the better pawns.'],
    ['Exchange Variation', 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5 Nb3', 'Double Black\'s pawns, then aim for a good endgame with a healthy majority.'],
    ['Marshall Attack', 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4', 'Black sacrifices a pawn for a kingside attack. Take it and defend with d4.'],
  ],
  scotch: [
    ['Classical (4...Bc5)', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7 Bc4', 'Defend d4 with Be3 and c3, then develop and castle.'],
    ['Mieses Variation', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2 Nd5 c4', 'Trade on c6 and kick the knight with e5 and c4 for more space.'],
    ['Steinitz (4...Qh4)', 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qh4 Nc3 Bb4 Be2 Qxe4 Nb5 Bxc3+ bxc3 Kd8 O-O', 'Let the queen grab e4, then use your lead in development.'],
    ['Scotch Gambit', 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 Nf6 cxd4 Bb4+ Bd2 Bxd2+ Nbxd2 d5 exd5 Nxd5 Qb3', 'Develop instead of recapturing on d4 and play for quick pressure.'],
  ],
  vienna: [
    ['Vienna Gambit', 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O Bd3', 'Strike with f4, gain space with e5 and attack on the kingside.'],
    ['Frankenstein-Dracula', 'e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 Nd6 Bb3 Nc6 Nb5 g6 Qf3 f5 Qd5 Qe7 Nxc7+ Kd8 Nxa8 b6', 'A wild line: White wins a rook, Black gets the knight trapped and an attack.'],
    ['Fianchetto Vienna', 'e4 e5 Nc3 Nc6 g3 Bc5 Bg2 d6 Nge2 Nge7 d3 O-O O-O', 'A quiet setup with the bishop on g2 and a later f4.'],
  ],
  'kings-gambit': [
    ['Kieseritzky Gambit', 'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6 d4', 'Break up Black\'s pawns with h4 and jump into e5.'],
    ['Modern Defence (3...d5)', 'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bb5+ c6 dxc6 Nxc6 d4 Bd6', 'Black returns the pawn for quick development; White aims at f4.'],
    ['Fischer Defence', 'e4 e5 f4 exf4 Nf3 d6 d4 g5 h4 g4 Ng1', 'Bobby Fischer\'s answer: White builds the centre and wins f4 back later.'],
    ['Falkbeer Countergambit', 'e4 e5 f4 d5 exd5 e4 d3 Nf6 dxe4 Nxe4 Nf3 Bc5 Qe2 Bf5', 'Black counter-attacks in the centre; White breaks it with d3.'],
  ],
  evans: [
    ['Accepted, 5...Ba5', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 d6 Qb3 Qd7 dxe5', 'Open the centre with d4 and use the queen on b3 against f7.'],
    ['Accepted, 5...Be7', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Be7 d4 Na5 Be2 exd4 Qxd4 Nf6 e5 Nc6 Qh4 Nd5 Qg3', 'Black hides the bishop; White gains space and attacks on the kingside.'],
    ['Compromised Defence', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3 Qb3 Qf6 e5 Qg6 Nxc3 Nge7 Ba3', 'Black grabs three pawns; White gets a huge lead in development.'],
    ['Evans Declined', 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bb6 a4 a5 b5 Nd4 Nxd4 Bxd4 c3 Bb6 d4 Qe7 O-O', 'If Black refuses the pawn, use it to gain space on the queenside.'],
  ],
  'fried-liver': [
    ['Main line (5...Na5)', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6 d4', 'The correct defence: White keeps an extra pawn, Black gets activity.'],
    ['Fried Liver Attack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Nb4 Qe4 c6 a3 Na6 d4 Nc7 O-O', 'Sacrifice the knight on f7 and hunt the king in the middle.'],
    ['Traxler Counterattack', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Bxf7+ Ke7 Bb3 Rf8 O-O d6 c3 Qe8', 'Against the wild ...Bc5, take on f7 with the bishop and keep it safe.'],
    ['Fritz Variation', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nd4 c3 b5 Bf1 Nxd5 cxd4 Qxg5 Bxb5+ Kd8 Qf3', 'Black plays ...Nd4; White takes the knight and keeps an extra piece.'],
  ],
  danish: [
    ['Accepted, 6...d5 defence', 'e4 e5 d4 exd4 c3 dxc3 Bc4 cxb2 Bxb2 d5 Bxd5', 'Two pawns given for two bishops raking the board; ...d5 gives one back.'],
    ['Sorokin Defence (4...d5)', 'e4 e5 d4 exd4 c3 d5 exd5 Qxd5 cxd4 Nc6 Nf3 Bg4 Be2 Bb4+ Nc3', 'Black declines with ...d5; White gets an isolated pawn and free play.'],
    ['Declined with 4...Nf6', 'e4 e5 d4 exd4 c3 Nf6 e5 Ne4 Bd3 Nc5 cxd4 Nxd3+ Qxd3 d6 Nf3', 'Push e5 to kick the knight and keep a strong centre.'],
  ],
  'bishops-opening': [
    ['Berlin Defence', 'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bd6 Nc3 dxe4 Ng5 O-O Ngxe4', 'Protect e4 with d3 and fight for the centre with pieces.'],
    ['Urusov Gambit', 'e4 e5 Bc4 Nf6 d4 exd4 Nf3 Nxe4 Qxd4 Nf6 Bg5 Be7 Nc3 c6 O-O-O d5', 'Give a pawn for quick development and castle queenside.'],
    ['Classical (2...Bc5)', 'e4 e5 Bc4 Bc5 Nf3 d6 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2', 'Mirror Black\'s bishop, then prepare d4 with c3.'],
    ['Vienna Hybrid', 'e4 e5 Bc4 Nf6 d3 Bc5 Nc3 d6 f4 Nc6 Nf3 a6 f5', 'Combine Bc4 with f4 for a kingside pawn storm.'],
  ],
  ponziani: [
    ['Jaenisch (3...Nf6)', 'e4 e5 Nf3 Nc6 c3 Nf6 d4 Nxe4 d5 Ne7 Nxe5 Ng6 Bd3 Nxe5 Bxe4 Bc5', 'Push d5 to chase the knight and win the e5 pawn back.'],
    ['Leonhardt (3...d5)', 'e4 e5 Nf3 Nc6 c3 d5 Qa4 Nf6 Nxe5 Bd6 Nxc6 bxc6 d3 O-O', 'Pin the c6 knight with Qa4 and take on e5.'],
    ['3...d6 Setup', 'e4 e5 Nf3 Nc6 c3 d6 d4 Nf6 Bd3 Bg4 d5 Ne7 h3', 'Against a solid setup, gain space with d4 and d5.'],
  ],
  'smith-morra': [
    ['Accepted, Classical', 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2 Be7 Rd1 e5 h3', 'Rooks on c1 and d1 pressure the open files against Black\'s d6 pawn.'],
    ['Accepted, ...e6 and ...Nge7', 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7 Bg5 f6 Be3 Ng6 Qe2', 'Use your lead in development before Black finishes castling.'],
    ['Declined, 3...Nf6', 'e4 c5 d4 cxd4 c3 Nf6 e5 Nd5 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb5', 'Like the Alapin: push e5 and keep a strong centre.'],
    ['Declined, 3...d5', 'e4 c5 d4 cxd4 c3 d5 exd5 Qxd5 cxd4 Nc6 Nf3 Bg4 Nc3 Qd6', 'Black hits back in the centre; White gets an active isolated pawn.'],
  ],
  alapin: [
    ['2...Nf6 Main Line', 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5 dxe5 Nxe5 Bd7', 'Kick the knight with e5 and get a strong d4 pawn.'],
    ['2...d5 Main Line', 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 O-O Nc6 Be3 cxd4 cxd4 Be7 Nc3 Qd6', 'Black\'s queen comes out early; develop with tempo.'],
    ['2...e6 French Style', 'e4 c5 c3 e6 d4 d5 exd5 exd5 Nf3 Nc6 Bb5 Bd6 dxc5 Bxc5 O-O Ne7 Nbd2', 'Take on d5 and play against Black\'s isolated pawn.'],
  ],
  'queens-gambit': [
    ['QGD Orthodox', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5', 'Pin the knight with Bg5 and press on the c-file.'],
    ['QGD Exchange', 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2 O-O Nge2', 'Swap on d5 and later advance on the queenside (the minority attack).'],
    ['Queen\'s Gambit Accepted', 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Qxd1 Rxd1 Bxc5', 'Win the pawn back with e3 and Bxc4 and use your free development.'],
    ['Slav Defence', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O Qe2', 'Stop ...b5 with a4, recover c4 and play e4.'],
  ],
  london: [
    ['vs ...c5 and ...Nc6', 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6 Bg3 O-O Bd3', 'The classic triangle c3-d4-e3 with the bishop outside the chain.'],
    ['vs ...Bf5', 'd4 d5 Bf4 Nf6 e3 Bf5 c4 e6 Nc3 Bb4 Qb3 Nc6 Nf3 O-O Be2', 'When Black copies with ...Bf5, play c4 and Qb3 against b7.'],
    ['vs King\'s Indian setup', 'd4 d5 Bf4 Nf6 e3 g6 Nf3 Bg7 Be2 O-O O-O c5 c3', 'Against ...g6, keep it solid and castle quickly.'],
    ['vs early ...Qb6', 'd4 d5 Bf4 c5 e3 Nc6 c3 Qb6 Qb3 c4 Qc2', 'Meet the b2 attack with Qb3; keep the queen close to defend.'],
  ],
  jobava: [
    ['vs ...e6', 'd4 Nf6 Nc3 d5 Bf4 e6 e3 Bd6 Bg3 O-O Nf3 b6 Bd3 Bb7 Ne5', 'Classic setup with the knight jumping to e5.'],
    ['vs ...c5', 'd4 Nf6 Nc3 d5 Bf4 c5 e3 cxd4 exd4 a6 Nf3 Nc6 Be2 Bg4 O-O e6', 'Recapture with the e-pawn and play actively with your pieces.'],
    ['vs ...Bf5', 'd4 Nf6 Nc3 d5 Bf4 Bf5 f3 e6 g4 Bg6 h4 h5 g5 Nfd7 e3', 'Chase the bishop with f3, g4 and h4.'],
    ['vs ...a6', 'd4 Nf6 Nc3 d5 Bf4 a6 e3 e6 Nf3 c5 Ne5 Nc6 Be2', 'Black stops Nb5; switch to a classical setup with Ne5.'],
  ],
  colle: [
    ['Colle-Koltanowski', 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 Nbd2 Bd6 O-O O-O dxc5 Bxc5 e4 Qc7 Qe2', 'Everything prepares the e4 break.'],
    ['Colle-Zukertort', 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 b3 Nc6 O-O Bd6 Bb2 O-O Nbd2 b6 Ne5 Bb7 a3', 'Bishop on b2, knight on e5, then attack the king.'],
    ['vs ...Bg4', 'd4 d5 Nf3 Nf6 e3 Bg4 c4 e6 Nc3 c6 h3 Bh5 Qb3 Qb6 Ne5', 'When the bishop leaves, hit b7 with c4 and Qb3.'],
    ['vs ...g6', 'd4 d5 Nf3 Nf6 e3 g6 Bd3 Bg7 O-O O-O b3 c5 Bb2 Nc6 Nbd2', 'Against a fianchetto, use the Zukertort setup with Bb2.'],
  ],
  trompowsky: [
    ['2...Ne4', 'd4 Nf6 Bg5 Ne4 Bf4 c5 f3 Qa5+ c3 Nf6 Nd2 cxd4 Nb3 Qb6 Qxd4', 'Kick the knight with f3 and build a big centre.'],
    ['2...e6', 'd4 Nf6 Bg5 e6 e4 h6 Bxf6 Qxf6 Nc3 d6 Qd2 g5 O-O-O Nc6', 'Give the bishop for a big centre and castle queenside.'],
    ['2...d5', 'd4 Nf6 Bg5 d5 Bxf6 exf6 e3 Bf5 c4 c6 Nc3 dxc4 Bxc4', 'Double Black\'s pawns, then play c4 against the centre.'],
    ['2...c5', 'd4 Nf6 Bg5 c5 Bxf6 gxf6 d5 Qb6 Qc1 f5 c3 Bg7 e3', 'Wreck Black\'s pawns and keep the centre closed with d5.'],
  ],
  catalan: [
    ['Open Catalan', 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 Be7 O-O O-O Qc2 a6 Qxc4 b5 Qc2 Bb7 Bd2', 'Get the pawn back with Qc2 and Qxc4; the g2 bishop does the rest.'],
    ['Closed Catalan', 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7 Qc2 c6 Nbd2 b6 e4 Bb7 b3', 'A slow squeeze: prepare e4 to open the long diagonal.'],
    ['Bogo-Catalan (3...Bb4+)', 'd4 Nf6 c4 e6 g3 Bb4+ Bd2 Be7 Bg2 d5 Nf3 O-O O-O c6 Qc2 b6 Bf4', 'Block the check with Bd2 and continue with the normal setup.'],
  ],
  english: [
    ['Reversed Sicilian', 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O Be7 d3', 'A Sicilian Dragon with an extra move for White.'],
    ['Symmetrical', 'c4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 Nf3 e6 O-O Nge7 d3 O-O Bd2', 'Both sides fianchetto; aim for b4 or d4 breaks.'],
    ['Four Knights', 'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 Bb4 Bg2 O-O O-O e4 Ng5 Bxc3 bxc3 Re8 f3', 'Black grabs space with ...e4; undermine it with f3.'],
    ['Mikenas Attack', 'c4 Nf6 Nc3 e6 e4 d5 e5 d4 exf6 dxc3 bxc3 Qxf6 d4', 'Grab the centre with e4 and e5 against the Anglo-Indian.'],
  ],
  reti: [
    ['2...e6', 'Nf3 d5 c4 e6 g3 Nf6 Bg2 Be7 O-O O-O b3 c5 Bb2 Nc6 e3', 'Hit the centre from the side with bishops on g2 and b2.'],
    ['2...d4', 'Nf3 d5 c4 d4 e3 Nc6 exd4 Nxd4 Nxd4 Qxd4 Nc3 Nf6 d3 Bg4', 'Black grabs space; break it up with e3.'],
    ['2...dxc4', 'Nf3 d5 c4 dxc4 e3 Nf6 Bxc4 e6 O-O c5 b3 Nc6 Bb2 Be7 d4', 'Take the pawn back with e3 and Bxc4 and develop.'],
    ['2...c6', 'Nf3 d5 c4 c6 b3 Nf6 g3 Bf5 Bg2 e6 Bb2 Nbd7 O-O h6 d3', 'Against a solid Slav setup, double fianchetto and play slowly.'],
  ],
  kia: [
    ['vs French setup', 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6 Re1', 'Play e4 and push e5, then attack the king.'],
    ['vs ...c5 and ...e5', 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e5 d3 Nf6 e4 Be7 Nbd2 O-O c3', 'Against a big centre, hit back with e4 and c3.'],
    ['vs ...Bg4', 'Nf3 d5 g3 Bg4 Bg2 Nd7 O-O c6 d3 e5 h3 Bh5 e4 Ngf6 Nbd2', 'Ask the bishop with h3 and play e4.'],
    ['vs ...g6', 'Nf3 d5 g3 g6 Bg2 Bg7 O-O e5 d3 Ne7 e4 O-O c3', 'A mirrored King\'s Indian with an extra move.'],
  ],
  bird: [
    ['From\'s Gambit', 'f4 e5 fxe5 d6 exd6 Bxd6 Nf3 g5 g3 g4 Nh4 Ne7 d4', 'Take the pawn, defend calmly with g3 and Nh4.'],
    ['Reversed Dutch (1...d5)', 'f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O d3 c5 Qe1 Nc6 Qh4', 'Queen to h4 and a kingside attack.'],
    ['Leningrad style', 'f4 Nf6 Nf3 g6 g3 Bg7 Bg2 O-O O-O d6 d3 c5 Qe1 Nc6 e4', 'Fianchetto and prepare e4.'],
    ['vs ...c5', 'f4 c5 Nf3 Nc6 e3 g6 Bb5 Bg7 O-O Nf6 Bxc6 dxc6 d3', 'Trade on c6 and keep a firm grip on e5.'],
  ],
  sicilian: [
    ['Najdorf', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O', '...a6 controls b5 and prepares ...e5 or ...b5.'],
    ['Dragon', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8', 'The g7 bishop breathes fire down the long diagonal.'],
    ['Sveshnikov', 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 Nd5 f5', 'Black accepts a hole on d5 for active pieces and the two bishops.'],
    ['Taimanov', 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be2 a6 O-O Nf6 Be3 Bb4', 'Flexible play with the queen on c7 and quick pressure on e4.'],
  ],
  najdorf: [
    ['English Attack (6.Be3)', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5', 'Opposite-side castling: race your pawns at the white king.'],
    ['Poisoned Pawn (6.Bg5)', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qb6 Qd2 Qxb2 Rb1 Qa3 f5 Nc6 fxe6 fxe6 Nxc6 bxc6', 'The famous pawn grab on b2. Sharp, but sound.'],
    ['Opocensky (6.Be2)', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Qd2 Nbd7 a4', 'Against the quiet Be2, take space with ...e5 and develop.'],
    ['Fischer-Sozin (6.Bc4)', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6 Bb3 b5 O-O Be7 Qf3 Qc7 Qg3 O-O Bh6 Ne8', 'Block the bishop with ...e6 and expand with ...b5.'],
  ],
  dragon: [
    ['Yugoslav Attack, 9.Bc4', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5 h4 h5', 'Stop White\'s h-pawn with ...h5 and counter on the c-file.'],
    ['Yugoslav Attack, 9.O-O-O', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O d5 exd5 Nxd5 Nxc6 bxc6 Bd4', 'Break in the centre right away with ...d5.'],
    ['Classical (6.Be2)', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O Be3 Nc6 Nb3 Be6 f4 Qc8', 'Against quiet play, put pieces on active squares.'],
    ['Fianchetto (6.g3)', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 g3 Nc6 Nde2 Bg7 Bg2 O-O O-O Rb8 a4 a6 h3 b5 axb5 axb5', 'Expand on the queenside with ...Rb8 and ...b5.'],
  ],
  french: [
    ['Advance Variation', 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5', 'Attack the pawn chain at d4 with ...c5, ...Nc6 and ...Qb6.'],
    ['Winawer', 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 O-O Bd3 Nbc6', 'Pin the knight and double White\'s pawns.'],
    ['Tarrasch', 'e4 e6 d4 d5 Nd2 c5 exd5 Qxd5 Ngf3 cxd4 Bc4 Qd6 O-O Nf6 Nb3 Nc6 Nbxd4 Nxd4 Nxd4 a6', 'Free piece play in exchange for an open position.'],
    ['Exchange Variation', 'e4 e6 d4 d5 exd5 exd5 Nf3 Bd6 Bd3 Ne7 O-O O-O Re1 Bg4', 'A symmetrical pawn structure; your light bishop is free.'],
  ],
  'caro-kann': [
    ['Classical (4...Bf5)', 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6', 'Develop the bishop outside the pawn chain, then ...e6.'],
    ['Advance Variation', 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Nd7 O-O Ne7 c4', 'Bishop out first, then hit the chain with ...c5.'],
    ['Exchange Variation', 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6', 'A calm structure; develop the light bishop before ...e6.'],
    ['Panov Attack', 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5 Qc2 Nc6', 'Play against White\'s isolated d-pawn.'],
  ],
  scandinavian: [
    ['Main Line (3...Qa5)', 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6 Qe2 Bb4', 'The queen sits safely on a5; develop with ...c6, ...Bf5 and ...e6.'],
    ['Modern (3...Qd6)', 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 Bg4 Bg2 Nc6 O-O O-O-O', 'Queen on d6 and queenside castling for a fighting game.'],
    ['Retreat (3...Qd8)', 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4 h3 Bxf3 Qxf3 c6 Be3 e6 Bd3 Nbd7', 'The safest square for the queen; solid like a Caro-Kann.'],
    ['Modern (2...Nf6)', 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 c4 Nb6 Nc3 Bg7 h3 O-O Be3', 'Recapture with the knight and fianchetto.'],
  ],
  pirc: [
    ['Austrian Attack', 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 Bg4', 'Against White\'s big centre, strike back with ...c5.'],
    ['Classical', 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7 h3 e5', 'Prepare ...e5 to fight for the centre.'],
    ['150 Attack', 'e4 d6 d4 Nf6 Nc3 g6 Be3 c6 Qd2 b5 f3 Nbd7 Nh3 Bb7 Nf2 Qc7', 'Against Be3 and Qd2, counter on the queenside with ...b5.'],
    ['Byrne (4.Bg5)', 'e4 d6 d4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 h6 Bh4 c6 f3 b5', 'Ask the bishop with ...h6 and expand with ...b5.'],
  ],
  modern: [
    ['Standard (...a6, ...b5)', 'e4 g6 d4 Bg7 Nc3 d6 Be3 a6 Qd2 Nd7 f4 b5 Nf3 Bb7 Bd3 c5', 'Let White build a centre, then attack it with ...b5 and ...c5.'],
    ['Averbakh (3.c4)', 'e4 g6 d4 Bg7 c4 d6 Nc3 Nc6 Be3 e5 d5 Nce7 Bd3 f5', 'Against c4, close the centre and play ...f5.'],
    ['Gurgenidze (...c6)', 'e4 g6 d4 Bg7 Nc3 c6 Bc4 d6 Qf3 e6 Nge2 b5 Bb3 a5 a3 Nd7', 'Stop the f7 attack with ...e6, then expand on the queenside.'],
    ['Hippopotamus', 'e4 g6 d4 Bg7 Nf3 d6 Be2 e6 O-O Ne7 c4 b6 Nc3 Bb7 Be3 Nd7 Qd2 h6', 'Pawns on the 3rd rank and pieces behind them, waiting to spring.'],
  ],
  alekhine: [
    ['Modern (4.Nf3)', 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Bg4 Be2 e6 O-O Be7 c4 Nb6 Nc3 O-O Be3 d5', 'Pin the f3 knight and attack the centre.'],
    ['Four Pawns Attack', 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6 Nf3 Be7', 'White grabs everything; you attack the overextended pawns.'],
    ['Exchange Variation', 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 exd6 cxd6 Nc3 g6 Be3 Bg7 Rc1 O-O b3 e5', 'Recapture towards the centre and fianchetto.'],
    ['Two Knights (2.Nc3)', 'e4 Nf6 Nc3 d5 e5 Nfd7 d4 e6 f4 c5 Nf3 Nc6 Be3', 'A French-style structure: attack the centre with ...c5.'],
  ],
  petrov: [
    ['Classical (3.Nxe5)', 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7 c4 Nb4 Be2 O-O Nc3 Bf5 a3 Nxc3 bxc3 Nc6', 'Kick the knight first with ...d6, then take on e4.'],
    ['Steinitz (3.d4)', 'e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6 c4 c6 Nc3 Nxc3 bxc3 dxc4 Bxc4 O-O', 'Hit back in the centre and trade pieces.'],
    ['Nimzowitsch (5.Nc3)', 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Nc3 Nxc3 dxc3 Be7 Be3 Nc6 Qd2 Be6 O-O-O Qd7', 'White castles long; you castle short and keep it solid.'],
    ['5.Qe2', 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Qe2 Qe7 d3 Nf6 Bg5 Qxe2+ Bxe2 Be7 Nc3 c6', 'Trade queens and reach an equal endgame.'],
  ],
  philidor: [
    ['Hanham Variation', 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O Re1 c6 a4 b6', 'Hold the e5 strongpoint with ...Nbd7 and ...c6.'],
    ['Exchange (3...exd4)', 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Nf6 Nc3 Be7 Be2 O-O O-O Re8 f4 Bf8 Bf3', 'Give up the centre and pressure e4.'],
    ['Lion Setup', 'e4 d6 d4 Nf6 Nc3 e5 Nf3 Nbd7 Bc4 Be7 O-O O-O Re1 c6', 'Reach the Philidor through a different move order.'],
    ['Larsen (...g6)', 'e4 e5 Nf3 d6 d4 exd4 Nxd4 g6 Nc3 Bg7 Be3 Nf6 Qd2 O-O O-O-O Re8 f3 Nc6', 'Fianchetto and hit the centre from the side.'],
  ],
  'two-knights': [
    ['4.Ng5 d5 5.exd5 Na5', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5 Bd6 d4 exd3 Nxd3 Qc7', 'Give a pawn for fast, active development.'],
    ['4.d3 Modern', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3 Na5 Bb5 a6 Ba4 b5 Bc2 c5', 'Chase the bishop with ...Na5 and expand on the queenside.'],
    ['4.d4 (Max Lange)', 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3 Qa5 Nxe4 Be6 Neg5 O-O-O Nxe6 fxe6 Rxe6 Bd6', 'Return material at the right moment and castle long.'],
    ['Traxler (4...Bc5)', 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Bxf7+ Ke7 Bb3 Rf8 O-O d6 c3 Qe8 d4 Bb6', 'A wild counterattack: ignore f7 and go for the white king.'],
  ],
  stafford: [
    ['Declined with 4.Nf3', 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nf3 Nxe4 Qe2 Qe7 d3 Nf6 Bg5 Qxe2+ Bxe2 Be7', 'If White retreats, win the pawn back on e4 and equalise.'],
    ['5.d3 Bc5 6.Bg5?? trap', 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Bg5 Nxe4 Bxd8 Bxf2+ Ke2 Bg4#', 'The famous trap: if White grabs your queen, it\'s mate.'],
    ['5.e5 Ne4 6.d4?? trap', 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 e5 Ne4 d4 Qh4 g3 Nxg3 fxg3 Qe4+ Qe2 Qxh1', 'Fork the king and rook with ...Qe4+ and win the exchange.'],
  ],
  'kings-indian': [
    ['Classical, Mar del Plata', 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7 Nd3 f5', 'Close the centre and storm the kingside with ...f5.'],
    ['Sämisch', 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5 Qd2 f5 O-O-O Nd7', 'Against f3, aim for ...f5 with the knight on h5.'],
    ['Four Pawns Attack', 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f4 O-O Nf3 c5 d5 e6 Be2 exd5 cxd5 Bg4 O-O Nbd7', 'Undermine White\'s big centre with ...c5 and ...e6.'],
    ['Fianchetto', 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nc6 Nc3 a6 d5 Na5 Nd2 c5 Qc2 Rb8', 'The Panno setup: ...a6, ...Rb8 and ...b5.'],
  ],
  'nimzo-indian': [
    ['Rubinstein (4.e3)', 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3 dxc4 Bxc4 Qc7', 'Castle, strike with ...d5 and ...c5, and pressure c4.'],
    ['Classical (4.Qc2)', 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6 Bg5 Bb7 f3 h6 Bh4 d5 e3 Nbd7', 'White keeps the pawns healthy; you fight for e4 with ...b6 and ...Bb7.'],
    ['Sämisch (4.a3)', 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 f3 d5 cxd5 exd5 e3 O-O Bd3 Nc6 Ne2 Re8', 'Take on c3 at once and attack the doubled pawns.'],
    ['Kasparov (4.Nf3)', 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3 c5 g3 cxd4 Nxd4 O-O Bg2 d5 cxd5 Nxd5 Qb3 Qa5', 'Against the fianchetto, open the centre with ...c5 and ...d5.'],
  ],
  'queens-indian': [
    ['Fianchetto, 4...Ba6', 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6 Bc3 d5 Ne5 Nfd7 Nxd7 Nxd7 Nd2 O-O O-O', 'Hit c4 with ...Ba6, then play ...c6 and ...d5.'],
    ['Petrosian (4.a3)', 'd4 Nf6 c4 e6 Nf3 b6 a3 Bb7 Nc3 d5 cxd5 Nxd5 Qc2 Nxc3 bxc3 Be7 e4 O-O Bd3 c5', 'Trade knights and attack White\'s centre with ...c5.'],
    ['4.Nc3 Bb4', 'd4 Nf6 c4 e6 Nf3 b6 Nc3 Bb4 Bg5 Bb7 e3 h6 Bh4 g5 Bg3 Ne4 Qc2 Bxc3+ bxc3 d6 Bd3 f5', 'Take control of e4 with ...Bb4, ...Bb7 and ...Ne4.'],
    ['Spassky (4.e3)', 'd4 Nf6 c4 e6 Nf3 b6 e3 Bb7 Bd3 d5 O-O Bd6 Nc3 O-O b3 Nbd7 Bb2 a6', 'Against a quiet setup, play ...d5 and ...Bd6.'],
  ],
  qgd: [
    ['Orthodox', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7 Rc1 c6 Bd3 dxc4 Bxc4 Nd5 Bxe7 Qxe7 O-O Nxc3 Rxc3 e5', 'Capablanca\'s freeing manoeuvre: trade pieces, then ...e5.'],
    ['Tartakower', 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6', 'Develop the light bishop on the long diagonal or e6.'],
    ['Exchange Variation', 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 c6 e3 Be7 Bd3 Nbd7 Qc2 O-O Nge2 Re8 O-O Nf8', 'Reroute the knight via f8 to defend and attack.'],
    ['Tarrasch Defence', 'd4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6 Bg2 Be7 O-O O-O Bg5 cxd4 Nxd4 h6 Be3 Re8', 'Accept an isolated pawn for free, active pieces.'],
  ],
  slav: [
    ['Main Line (4...dxc4)', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O O-O Qe2 Nbd7 e4 Bg6', 'Take on c4, develop the bishop to f5, then ...e6 and ...Bb4.'],
    ['Exchange Slav', 'd4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6 Bf4 Nc6 e3 Bf5 Nf3 e6 Bb5 Bb4 Ne5 Qa5', 'Symmetry, but active pieces make the difference.'],
    ['Semi-Slav Meran', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6 e4 c5 d5 Qc7', 'Grab space on the queenside with ...b5 and break with ...c5.'],
    ['Chebanenko (4...a6)', 'd4 d5 c4 c6 Nf3 Nf6 Nc3 a6 e3 b5 b3 Bg4 h3 Bxf3 Qxf3 e6 Bd2 Nbd7', 'A flexible ...a6 that prepares ...b5.'],
  ],
  qga: [
    ['Classical', 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 Bb3 Nc6 Nc3 cxd4 exd4 Be7 Bg5 O-O', 'Give the pawn back and play against the isolated d-pawn.'],
    ['Central (3.e4)', 'd4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4 Nc6 O-O Be6 Bxe6 fxe6 Qb3 Qd7 Qxb7 Rb8 Qa6 Nf6', 'Hit back at once with ...e5.'],
    ['3.e3 e5', 'd4 d5 c4 dxc4 e3 e5 Bxc4 exd4 exd4 Nf6 Nf3 Be7 O-O O-O Nc3 Nbd7', 'Swap off White\'s d-pawn and get easy development.'],
    ['3.Nf3 a6 (hold the pawn)', 'd4 d5 c4 dxc4 Nf3 a6 e3 b5 a4 Bb7 axb5 axb5 Rxa8 Bxa8 b3 e6 bxc4 bxc4 Bxc4 Nf6', 'Try to keep the pawn with ...a6 and ...b5.'],
  ],
  grunfeld: [
    ['Exchange, Nf3', 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be3 Bg4 Rc1 Qa5 Qd2 O-O', 'Let White build a centre, then attack it with ...c5 and ...Bg4.'],
    ['Exchange, Bc4', 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O Bg4 f3 Na5', 'Pressure d4 and chase the bishop with ...Na5.'],
    ['Russian System (5.Qb3)', 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 Bg4 Be3 Nfd7 Qb3 Nb6', 'Give up the centre, then hit it with ...Bg4 and ...Nfd7.'],
    ['4.Bf4', 'd4 Nf6 c4 g6 Nc3 d5 Bf4 Bg7 e3 c5 dxc5 Qa5 Rc1 dxc4 Bxc4 O-O Nf3 Qxc5 Bb3 Nc6 O-O Qa5', 'Sacrifice c5 for a moment and win it back with ...Qa5.'],
  ],
  dutch: [
    ['Leningrad', 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6', 'Fianchetto, then ...Qe8 and ...e5.'],
    ['Stonewall', 'd4 f5 g3 Nf6 Bg2 e6 Nf3 d5 O-O Bd6 c4 c6 b3 Qe7 Ne5 O-O Bb2', 'Pawns on c6, d5, e6 and f5 grab e4 for good.'],
    ['Classical', 'd4 f5 c4 Nf6 g3 e6 Bg2 Be7 Nf3 O-O O-O d6 Nc3 Qe8 Re1 Qg6 e4 fxe4 Nxe4', 'Queen to g6 for a kingside attack.'],
    ['vs Staunton Gambit', 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 Nc6 d5 Ne5 Qd4 Nf7 Bxf6 exf6 Nxe4 f5 Ng3', 'Take the pawn and give it back to finish development.'],
  ],
  benoni: [
    ['Classical', 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O Re8 Nd2 Na6 f3 Nc7', 'Queenside majority and a monster bishop on g7.'],
    ['Fianchetto', 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 g3 Bg7 Bg2 O-O O-O a6 a4 Nbd7 Nd2 Re8', 'Prepare ...b5 and ...Re8 against White\'s fianchetto.'],
    ['Taimanov Attack', 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6 O-O', 'The dangerous Bb5+ line: block with ...Nfd7 and fight for e5.'],
    ['Modern Main Line (h3)', 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7 h3 O-O Bd3 b5 Bxb5 Nxe4 Nxe4 Qa5+', 'A pawn sac with ...b5 and a tactic that wins it back.'],
  ],
  benko: [
    ['Accepted, Fianchetto', 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 Nf3 d6 g3 Bg7 Bg2 Nbd7 O-O O-O Qc2 Qa5', 'Long-lasting pressure on the a- and b-files.'],
    ['Accepted, King Walk', 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 g6 Nc3 Bxa6 e4 Bxf1 Kxf1 d6 Nf3 Bg7 g3 O-O Kg2 Nbd7', 'White loses the right to castle; open lines on the queenside.'],
    ['5.b6', 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 b6 Qxb6 Nc3 d6 e4 g6 Nf3 Bg7 a4 O-O a5 Qb7', 'White returns the pawn; you get easy development.'],
    ['Declined (4.Nf3)', 'd4 Nf6 c4 c5 d5 b5 Nf3 Bb7 a4 bxc4 Nc3 g6 e4 d6 Bxc4 Bg7 O-O O-O', 'Pressure d5 with ...Bb7 and fianchetto.'],
  ],
  budapest: [
    ['Rubinstein (4.Bf4)', 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 e3 Ngxe5 Nxe5 Nxe5 Be2 O-O O-O Bxd2 Qxd2 d6', 'Win the pawn back on e5 and develop smoothly.'],
    ['Alekhine (4.e4)', 'd4 Nf6 c4 e5 dxe5 Ng4 e4 Nxe5 f4 Nec6 Be3 Bb4+ Nc3 Qh4+ g3 Bxc3+ bxc3 Qe7 Bd3', 'White grabs the centre; hit it with checks and ...Qe7.'],
    ['4.Nf3', 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Be2 Ngxe5 Nxe5 Nxe5 O-O O-O Nc3 Re8 b3 a5', 'Bishop to c5 eyes f2; recapture on e5 with a knight.'],
    ['Fajarowicz (3...Ne4)', 'd4 Nf6 c4 e5 dxe5 Ne4 Nf3 Nc6 a3 d6 exd6 Bxd6 Nbd2 Bf5 Nxe4 Bxe4 e3 Qe7', 'A tricky knight jump to e4 and fast development.'],
  ],
};

const data = JSON.parse(readFileSync(new URL('../web/data/openings.json', import.meta.url)));
const byId = Object.fromEntries(data.openings.map((o) => [o.id, o]));
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const out = {};
let bad = 0, n = 0;
for (const [id, list] of Object.entries(V)) {
  const o = byId[id];
  if (!o) { console.error('unknown opening', id); bad++; continue; }
  out[id] = list.map(([name, line, idea]) => {
    const moves = line.split(/\s+/);
    const g = new Chess();
    moves.forEach((san, i) => {
      try { g.move(san); } catch { console.error(`${id} / ${name}: illegal ${san} at ply ${i + 1}`); bad++; }
    });
    const canon = g.history();
    if (canon.length === moves.length) canon.forEach((s, i) => { if (s !== moves[i]) { console.error(`${id} / ${name}: write ${s} not ${moves[i]}`); bad++; } });
    if (!line.startsWith(o.core) && !['philidor'].includes(id)) console.warn(`  note: ${id} / ${name} does not start with the core ${o.core}`);
    n++;
    return { id: slug(name), name, moves: canon, idea };
  });
}
for (const o of data.openings) if (!out[o.id]) { console.error('no variations for', o.id); bad++; }
if (bad) { console.error(`${bad} problems`); process.exit(1); }
writeFileSync(new URL('../web/data/variations.json', import.meta.url), JSON.stringify(out));
console.log(`ok: ${n} variations for ${Object.keys(out).length} openings`);
