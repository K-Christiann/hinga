import type { EncouragingThought } from "../domain/encouragement";

// Original encouragements, paired with checked public-domain World English Bible
// text (2020 stable edition). Shortened passages are explicitly marked excerpts.
// These are selected independently of health information, never by mood severity.
export const encouragingThoughts: readonly EncouragingThought[] = [
  {
    id: "a-gentle-place",
    message: "You don’t have to hide the hard parts of today. Your feelings deserve care, and you deserve to be heard.",
    verse: { reference: "Psalm 34:18", text: "The LORD is near to those who have a broken heart, and saves those who have a crushed spirit.", source: "https://ebible.org/engwebp/PSA034.htm" },
  },
  {
    id: "take-your-time",
    message: "You are allowed to need time. A difficult day does not take away your worth.",
    verse: { reference: "Psalm 147:3", text: "He heals the broken in heart, and binds up their wounds.", source: "https://ebible.org/engwebp/PSA147.htm" },
  },
  {
    id: "room-for-rest",
    message: "Rest is allowed, even when there are things left undone. You do not have to earn a moment of care.",
    verse: { reference: "Matthew 11:28", text: "Come to me, all you who labor and are heavily burdened, and I will give you rest.", source: "https://ebible.org/engwebp/MAT11.htm" },
  },
  {
    id: "someone-can-listen",
    message: "You do not have to carry every worry by yourself. Sharing a little with someone you trust can be a beginning.",
    verse: { reference: "1 Peter 5:7", text: "casting all your worries on him, because he cares for you.", source: "https://ebible.org/engwebp/1PE05.htm" },
  },
  {
    id: "one-small-step",
    message: "It is okay to feel afraid. You can meet this moment gently, one small step at a time.",
    verse: { reference: "Psalm 56:3", text: "When I am afraid, I will put my trust in you.", source: "https://ebible.org/engwebp/PSA056.htm" },
  },
  {
    id: "a-place-to-pause",
    message: "A hard moment does not have to be faced alone. There is room to pause and look for support.",
    verse: { reference: "Psalm 46:1", text: "God is our refuge and strength, a very present help in trouble.", source: "https://ebible.org/engwebp/PSA046.htm" },
  },
  {
    id: "a-smaller-day",
    message: "Being tired does not mean you have failed. Let today be a little smaller if that is what you need.",
    verse: { reference: "Isaiah 40:29", text: "He gives power to the weak. He increases the strength of him who has no might.", source: "https://ebible.org/engwebp/ISA40.htm" },
  },
  {
    id: "share-the-weight",
    message: "Asking for help is a way of caring for yourself. You are allowed to let someone share the weight.",
    verse: { reference: "Galatians 6:2", text: "Bear one another’s burdens, and so fulfill the law of Christ.", source: "https://ebible.org/engwebp/GAL06.htm" },
  },
  {
    id: "words-can-be-simple",
    message: "You do not need the perfect words to reach out. “Could you sit with me for a while?” is enough to begin.",
    verse: { reference: "1 Thessalonians 5:11", text: "Therefore exhort one another, and build each other up, even as you also do.", source: "https://ebible.org/engwebp/1TH05.htm" },
  },
  {
    id: "care-can-be-shared",
    message: "Support can begin with one conversation. A trusted person or a mental health professional can be part of that care.",
    verse: { reference: "Psalm 121:2", text: "My help comes from the LORD, who made heaven and earth.", source: "https://ebible.org/engwebp/PSA121.htm" },
  },
  {
    id: "only-the-next-step",
    message: "You don’t have to solve your whole life today. One gentle next step can be enough for now.",
    verse: { reference: "Psalm 23:3", text: "He restores my soul. He guides me in the paths of righteousness for his name’s sake.", source: "https://ebible.org/engwebp/PSA023.htm" },
  },
  {
    id: "room-between-thoughts",
    message: "Your thoughts may feel crowded today. You can take a pause without having to sort every one of them.",
    verse: { reference: "Psalm 94:19", text: "In the multitude of my thoughts within me, your comforts delight my soul.", source: "https://ebible.org/engwebp/PSA094.htm" },
  },
  {
    id: "kindness-for-hard-days",
    message: "What you are going through deserves kindness. You can take your time finding the support that feels right for you.",
    verse: { reference: "Psalm 9:9", text: "The LORD will also be a high tower for the oppressed; a high tower in times of trouble.", source: "https://ebible.org/engwebp/PSA009.htm" },
  },
  {
    id: "a-new-beginning",
    message: "You are allowed to begin again without having everything figured out. Today can be met one moment at a time.",
    verse: { reference: "Lamentations 3:23", text: "They are new every morning. Great is your faithfulness.", source: "https://ebible.org/engwebp/LAM03.htm" },
  },
  {
    id: "worthy-as-you-are",
    message: "Your worth is not measured by how productive, cheerful, or strong you feel today. You deserve care as you are.",
    verse: { reference: "Psalm 139:14", text: "I will give thanks to you, for I am fearfully and wonderfully made.", source: "https://ebible.org/engwebp/PSA139.htm", excerpt: true },
  },
  {
    id: "you-can-ask-for-company",
    message: "Feeling overwhelmed does not make you a burden. It is okay to ask someone to stay with you for a while.",
    verse: { reference: "Isaiah 41:10", text: "Don’t you be afraid, for I am with you. Don’t be dismayed, for I am your God.", source: "https://ebible.org/engwebp/ISA41.htm", excerpt: true },
  },
];
