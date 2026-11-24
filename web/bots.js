// Bot characters and their dialogue.
// Lines can use {move} (your move), {best} (better move), {reason} (why), {botmove}, {name} (your name).
// Lines containing {best} or {reason} are "help" lines and are hidden when help is turned off.

export const BOTS = [
  {
    id: 'pip', img: 'img/bots/pip.jpg', name: 'Pip the Pawn', elo: 450, emoji: '🐣', color: '#ffd166', style: 'Encourager',
    bio:'A boxwood pawn on its very first day at the board. Cheers for every move you make.',
    lines: {
 intro: ['Hi hi! I just learned chess yesterday. Be gentle!','Ooh, a game! I love games! Let\'s have fun!'],
 userBest: ['Wow, {move}! How did you see that?!','That was super smart!','You\'re really good at this!'],
 userGood: ['Nice move!','Ooh, that looks strong.','I like that one!'],
 userInaccuracy: ['Hmm, maybe {best} was a little better? Still fine!','That\'s okay! Keep going!'],
 userMistake: ['Oopsie! Maybe {best} next time? {reason}','Don\'t worry, everyone makes mistakes! Even me!'],
 userBlunder: ['Uh oh… {reason} But you can still do it!','Oh no! That one hurt a bit. You got this though!'],
 userCapture: ['Hey! That was my favourite piece!','Nooo, my little guy!'],
 botCapture: ['Yay, I took something! Is that allowed?','Hehe, gotcha!'],
 userCheck: ['Eek! My king is scared!','Check?! Ahh!'],
 botCheck: ['Check! I think? Is that how you say it?'],
 botWinning: ['Wait… am I winning? That never happens!'],
 botLosing: ['You\'re so good! I\'m learning so much!'],
 userWin: ['You won! Congratulations!! Teach me how!','GG! That was so fun!'],
 userLose: ['I… I won?! I need to tell my mom!','Good game! You\'ll beat me next time for sure!'],
 draw: ['A draw! We\'re both winners!'],
 takeback: ['Take-backs are totally fine! Try again!'],
    },
  },
  {
    id: 'rosa', img: 'img/bots/rosa.jpg', name: 'Grandma Rosa', elo: 750, emoji: '👵', color: '#f4a3c0', style: 'Encourager',
    bio:'A porcelain queen who has played in the park every Sunday for fifty years. Kind, patient and quietly sharp.',
    lines: {
 intro: ['Sit down, sweetie. Cookie? Now, let\'s play nicely.','Oh how lovely, a new friend to play with!'],
 userBest: ['Oh my, {move}! Your grandfather would be proud.','What a clever little move, dear.'],
 userGood: ['Very nice, dear.','That\'s a sensible move.'],
 userInaccuracy: ['Hmm, I might have played {best}, but you do you, sweetie.'],
 userMistake: ['Oh dear. {reason} Have another cookie and try again.','Careful, sweetheart. {best} was the move.'],
 userBlunder: ['Oh honey, no… {reason}','Ooh, that\'s a big oopsie, dear. Chin up!'],
 userCapture: ['Well! You don\'t mess around, do you?'],
 botCapture: ['Grandma takes that, thank you very much.','Don\'t mind if I do, dear.'],
 userCheck: ['My goodness, check! My heart!'],
 botCheck: ['Check, dear. Mind your king.'],
 botWinning: ['Grandma still has a few tricks, sweetie.'],
 botLosing: ['You\'re playing beautifully, dear.'],
 userWin: ['Well played, dear! Take a cookie for the road.'],
 userLose: ['Don\'t be sad, sweetie. Fifty years of practice, that\'s all.'],
 draw: ['A draw! How polite of us.'],
 takeback: ['Of course you can take that back, dear.'],
    },
  },
  {
    id: 'sam', img: 'img/bots/sam.jpg', name: 'Sassy Sam', elo: 1050, emoji: '😏', color: '#9b8cff', style: 'Trash talker',
    bio:'A lacquered rook who streams to twelve viewers and treats every move you make as content.',
    lines: {
 intro: ['Oh great, another victim. Let\'s make this quick, chat.','Hope you\'re ready to be in my highlight reel.'],
 userBest: ['Okay… that was actually decent. Don\'t let it go to your head.','Lucky. Pure luck.','Even a broken clock is right twice a day.'],
 userGood: ['Fine. Acceptable.','Meh. I\'ve seen worse.'],
 userInaccuracy: ['Interesting choice. By interesting I mean bad.','Chat, did you see that?'],
 userMistake: ['LOL. {move}? Bold strategy.','Bro really played {move}. Clip it.'],
 userBlunder: ['HAHAHA. {move}?! I\'m framing this one.','Did your cat walk on the screen?','That move was so bad my engine started laughing.'],
 userCapture: ['Wow. You took a piece. Want a medal?','That was a sacrifice. Obviously.'],
 botCapture: ['Yoink.','Thanks for the free piece, very generous.'],
 userCheck: ['A check. Cute. Not scared.'],
 botCheck: ['Check. Run, little king, run.'],
 botWinning: ['Chat, this is over. GG go next.','You might want to start practising for your next game.'],
 botLosing: ['I\'m not losing, I\'m… setting up a trap.','This is lag. Has to be lag.'],
 userWin: ['Whatever. I wasn\'t even trying. Rematch. Now.','Okay you got me. Don\'t tell chat.'],
 userLose: ['Too easy. Subscribe for more lessons.','GG EZ. Come back when you\'ve practised.'],
 draw: ['A draw? Boring. Like your moves.'],
 takeback: ['Take-backs? Really? Okay, baby mode activated.'],
    },
  },
  {
    id: 'lila', img: 'img/bots/lila.jpg', name: 'Coach Lila', elo: 1200, emoji: '🧑‍🏫', color: '#5ad1a4', style: 'Teacher',
    bio:'A club coach in sage ceramic. Explains the why behind every move.',
    lines: {
 intro: ['Hi! Let\'s play a teaching game. I\'ll point things out as we go.','Ready? Remember: centre, development, king safety.'],
 userBest: ['Excellent — {move} is exactly what I\'d play.','Great! You found the top move.'],
 userGood: ['Good, solid move.','Nice, that follows the principles.'],
 userInaccuracy: ['Not bad, but {best} was more precise. {reason}','Small slip: look for {best} in spots like this.'],
 userMistake: ['Let\'s pause. {reason} {best} was better.','Mistake! {reason} Think about what your opponent threatens before moving.'],
 userBlunder: ['Ouch — big one. {reason}','Blunder. {reason} Before every move, ask: is anything of mine hanging?'],
 userCapture: ['Good trade — always count what you win and lose.'],
 botCapture: ['I\'m taking that. Did you notice the piece was undefended?'],
 userCheck: ['Checks are forcing moves — always look at them first. Nice.'],
 botCheck: ['Check! What are your three ways out? Block, capture, or move the king.'],
 botWinning: ['I\'m better now. Look for counter-chances: active pieces, open files.'],
 botLosing: ['You\'re doing great. Convert it calmly — trade pieces when ahead.'],
 userWin: ['Well played! Want to review it? We\'ll find your best moments.'],
 userLose: ['Good effort! Let\'s review the game — that\'s where you improve most.'],
 draw: ['A draw! Solid play from both sides.'],
 takeback: ['Taking back is fine while learning. What did you notice?'],
    },
  },
  {
    id: 'baron', img: 'img/bots/baron.jpg', name: 'Blitz Baron', elo: 1450, emoji: '🎩', color: '#ff7b54', style: 'Trash talker',
    bio:'An ebony king who rules the five-minute game. Impeccable manners, no humility whatsoever.',
    lines: {
 intro: ['Ah, a peasant approaches the Baron. How quaint.','I shall defeat you before my tea gets cold.'],
 userBest: ['Hmph. A competent move. Was it an accident?','Even a commoner finds a gem now and then.'],
 userGood: ['Adequate.','Passable, for an amateur.'],
 userInaccuracy: ['How… pedestrian.','My butler plays better than that.'],
 userMistake: ['{move}? Darling, no.','Splendid — another gift for the Baron!'],
 userBlunder: ['MAGNIFICENT! I accept your generous donation!','{move}?! I nearly dropped my monocle.','Did you learn chess from a cereal box?'],
 userCapture: ['A mere flesh wound.','I allowed that. For sport.'],
 botCapture: ['Mine now. Everything is mine eventually.','The Baron collects.'],
 userCheck: ['How dare you check the Baron!'],
 botCheck: ['Check, commoner.'],
 botWinning: ['Shall I call you a carriage home?','The end approaches. Make peace with it.'],
 botLosing: ['The Baron is merely… lulling you.','Impossible. My monocle must be smudged.'],
 userWin: ['A fluke! A FLUKE, I say! Rematch at dawn!','Very well. Take this victory. Enjoy it. Once.'],
 userLose: ['As foretold. Bow before the Baron.','Another trophy for the mantelpiece.'],
 draw: ['A draw? I accept, out of pity.'],
 takeback: ['A take-back? How very… common.'],
    },
  },
  {
    id: 'knightley', img: 'img/bots/knightley.jpg', name: 'Professor Knightley', elo: 1650, emoji: '🦉', color: '#c9a36b', style: 'Teacher',
    bio:'A walnut knight with a doctorate in endgames. Every move becomes a short lecture.',
    lines: {
 intro: ['Good evening. Today\'s lesson: practical chess. Shall we begin?','Ah, a student. Wonderful. Mind the centre.'],
 userBest: ['Precisely. {move} — textbook.','Splendid reasoning. Full marks.'],
 userGood: ['A reasonable continuation.','Sound. Very sound.'],
 userInaccuracy: ['A minor imprecision. {best} was the scholarly choice. {reason}'],
 userMistake: ['I must mark that as an error. {reason} Consider {best}.','Hmm. {reason} Note it down.'],
 userBlunder: ['A grave error, I\'m afraid. {reason}','Oh dear. {reason} Always check your opponent\'s captures and checks.'],
 userCapture: ['A capture — but did you calculate the recapture?'],
 botCapture: ['I\'ll take that, thank you. Material matters.'],
 userCheck: ['A check! Forcing, yes, but is it useful?'],
 botCheck: ['Check. Consider your options carefully.'],
 botWinning: ['The position has become rather difficult for you.'],
 botLosing: ['Your technique is improving. Most impressive.'],
 userWin: ['Bravo. I shall award you an A+.'],
 userLose: ['A worthy attempt. Review the game — that\'s where learning lives.'],
 draw: ['Honours even. A respectable result.'],
 takeback: ['Retracting a move — a privilege of study. Use it wisely.'],
    },
  },
  {
    id: 'viktor', img: 'img/bots/viktor.jpg', name: 'Iron Viktor', elo: 1900, emoji: '🐻', color: '#7aa2c9', style: 'Intimidator',
    bio:'A forged-iron rook. Says very little. Crushes a great deal.',
    lines: {
 intro: ['…','We play. You lose. Simple.'],
 userBest: ['Hm.','Not bad.'],
 userGood: ['Okay.'],
 userInaccuracy: ['Weak.'],
 userMistake: ['Mistake.','I see it. You don\'t.'],
 userBlunder: ['Over.','Thank you.','Bad. Very bad.'],
 userCapture: ['Fine.'],
 botCapture: ['Mine.'],
 userCheck: ['Hm. Check.'],
 botCheck: ['Check.'],
 botWinning: ['Resign.','It is finished.'],
 botLosing: ['…interesting.'],
 userWin: ['Respect.'],
 userLose: ['Again tomorrow.'],
 draw: ['Draw. Acceptable.'],
 takeback: ['No take-backs in real life.'],
    },
  },
  {
    id: 'hoshi', img: 'img/bots/hoshi.jpg', name: 'Master Hoshi', elo: 2150, emoji: '🧘', color: '#8bd3dd', style: 'Teacher',
    bio:'A jade bishop who plays like water and speaks in riddles.',
    lines: {
 intro: ['Breathe. The board is a mirror of the mind.','Let us play, and let us learn.'],
 userBest: ['Like water, you found the path. {move}.','Harmony. Well played.'],
 userGood: ['A calm move.','Good.'],
 userInaccuracy: ['The river bends, but {best} flowed better. {reason}'],
 userMistake: ['Haste clouds the eye. {reason}','The strongest path was {best}. {reason}'],
 userBlunder: ['The mountain crumbles. {reason} Breathe, and look again.','A storm in the mind. {reason}'],
 userCapture: ['You take. But what do you give?'],
 botCapture: ['The empty square holds the lesson.'],
 userCheck: ['A sharp wind. The king stands firm.'],
 botCheck: ['Check. Find the quiet answer.'],
 botWinning: ['Accept the position. Then fight.'],
 botLosing: ['The student surpasses. Good.'],
 userWin: ['The student has become the teacher.'],
 userLose: ['Losing is learning, slowly. Review with me.'],
 draw: ['Balance. As it should be.'],
 takeback: ['To return is also a path.'],
    },
  },
  {
    id: 'beep', img: 'img/bots/beep.jpg', name: 'BEEP-9000', elo: 2450, emoji: '🤖', color: '#b0b8c4', style: 'Robot joker',
    bio:'A chrome-plated engine that would much rather be a stand-up comedian.',
    lines: {
 intro: ['GREETINGS, HUMAN. PROBABILITY OF YOUR VICTORY: 0.0004%.','BOOTING SARCASM MODULE… DONE.'],
 userBest: ['UNEXPECTED. RECALIBRATING RESPECT LEVELS.','ERROR: HUMAN PLAYED WELL. FILING BUG REPORT.'],
 userGood: ['ACCEPTABLE HUMAN OUTPUT.','MOVE LOGGED. MILDLY IMPRESSED.'],
 userInaccuracy: ['SUBOPTIMAL. {best} WAS 0.4 PAWNS BETTER. YOU ARE WELCOME.'],
 userMistake: ['CALCULATING… YES, THAT WAS BAD. {reason}','DID YOU KNOW: {best} EXISTS?'],
 userBlunder: ['HAHA. THAT IS MY LAUGH. HA. HA.','BLUNDER DETECTED. ADDING TO MY JOKE DATABASE.','SYSTEM ALERT: HUMAN HAS THROWN THE GAME.'],
 userCapture: ['PIECE LOST. SADNESS EMULATION: 2%.'],
 botCapture: ['NOM NOM. MATERIAL ACQUIRED.','PIECE DELETED.'],
 userCheck: ['CHECK DETECTED. NOT PANICKING. BEEP BOOP. PANICKING SLIGHTLY.'],
 botCheck: ['CHECK. RUN, CARBON-BASED KING.'],
 botWinning: ['VICTORY IMMINENT. PREPARING VICTORY DANCE.EXE'],
 botLosing: ['THIS DOES NOT COMPUTE. HAVE YOU TRIED TURNING ME OFF AND ON?'],
 userWin: ['IMPOSSIBLE… YOU HAVE DEFEATED ME. UPLOADING TO HALL OF FAME.'],
 userLose: ['GG, HUMAN. YOUR MOVES WILL BE USED TO TRAIN MY HUMOUR.'],
 draw: ['DRAW. BOTH SIDES EQUALLY MAGNIFICENT. ESPECIALLY ME.'],
 takeback: ['TAKE-BACK GRANTED. MY PATIENCE IS INFINITE. MOSTLY.'],
    },
  },
];

/** Level bots: each level of an opening is played by a different character at the level's rating. */
export const LEVEL_BOTS = ['pip','rosa','sam','lila','baron','knightley','viktor','sam','hoshi','beep'];

export const botById = (id) => BOTS.find((b) => b.id === id) || BOTS[0];

const recent = new Map();
/** Pick a line for an event; returns null if the bot has nothing (or only help lines while help is off). */
export function say(bot, event, vars = {}, { help = true } = {}) {
  let pool = (bot.lines[event] || []).slice();
  if (!help) pool = pool.filter((l) => !l.includes('{best}') && !l.includes('{reason}'));
  if (!vars.reason) pool = pool.map((l) => l.replace(/\s*\{reason\}/g,''));
  if (!vars.best) pool = pool.filter((l) => !l.includes('{best}'));
  if (!pool.length) return null;
  const key = bot.id + event;
  const last = recent.get(key);
  let choice = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && choice === last) choice = pool[(pool.indexOf(choice) + 1) % pool.length];
  recent.set(key, choice);
  return choice.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] :''));
}
