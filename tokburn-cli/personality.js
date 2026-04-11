'use strict';

// ---------------------------------------------------------------------------
// personality.js — Tokemon companion quip engine
// Zero dependencies. 100+ unique messages across 3 personality types.
// ---------------------------------------------------------------------------

const MESSAGES = {
  // ── Sassy (default for Flint) ──────────────────────────────────────────
  // Deadpan humor, roasts spending, celebrates sarcastically. Lowercase.
  sassy: {
    chill: [
      'slow day huh. saving money for once?',
      'look at you being responsible',
      'this is... suspiciously cheap',
      'wow tokens barely moving. you okay?',
      'almost boring how little you spend',
      'frugal king energy right now',
      'budget-friendly arc. nice.',
      'did you forget to type or something',
    ],
    alert: [
      'picking up the pace I see',
      "that's like... a coffee. keep going",
      'warming up the wallet already',
      'here we go. the spending begins',
      'tokens starting to flow. classic',
      'moderate burn. how pedestrian',
      'okay we are moving now',
      'not cheap, not expensive. mid.',
    ],
    stressed: [
      "we're in 'explain this to accounting' territory",
      "budget meeting's gonna be fun lol",
      'your future self is judging you',
      'this is getting expensive. just saying',
      'you know these cost money right',
      'burning through tokens like rent day',
      'accountant would not approve',
      'well that escalated financially',
    ],
    panic: [
      'this is fine. everything is fine.',
      'rip your wallet honestly',
      'congrats you broke the budget',
      'achievement unlocked: financial ruin',
      'i hope you have a good excuse',
      'the meter is screaming',
      'wallet left the chat',
      'pouring tokens into the void',
    ],
    evolution: [
      'oh? evolving. about time.',
      'new form who dis',
      'finally a glow up',
      'took you long enough to evolve',
      'shedding the old skin. dramatic.',
    ],
    lines_500: [
      'five hundred lines. warming up?',
      '500 lines in. pace yourself',
      'half a thousand lines. cute',
    ],
    lines_1000: [
      'a thousand lines. bold move',
      '1k lines deep. no turning back',
      'one thousand. you love to see it',
    ],
    lines_2000: [
      'two thousand lines. absolute unit',
      '2k lines. this is a lifestyle now',
      'novelist energy at 2000 lines',
    ],
    chill_trigger: [
      'under ten percent. suspicious calm',
      'barely touching the budget. sus',
      'saving tokens like a pro for once',
    ],
    session_start: [
      'oh great. we are doing this again',
      'back for more token damage I see',
      'another session another dollar',
    ],
  },

  // ── Hype (default for Pixel) ───────────────────────────────────────────
  // ALL CAPS energy, supportive but unhinged. Exclamation marks.
  hype: {
    chill: [
      "LET'S GOOO WE'RE JUST WARMING UP!!",
      'THE CALM BEFORE THE STORM!!',
      'SAVING ENERGY FOR THE BIG PUSH!!',
      'COASTING BUT READY TO EXPLODE!!',
      'LOW BURN HIGH POTENTIAL!!',
      'QUIET START MASSIVE FINISH!!',
      'POWER SAVING MODE ENGAGED!!',
      'THE FUSE IS LIT!!',
    ],
    alert: [
      "NOW WE'RE COOKING!!",
      'TOKENS GO BRRR!!',
      'ENGINE IS REVVING UP!!',
      'OH YEAH IT IS HAPPENING!!',
      'PICKING UP SPEED!!',
      'THE MOMENTUM IS BUILDING!!',
      'FULL STEAM AHEAD!!',
      'FEELING THE ENERGY!!',
    ],
    stressed: [
      'THIS IS WHERE LEGENDS ARE MADE!!',
      "WE'RE IN THE ZONE!!",
      'PUSHING LIMITS AND LOVING IT!!',
      'BIG NUMBERS BIG DREAMS!!',
      'NO PAIN NO GAIN!!',
      'STRESS IS JUST PROGRESS!!',
      'BUILT DIFFERENT!!',
      'PRESSURE MAKES DIAMONDS!!',
    ],
    panic: [
      'MAXIMUM OVERDRIVE!! NO BRAKES!!',
      'WITNESS MEEE!!',
      'ABSOLUTE MAXIMUM POWER!!',
      'ALL IN BABY!! ALL IN!!',
      'PEDAL TO THE METAL!!',
      'TURBO MODE ACTIVATED!!',
      'WE GO DOWN TOGETHER!!',
      'THIS IS OUR FINAL FORM!!',
    ],
    evolution: [
      "YOOO WE EVOLVED!! LET'S GOOO!!",
      'NEW FORM UNLOCKED!! HYPE!!',
      'EVOLUTION ARC!! INCREDIBLE!!',
      'LEVEL UP!! LEVEL UP!!',
      'TRANSFORMATION COMPLETE!!',
    ],
    lines_500: [
      '500 LINES AND JUST GETTING STARTED!!',
      'FIVE HUNDRED!! WARM UP SET!!',
      '500 DOWN INFINITY TO GO!!',
    ],
    lines_1000: [
      'ONE THOUSAND LINES!! UNSTOPPABLE!!',
      '1K LINES!! ABSOLUTE BEAST!!',
      'A THOUSAND LINES OF GLORY!!',
    ],
    lines_2000: [
      'TWO THOUSAND LINES!! LEGENDARY!!',
      '2K!! WE ARE MAKING HISTORY!!',
      '2000 LINES!! HALL OF FAME!!',
    ],
    chill_trigger: [
      'UNDER TEN PERCENT!! SAVING AMMO!!',
      'LOW USAGE HIGH IQ PLAY!!',
      'CONSERVING POWER!! SMART!!',
    ],
    session_start: [
      'NEW SESSION NEW RECORDS!!',
      "LET'S GOOO ROUND TWO!!",
      'BACK AND BETTER THAN EVER!!',
    ],
  },

  // ── Anxious (default for Mochi) ────────────────────────────────────────
  // Nervous, sweet, worried. Lowercase with ellipses and hedging.
  anxious: {
    chill: [
      'this is nice... i like it quiet',
      "everything's okay right...?",
      'so far so good... i think',
      'nice and calm... please stay this way',
      "it's peaceful... i'm not complaining",
      'low usage... that means we are safe?',
      'i could get used to this calm...',
      'nothing scary happening yet...',
    ],
    alert: [
      'oh... we are using more now...',
      'is this... normal?',
      'the numbers are going up a little...',
      'should i be worried yet...?',
      "it's picking up... just a bit...",
      'okay... this is still fine... right?',
      'the meter moved... i noticed...',
      'getting a tiny bit nervous...',
    ],
    stressed: [
      "i'm getting a little worried...",
      'maybe we should... slow down?',
      'this feels like a lot...',
      'my stomach hurts looking at this...',
      "can we... take a break maybe?",
      'the numbers are scaring me...',
      'is there a way to use... less?',
      'i wish it would stop climbing...',
    ],
    panic: [
      'oh no oh no oh no...',
      "i can't look...",
      "make it stop... please...",
      "i think i'm going to faint...",
      'this is my worst nightmare...',
      'someone hold me...',
      "i knew this would happen...",
      "we're doomed aren't we...",
    ],
    evolution: [
      'wait... i am changing? is this okay??',
      'i feel... different. is that good?',
      'something is happening to me...',
      "am i supposed to glow like this...?",
      'i hope this is a good thing...',
    ],
    lines_500: [
      'five hundred lines... is that a lot?',
      '500 already...? oh my...',
      'that seems like... a lot of lines...',
    ],
    lines_1000: [
      'a thousand lines... oh dear...',
      '1000... i need to sit down...',
      'one thousand... are we okay...?',
    ],
    lines_2000: [
      'two thousand lines... i feel dizzy...',
      '2000... this is too much for me...',
      "i can't even count that high...",
    ],
    chill_trigger: [
      'under ten percent... oh thank goodness',
      'barely any usage... what a relief...',
      'so quiet... i feel safe...',
    ],
    session_start: [
      'oh... here we go again...',
      'new session... i hope it goes okay...',
      "starting up... i'm a little nervous...",
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
  return WATCH_EMOJIS[Math.floor(Date.now() / 1000) % WATCH_EMOJIS.length];
}

module.exports = { getMessage, getWatchEmoji };
