export interface QuizItem {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  image?: string;
}

export const QUIZ_BANK: QuizItem[] = [
  {
    id: "q-planet-greek",
    question: '"Planet" comes from a Greek word meaning?',
    options: ["Wanderer", "Shining stone", "Sky circle", "Fire world"],
    answer: "Wanderer",
    explanation:
      "Planets moved against the fixed stars, the same idea as spotting movers today.",
    image: "/textures/jupiter.jpg",
  },
  {
    id: "q-pluto-discovery",
    question: "How was Pluto discovered in 1930?",
    options: [
      "By blinking two photos of the sky",
      "With a space probe flyby",
      "By radio radar echoes",
      "During a total solar eclipse",
    ],
    answer: "By blinking two photos of the sky",
    explanation:
      "Clyde Tombaugh used a blink comparator to flip between two night-sky plates.",
    image: "/textures/neptune.jpg",
  },
  {
    id: "q-pluto-name",
    question: "Who suggested the name Pluto?",
    options: [
      "Venetia Burney, an 11-year-old girl",
      "Albert Einstein",
      "Edwin Hubble",
      "Galileo Galilei",
    ],
    answer: "Venetia Burney, an 11-year-old girl",
    explanation:
      "She suggested the Roman god of the underworld at breakfast in Oxford in 1930.",
    image: "/textures/moon.jpg",
  },
  {
    id: "q-comet-greek",
    question: '"Comet" comes from a Greek word meaning?',
    options: ["Long-haired", "Ice stone", "Fast arrow", "Night cloud"],
    answer: "Long-haired",
    explanation:
      "Greek astronomers called comets kometes because their glowing tails looked like flowing hair.",
    image: "/textures/milky-way.jpg",
  },
  {
    id: "q-asteroid-meaning",
    question: '"Asteroid" means?',
    options: ["Star-like", "Broken moon", "Iron rock", "Dark wanderer"],
    answer: "Star-like",
    explanation:
      "In early telescopes, asteroids looked like tiny points of light just like stars.",
    image: "/textures/mercury.jpg",
  },
  {
    id: "q-eris-pluto",
    question: "Which object's discovery led to Pluto losing planet status?",
    options: ["Eris", "Ceres", "Vesta", "Sedna"],
    answer: "Eris",
    explanation:
      "Finding Eris in 2005 showed Pluto was one of many icy worlds in the Kuiper Belt.",
    image: "/textures/uranus.jpg",
  },
  {
    id: "q-mars-war",
    question: "Why is Mars named after the god of war?",
    options: [
      "Its blood-red colour",
      "It moves faster than Mercury",
      "It has two moons",
      "It is closest to the Sun",
    ],
    answer: "Its blood-red colour",
    explanation:
      "Iron oxide rust dust on Mars gives it a red tint visible to the naked eye.",
    image: "/textures/mars.jpg",
  },
  {
    id: "q-uranus-telescope",
    question: "Which planet was the first found with a telescope?",
    options: ["Uranus (1781)", "Neptune (1846)", "Saturn", "Mercury"],
    answer: "Uranus (1781)",
    explanation:
      "William Herschel spotted Uranus in 1781 while surveying faint stars with a handmade telescope.",
    image: "/textures/uranus.jpg",
  },
  {
    id: "q-neptune-math",
    question: "Which planet was predicted by mathematics before it was seen?",
    options: ["Neptune (1846)", "Uranus (1781)", "Mars", "Venus"],
    answer: "Neptune (1846)",
    explanation:
      "Unexplained pulls on Uranus's orbit led mathematicians to calculate Neptune's exact position.",
    image: "/textures/neptune.jpg",
  },
  {
    id: "q-barnards-star",
    question: "Barnard's Star is named after?",
    options: [
      "Astronomer E. E. Barnard, who measured its fast motion in 1916",
      "A constellation in the southern sky",
      "The town where its telescope stood",
      "A spacecraft that flew past it",
    ],
    answer: "Astronomer E. E. Barnard, who measured its fast motion in 1916",
    explanation:
      "E. E. Barnard noticed the nearby red dwarf racing across photographic plates in 1916.",
    image: "/textures/sun.jpg",
  },
  {
    id: "q-brown-dwarf-term",
    question: 'Who coined the term "brown dwarf"?',
    options: [
      "Jill Tarter, 1975",
      "Carl Sagan, 1980",
      "Vera Rubin, 1970",
      "Subrahmanyan Chandrasekhar, 1962",
    ],
    answer: "Jill Tarter, 1975",
    explanation:
      "Astrophysicist Jill Tarter proposed the name in her 1975 PhD thesis for substellar objects.",
    image: "/textures/jupiter.jpg",
  },
  {
    id: "q-failed-star",
    question: 'Why is a brown dwarf called a "failed star"?',
    options: [
      "Too small to burn like a real star",
      "It lost all its planets",
      "It exploded long ago",
      "It is made of solid rock",
    ],
    answer: "Too small to burn like a real star",
    explanation:
      "Brown dwarfs lack the mass and core pressure needed to fuse hydrogen steadily like stars.",
    image: "/textures/jupiter.jpg",
  },
  {
    id: "q-nearby-stars-move",
    question: "Why do nearby stars seem to move more?",
    options: [
      "They are closer, so the same motion looks bigger from Earth",
      "Nearby stars are hotter than distant stars",
      "Earth's gravity pulls them sideways",
      "Distant stars are frozen in place",
    ],
    answer: "They are closer, so the same motion looks bigger from Earth",
    explanation:
      "Just like a nearby car looks faster than a distant plane, close stars shift more across our sky.",
    image: "/textures/milky-way.jpg",
  },
  {
    id: "q-spherex-light",
    question: "What kind of light does SPHEREx see?",
    options: [
      "Infrared, invisible to our eyes",
      "Ultraviolet rays only",
      "Radio waves from lightning",
      "X-rays from black holes",
    ],
    answer: "Infrared, invisible to our eyes",
    explanation:
      "Infrared wavelengths let SPHEREx detect cool brown dwarfs, dust, and distant galaxies.",
    image: "/textures/milky-way.jpg",
  },
  {
    id: "q-spherex-cadence",
    question: "How often does SPHEREx map the whole sky?",
    options: [
      "Every six months",
      "Once every ten years",
      "Every 24 hours",
      "Only during winter",
    ],
    answer: "Every six months",
    explanation:
      "Mapping the full sky every six months creates repeated visits ideal for spotting changes.",
    image: "/textures/earth.jpg",
  },
  {
    id: "q-spherex-bands",
    question: "How many colours (bands) does SPHEREx use?",
    options: ["102", "3", "12", "500"],
    answer: "102",
    explanation:
      "SPHEREx splits infrared light into 102 wavelength channels to read each object's spectrum.",
    image: "/textures/sun.jpg",
  },
  {
    id: "q-haumea-egg",
    question: "Why is Haumea shaped like an egg?",
    options: [
      "It spins about every 4 hours",
      "Jupiter stretched it with gravity",
      "Two comets melted together",
      "Sunlight melted one side",
    ],
    answer: "It spins about every 4 hours",
    explanation:
      "Haumea's rapid four-hour rotation stretches the icy dwarf planet into an oval shape.",
    image: "/textures/moon.jpg",
  },
  {
    id: "q-makemake-name",
    question: "Which dwarf planet is named after an Easter Island god?",
    options: ["Makemake", "Ceres", "Haumea", "Eris"],
    answer: "Makemake",
    explanation:
      "Makemake is named after the creator deity of the Rapa Nui people of Easter Island.",
    image: "/textures/mercury.jpg",
  },
  {
    id: "q-venus-day-year",
    question: "A day on Venus is longer than its year: true or false?",
    options: ["True", "False", "Only in winter"],
    answer: "True",
    explanation:
      "Venus takes 243 Earth days to rotate once, but only 225 Earth days to orbit the Sun.",
    image: "/textures/venus.jpg",
  },
  {
    id: "q-earth-name",
    question: "Which is the only planet not named after a god?",
    options: ["Earth", "Mars", "Venus", "Neptune"],
    answer: "Earth",
    explanation:
      "Earth comes from Old English and Germanic words meaning ground or soil.",
    image: "/textures/earth.jpg",
  },
  {
    id: "q-saturn-float",
    question: "Which planet would float in a giant bathtub?",
    options: ["Saturn", "Mercury", "Mars", "Earth"],
    answer: "Saturn",
    explanation:
      "Saturn's average density is lower than liquid water because it is mostly hydrogen and helium.",
    image: "/textures/saturn.jpg",
  },
  {
    id: "q-wise-0855",
    question: "What is the coldest known brown dwarf?",
    options: ["WISE 0855-0714", "Proxima Centauri", "Sirius B", "Vega"],
    answer: "WISE 0855-0714",
    explanation:
      "WISE 0855-0714 is as cold as the North Pole and was discovered by its fast motion in infrared.",
    image: "/textures/neptune.jpg",
  },
  {
    id: "q-blink-stars",
    question: "In a blink image, what do stars do?",
    options: [
      "Stay still",
      "Jump across the frame",
      "Vanish every second",
      "Spin in circles",
    ],
    answer: "Stay still",
    explanation:
      "Distant background stars appear fixed in place when comparing two sky photos.",
    image: "/textures/milky-way.jpg",
  },
  {
    id: "q-blink-asteroid",
    question: "In a blink image, what does an asteroid do?",
    options: [
      "Jumps to a new spot",
      "Stays locked in one pixel",
      "Turns into a galaxy",
      "Stops reflecting light",
    ],
    answer: "Jumps to a new spot",
    explanation:
      "Because asteroids orbit close to us, they shift position noticeably between exposures.",
    image: "/textures/mars.jpg",
  },
  {
    id: "q-asteroid-belt-location",
    question: "Where do most main-belt asteroids orbit?",
    options: [
      "Between Mars and Jupiter",
      "Between Earth and Venus",
      "Inside Mercury's orbit",
      "Beyond Neptune",
    ],
    answer: "Between Mars and Jupiter",
    explanation:
      "Millions of rocky remnants orbit the Sun in the main belt between Mars and Jupiter.",
    image: "/textures/mars.jpg",
  },
  {
    id: "q-comet-tail-direction",
    question: "Which way does a comet's tail always point?",
    options: [
      "Away from the Sun",
      "Toward the centre of Earth",
      "Directly behind its travel path",
      "Toward the North Star",
    ],
    answer: "Away from the Sun",
    explanation:
      "Solar wind and radiation push gas and dust outward, so the tail always points away from the Sun.",
    image: "/textures/sun.jpg",
  },
  {
    id: "q-uranus-tilt",
    question: "What makes Uranus's spin unusual among the planets?",
    options: [
      "It is tilted 98 degrees on its side",
      "It never rotates at all",
      "It spins ten times per minute",
      "Its axis points straight up",
    ],
    answer: "It is tilted 98 degrees on its side",
    explanation:
      "Uranus rolls around the Sun on its side with an extreme 98-degree axial tilt.",
    image: "/textures/uranus.jpg",
  },
  {
    id: "q-variable-star",
    question: "What is a variable star?",
    options: [
      "A star whose brightness changes over time",
      "A star that orbits a comet",
      "A planet with rings",
      "An artificial satellite",
    ],
    answer: "A star whose brightness changes over time",
    explanation:
      "Pulsating giants, young stars, and eclipsing pairs swell and dim across multi-epoch sky surveys.",
    image: "/textures/sun.jpg",
  },
  {
    id: "q-ceres-where",
    question: "What is the largest object in the main asteroid belt?",
    options: ["Ceres", "Halley", "Phobos", "Titan"],
    answer: "Ceres",
    explanation:
      "Discovered in 1801, Ceres is large enough for gravity to pull it into a round dwarf planet.",
    image: "/textures/moon.jpg",
  },
  {
    id: "q-jupiter-spot",
    question: "What is Jupiter's Great Red Spot?",
    options: [
      "A giant storm larger than Earth",
      "A solid volcano peak",
      "An impact crater from a moon",
      "A frozen methane lake",
    ],
    answer: "A giant storm larger than Earth",
    explanation:
      "The Great Red Spot is a high-pressure anticyclonic storm that has raged for centuries.",
    image: "/textures/jupiter.jpg",
  },
  {
    id: "q-kuiper-belt",
    question: "Where do Pluto, Eris, Haumea, and Makemake orbit?",
    options: [
      "In the Kuiper Belt beyond Neptune",
      "Between Mercury and the Sun",
      "Between Earth and Mars",
      "Inside Saturn's rings",
    ],
    answer: "In the Kuiper Belt beyond Neptune",
    explanation:
      "The Kuiper Belt is a vast ring of icy worlds beyond the orbit of Neptune.",
    image: "/textures/neptune.jpg",
  },
  {
    id: "q-earth-night-lights",
    question: "Why do space telescopes orbit above Earth's atmosphere?",
    options: [
      "Air blocks most infrared light and blurs stars",
      "To be closer to distant galaxies",
      "Solar panels only work in a vacuum",
      "Gravity is needed to focus lenses",
    ],
    answer: "Air blocks most infrared light and blurs stars",
    explanation:
      "Water vapour and gases in Earth's atmosphere absorb infrared bands that SPHEREx observes from orbit.",
    image: "/textures/earth-night.jpg",
  },
];

export function pickRandomQuizQuestions(
  count: number,
  seedOrExcludeIds?: string[]
): QuizItem[] {
  const pool = seedOrExcludeIds?.length
    ? QUIZ_BANK.filter((q) => !seedOrExcludeIds.includes(q.id))
    : [...QUIZ_BANK];
  const source = pool.length >= count ? [...pool] : [...QUIZ_BANK];

  // Fisher-Yates shuffle
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = source[i];
    source[i] = source[j];
    source[j] = tmp;
  }
  return source.slice(0, count);
}
