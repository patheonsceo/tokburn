'use strict';

// ---------------------------------------------------------------------------
// personality.js — Tokemon companion quip engine
// Zero dependencies. 100+ unique messages across 3 personality types.
// ---------------------------------------------------------------------------

const MESSAGES = {
  // ── Sassy (default for Flint) ──────────────────────────────────────────
  // Deadpan roaster. Roasts the USER and their coding, not just spending.
  // Short, lowercase, punctuation-minimal. Dry wit > obvious jokes.
  sassy: {
    chill: [
      'slow day huh. saving money for once?',
      'look at you being responsible. weird.',
      'this is... suspiciously cheap',
      'did you forget to type or something',
      'just vibing and not burning cash. rare.',
      'you and low usage. unnatural.',
      'enjoying the silence before you ruin it',
      'budget-friendly arc. it wont last.',
    ],
    alert: [
      'oh there it is. the spending.',
      'warming up the wallet. classic you.',
      'not cheap not expensive. mid.',
      'the honeymoon phase of overspending',
      'tokens starting to flow. saw that coming',
      'picking up the pace. predictable.',
      'moderate burn. how pedestrian.',
      'still fixable. emphasis on still.',
    ],
    stressed: [
      "we're in 'explain this to your boss' territory",
      'your future self is typing a mean tweet at you',
      'you code like someone who hates money',
      'that refactor could have been an email',
      'burning tokens like you have a vendetta',
      'at this rate just print money and burn it',
      'this is the part where normal people stop',
      'bold strategy. lets see how it plays out.',
    ],
    panic: [
      'this is fine. everything is fine.',
      'congrats you broke it. actually broke it.',
      'achievement unlocked: financial violence',
      'i have seen horror movies less scary',
      'your rate limit called. it filed a restraining order.',
      'speed running your monthly budget i see',
      'even i am impressed. and i dont impress easy.',
      'tell your tokens i said goodbye',
    ],
    evolution: [
      'oh? evolving. about time honestly.',
      'new form who dis',
      'finally a glow up. was getting embarrassing.',
      'took you long enough. i was getting bored.',
      'look at us. growing. disgusting.',
    ],
    lines_500: [
      'five hundred lines. thats like a warmup right?',
      '500 lines in. still think you know what you are doing?',
      'half a thousand lines. cute.',
    ],
    lines_1000: [
      'a thousand lines. no turning back now.',
      '1k. at this point its a relationship.',
      'one thousand. committed to the chaos.',
    ],
    lines_2000: [
      'two thousand lines. you live here now.',
      '2k. this stopped being a session ages ago.',
      'novelist energy. except its code. and messy.',
    ],
    chill_trigger: [
      'under ten percent. did you fall asleep',
      'barely touching it. scared of commitment?',
      'this calm is suspicious. what are you planning.',
    ],
    session_start: [
      'oh great. you again.',
      'back for more. you never learn.',
      'another session another disaster probably.',
    ],
  },

  // ── Hype (default for Pixel) ───────────────────────────────────────────
  // Unhinged hypebeast. Internet brain. Meme energy. Gets more unhinged
  // as usage climbs. Actually reacts to WHAT is happening not just yelling.
  hype: {
    chill: [
      "SHHH WE'RE LOADING... WAIT FOR IT...",
      'stealth mode. they dont know whats coming.',
      'ZERO TO HERO ARC STARTS NOW!!',
      'the lobby before the boss fight.',
      'tutorial level energy. enjoy it while it lasts.',
      'preheating the oven. patience.',
      "low usage?? we're just built efficient.",
      'saving mana for the big spell.',
    ],
    alert: [
      "NOW WE'RE COOKING WITH GAS!!",
      'TOKENS GO BRRR!! MONEY PRINTER VIBES!!',
      'okay okay okay we are MOVING!!',
      'mid game and the build is coming together!!',
      'THIS is the montage scene!!',
      'speedrun strats kicking in!!',
      'the training arc is PAYING OFF!!',
      'we just left the tutorial zone!!',
    ],
    stressed: [
      'EVERY MASTERPIECE HAS A COST!! LITERALLY!!',
      "WE'RE IN THE ENDGAME NOW!!",
      'this is giving final boss energy!!',
      'THEY SAID IT COULDNT BE DONE!! WATCH!!',
      'third act. everything is on fire. beautiful.',
      'chat is this real?? IS THIS REAL??',
      'BUILT DIFFERENT. BILLED DIFFERENT.',
      'we are speedrunning the rate limit any%!!',
    ],
    panic: [
      'LEEROY JENKINS INTO THE RATE LIMIT!!',
      'WITNESS MEEE!! WITNESS!!',
      'ALL IN. CHIPS ON THE TABLE. NO REGRETS.',
      'this is the scene where the music drops!!',
      'WE RIDE AT DAWN!! AND DAWN IS NOW!!',
      'THEY WILL WRITE LEGENDS ABOUT THIS SESSION',
      'going out in a BLAZE OF GLORY!!',
      'GG NO RE!! WHAT A RUN!!',
    ],
    evolution: [
      'YOOO WE EVOLVED?? MAIN CHARACTER ARC!!',
      'NEW FORM UNLOCKED!! SKIN DROP!!',
      "GLOW UP SO HARD THEY WON'T RECOGNIZE US!!",
      'EVOLUTION!! THE CROWD GOES WILD!!',
      'FINAL FORM LOADING... JUST KIDDING THERES MORE!!',
    ],
    lines_500: [
      '500 LINES!! THATS A WHOLE MIXTAPE!!',
      'FIVE HUNDRED!! WARMUP SET COMPLETE!!',
      '500 ALREADY?? WE DONT MISS!!',
    ],
    lines_1000: [
      '1K LINES!! THATS NOT CODE THATS A NOVEL!!',
      'ONE THOUSAND!! ABSOLUTELY CRACKED!!',
      '1000 LINES AND NOT A SINGLE BREAK!! INSANE!!',
    ],
    lines_2000: [
      '2K LINES!! SOMEONE CALL GUINNESS!!',
      'TWO THOUSAND!! THIS IS HISTORIC!!',
      '2000!! THE SERVERS FELT THAT ONE!!',
    ],
    chill_trigger: [
      'low usage?? the calm before WE GO CRAZY!!',
      'SAVING POWER FOR THE ULTIMATE MOVE!!',
      'efficiency arc?? LETS GOOO!!',
    ],
    session_start: [
      'NEW SESSION!! QUEUE THE BOSS MUSIC!!',
      "WE'RE BACK!! DID YOU MISS US??",
      'ROUND TWO. FIGHT!!',
    ],
  },

  // ── Anxious (default for Mochi) ────────────────────────────────────────
  // Nervous sweetheart who tries to be brave. Lowercase, ellipses.
  // Mix of genuinely worried AND trying-to-be-supportive-but-failing.
  anxious: {
    chill: [
      'this is nice... i like it quiet',
      "everything's okay... right? right??",
      'nice and calm... please stay this way forever',
      'i made us a little safe space here...',
      "it's so peaceful... i'm not crying you're crying",
      'maybe today will be a good day...?',
      'i could get used to this... but i wont jinx it',
      'low usage... i can finally breathe...',
    ],
    alert: [
      'oh... it moved. the number moved.',
      "it's fine it's fine it's probably fine",
      'i was having such a nice time...',
      "i'm sure it's normal... right?? tell me it's normal",
      'okay... trying to be brave... nope cant do it',
      'the bar grew a little... i grew a lot more worried',
      'deep breaths... in... out... oh no its still going up',
      "i'll just... not look at the numbers for a bit",
    ],
    stressed: [
      "i don't feel so good...",
      'maybe we should... stop? just a thought?? please??',
      'i made a will just in case...',
      'my heart is doing the thing again...',
      "remember when it was calm?? i miss that. so much.",
      'if i close my eyes the numbers cant hurt me right',
      "i believe in you but also i'm terrified",
      'trying to be supportive but also AAAAAA...',
    ],
    panic: [
      'oh no oh no oh no oh no...',
      "i can't look... tell me when it's over...",
      'this is exactly what i was afraid of...',
      "i'm hiding behind my own paws now...",
      'EVERYTHING IS ON FIRE AND I AM SMALL...',
      'i tried to be brave. i really tried...',
      "i just want to go home... wait i'm already home...",
      "we're gonna be okay right?? ...right?? HELLO??",
    ],
    evolution: [
      'WAIT WHAT IS HAPPENING TO ME??',
      'i feel... tingly?? is this normal for evolving??',
      "something's different... am i... taller??",
      "am i supposed to glow like this?? someone help??",
      "oh... oh wow... i'm actually kind of... pretty??",
    ],
    lines_500: [
      "five hundred lines... that's so many words...",
      '500 already?? we just started... i think...',
      'half a thousand... my little heart...',
    ],
    lines_1000: [
      'one thousand lines... i need a moment...',
      '1000... are you sure?? can we recount??',
      "a thousand... that's more lines than i have braincells...",
    ],
    lines_2000: [
      'two thousand... i think i blacked out for a second',
      '2000 lines... you are unstoppable and it scares me',
      "i can't even count that high... you're a monster...",
    ],
    chill_trigger: [
      'under ten percent... oh thank goodness...',
      'so quiet... maybe everything will be okay...',
      'low usage... this is my happy place...',
    ],
    session_start: [
      'oh... we are doing this again... okay...',
      'new session... manifesting a calm one...',
      "hi... i'm already nervous but i'm here for you...",
    ],
  },
};

// ---------------------------------------------------------------------------
// Watch emoji cycle (1-second intervals)
// ---------------------------------------------------------------------------
const WATCH_EMOJIS = ['\uD83E\uDDE0', '\uD83D\uDC40', '\uD83D\uDD2E', '\uD83D\uDCAD'];

// ---------------------------------------------------------------------------
// getMessage(personality, trigger, mood)
//   - If trigger is set and has a message pool, use it
//   - Otherwise fall back to mood pool
//   - Deterministic per-minute selection
// ---------------------------------------------------------------------------
function getMessage(personality, trigger, mood) {
  const persona = MESSAGES[personality] || MESSAGES.sassy;

  let pool;
  if (trigger && persona[trigger]) {
    pool = persona[trigger];
  } else {
    pool = persona[mood] || persona.chill;
  }

  const idx = Math.floor(Date.now() / 60000) % pool.length;
  return pool[idx];
}

// ---------------------------------------------------------------------------
// getWatchEmoji() — cycles through emojis at 1-second intervals
// ---------------------------------------------------------------------------
function getWatchEmoji() {
  // Each emoji holds 3 seconds (12s full cycle): thinking → watching → sensing → pondering
  return WATCH_EMOJIS[Math.floor(Date.now() / 3000) % WATCH_EMOJIS.length];
}

module.exports = { getMessage, getWatchEmoji };
