// data/objects.ts
// 14 celestial bodies in the Cosmic Voyage solar system

export interface CelestialObjectData {
  id: string;
  name: string;
  type: "Star" | "Planet" | "Moon" | "Dwarf planet";
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  initialAngle: number;
  rotationSpeed: number;
  axialTiltDeg: number;
  textureKey?: string;
  fallbackColor: string;
  shape?: "sphere" | "egg";
  eggScale?: [number, number, number];
  hasRing?: boolean;
  whyName: string;
  history: string;
  facts: [string, string, string];
  infraredNote: string;
  quiz: {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  };
}

export const VOYAGE_OBJECTS: CelestialObjectData[] = [
  {
    id: "sun",
    name: "Sun",
    type: "Star",
    size: 5.5,
    orbitRadius: 0,
    orbitSpeed: 0,
    initialAngle: 0,
    rotationSpeed: 0.05,
    axialTiltDeg: 7.25,
    textureKey: "sun",
    fallbackColor: "#FFD166",
    whyName: 'Old English "sunne", descending from ancient Germanic roots for the daylight luminary.',
    history:
      "Center of our Solar System, held in reverence across human history. Copernicus proved in 1543 that Earth revolves around it.",
    facts: [
      "Contains 99.8% of all the mass in the Solar System.",
      "Light from its surface takes about 8 minutes and 20 seconds to reach Earth.",
      "Every second, it fuses 600 million tons of hydrogen into helium in its core.",
    ],
    infraredNote:
      "In infrared, the Sun reveals magnetic hotspots, cooler sunspot umbras, and extended coronal loops that are invisible in white light.",
    quiz: {
      question: "How much of the entire Solar System's mass does the Sun contain?",
      options: ["About 50%", "About 75%", "99.8%", "90%"],
      answer: "99.8%",
      explanation: "The Sun contains 99.8% of all matter in the Solar System, with Jupiter making up most of the remainder.",
    },
  },
  {
    id: "mercury",
    name: "Mercury",
    type: "Planet",
    size: 0.9,
    orbitRadius: 18,
    orbitSpeed: 0.35,
    initialAngle: 0.8,
    rotationSpeed: 0.08,
    axialTiltDeg: 0.034,
    textureKey: "mercury",
    fallbackColor: "#8E8883",
    whyName:
      "Named after the swift Roman messenger god because it races across our sky faster than any other planet.",
    history:
      "Known since ancient Babylonian and Sumerian times. Its 88-day orbit made it the fastest known wanderer across the stars.",
    facts: [
      "Orbits the Sun in just 88 Earth days.",
      "Has the most extreme temperature swings: 430°C in daylight, down to −180°C at night.",
      "Its core occupies roughly 85% of its entire planetary radius.",
    ],
    infraredNote:
      "Infrared mapping reveals deep permanently shadowed polar craters where water ice survives despite blistering daytime heat.",
    quiz: {
      question: "Why was Mercury named after the Roman messenger god?",
      options: [
        "It is the fastest planet in the sky",
        "It delivers messages to Earth",
        "It was discovered by radio communication",
        "It has wings on its surface",
      ],
      answer: "It is the fastest planet in the sky",
      explanation: "Mercury orbits the Sun in just 88 days, making it the swiftest planet observed by ancient skywatchers.",
    },
  },
  {
    id: "venus",
    name: "Venus",
    type: "Planet",
    size: 1.5,
    orbitRadius: 28,
    orbitSpeed: 0.24,
    initialAngle: 2.1,
    rotationSpeed: -0.04,
    axialTiltDeg: 177.4,
    textureKey: "venus",
    fallbackColor: "#E2BA84",
    whyName:
      "Named after the Roman goddess of love and beauty because it is the brightest natural light in our night sky after the Moon.",
    history:
      "Called the Morning Star and Evening Star by ancient civilisations before being recognised as a single planet.",
    facts: [
      "Its day (243 Earth days) is longer than its year (225 Earth days).",
      "Spins backwards compared to most planets, so the Sun rises in the west.",
      "A runaway greenhouse atmosphere makes its surface 465°C—hot enough to melt lead.",
    ],
    infraredNote:
      "SPHEREx infrared wavelengths pierce through sulfuric acid clouds to map the glowing volcanic surface beneath.",
    quiz: {
      question: "Which unusual trait does Venus possess?",
      options: [
        "Its day is longer than its year",
        "It has two bright rings",
        "It is freezing cold at the equator",
        "It orbits the Sun backwards",
      ],
      answer: "Its day is longer than its year",
      explanation: "Venus takes 243 Earth days to complete one rotation on its axis, but only 225 Earth days to orbit the Sun.",
    },
  },
  {
    id: "earth",
    name: "Earth",
    type: "Planet",
    size: 1.6,
    orbitRadius: 40,
    orbitSpeed: 0.18,
    initialAngle: 3.5,
    rotationSpeed: 0.12,
    axialTiltDeg: 23.44,
    textureKey: "earth",
    fallbackColor: "#2B5E87",
    whyName:
      'The only planet not named after a Greek or Roman deity; derived from Old English "eorðe" meaning ground or soil.',
    history:
      "Home to humanity. Aristotle deduced its spherical shape from lunar eclipses around 350 BC.",
    facts: [
      "The only known world in the Universe confirmed to harbour active life.",
      "Liquid water oceans cover 71% of its dynamic planetary surface.",
      "Its protective magnetic field shields the atmosphere from solar cosmic rays.",
    ],
    infraredNote:
      "Infrared sensors monitor Earth's heat radiation, cloud temperatures, and atmospheric greenhouse gas absorption bands.",
    quiz: {
      question: "What is unique about the name of planet Earth?",
      options: [
        "It is the only planet not named after a god",
        "It was named by NASA astronomers",
        "It was discovered with a space telescope",
        "It comes from an ancient Martian dialect",
      ],
      answer: "It is the only planet not named after a god",
      explanation: 'Earth is the only Solar System planet whose name comes from Old English/Germanic words meaning "ground", rather than classical mythology.',
    },
  },
  {
    id: "moon",
    name: "Moon",
    type: "Moon",
    size: 0.55,
    orbitRadius: 43.5,
    orbitSpeed: 0.22,
    initialAngle: 3.7,
    rotationSpeed: 0.15,
    axialTiltDeg: 6.68,
    textureKey: "moon",
    fallbackColor: "#B5B2AC",
    whyName:
      'Named from ancient Proto-Germanic roots meaning "the measurer of time", tracking lunar months across human history.',
    history:
      "The only other astronomical body humans have ever walked on, starting with the Apollo 11 crew in July 1969.",
    facts: [
      "Tidally locked to Earth: the same side always faces toward us.",
      "Formed 4.5 billion years ago when a Mars-sized protoplanet collided with young Earth.",
      "Its gravitational pull produces ocean tides across our planet.",
    ],
    infraredNote:
      "Infrared thermal inertia measurements reveal cold traps at the lunar poles holding billions of tons of water ice.",
    quiz: {
      question: "When did humans first walk on the Moon?",
      options: ["1969 (Apollo 11)", "1957 (Sputnik)", "1977 (Voyager)", "1986 (Mir)"],
      answer: "1969 (Apollo 11)",
      explanation: "Neil Armstrong and Buzz Aldrin stepped onto the lunar surface on July 20, 1969.",
    },
  },
  {
    id: "mars",
    name: "Mars",
    type: "Planet",
    size: 1.1,
    orbitRadius: 54,
    orbitSpeed: 0.13,
    initialAngle: 5.0,
    rotationSpeed: 0.11,
    axialTiltDeg: 25.19,
    textureKey: "mars",
    fallbackColor: "#C1440E",
    whyName:
      "Named after the Roman god of war due to its blood-red hue caused by abundant iron oxide (rust) on its surface.",
    history:
      "Studied by ancient astronomers for thousands of years. Telescopic drawings sparked early theories of dried river channels.",
    facts: [
      "Home to Olympus Mons, the largest volcano in the Solar System (three times higher than Everest).",
      "Features Valles Marineris, a canyon system that would stretch across the entire United States.",
      "Has two tiny captured asteroid moons named Phobos and Deimos.",
    ],
    infraredNote:
      "Infrared spectrometers map hydrated minerals, identifying ancient riverbeds and frozen subsurface glaciers.",
    quiz: {
      question: "Why is Mars named after the Roman god of war?",
      options: [
        "Its blood-red colour caused by iron oxide",
        "It was discovered during a major war",
        "It constantly collides with asteroids",
        "It has a fierce radioactive atmosphere",
      ],
      answer: "Its blood-red colour caused by iron oxide",
      explanation: "The rusty red appearance in the night sky led ancient Romans to name it after Mars, the god of war.",
    },
  },
  {
    id: "ceres",
    name: "Ceres",
    type: "Dwarf planet",
    size: 0.65,
    orbitRadius: 68,
    orbitSpeed: 0.09,
    initialAngle: 1.4,
    rotationSpeed: 0.18,
    axialTiltDeg: 4.0,
    fallbackColor: "#8D8B88",
    whyName:
      "Named after Ceres, the Roman goddess of agriculture, grain crops, and motherly harvest.",
    history:
      "Discovered on January 1, 1801 by Giuseppe Piazzi in Palermo. Originally classified as a planet, then an asteroid, and in 2006 a dwarf planet.",
    facts: [
      "The largest object in the main asteroid belt between Mars and Jupiter.",
      "Contains bright reflective sodium carbonate salt patches inside Occator Crater.",
      "Water ice may account for up to 25% of its total planetary mass.",
    ],
    infraredNote:
      "Infrared spectroscopic mapping proved the presence of clay minerals and salts left by subsurface brine eruptions.",
    quiz: {
      question: "Who discovered Ceres in 1801?",
      options: [
        "Giuseppe Piazzi",
        "Galileo Galilei",
        "William Herschel",
        "Clyde Tombaugh",
      ],
      answer: "Giuseppe Piazzi",
      explanation: "Giuseppe Piazzi discovered Ceres on New Year's Day 1801 from the Palermo Observatory in Sicily.",
    },
  },
  {
    id: "jupiter",
    name: "Jupiter",
    type: "Planet",
    size: 3.6,
    orbitRadius: 84,
    orbitSpeed: 0.07,
    initialAngle: 4.2,
    rotationSpeed: 0.22,
    axialTiltDeg: 3.13,
    textureKey: "jupiter",
    fallbackColor: "#C88B3A",
    whyName:
      "Named after the king of the Roman gods because it is the largest, most majestic planet in our sky.",
    history:
      "Galileo discovered its 4 major moons in 1610, providing direct proof that not all celestial bodies orbit the Earth.",
    facts: [
      "More massive than all other Solar System planets combined.",
      "Its Great Red Spot is a counter-clockwise swirling storm larger than Earth, active for centuries.",
      "Rotates faster than any other planet, completing one day in just under 10 hours.",
    ],
    infraredNote:
      "Infrared imaging peers through ammonia haze to reveal thermal glow radiating from deep atmospheric heat plumes.",
    quiz: {
      question: "What historic discovery did Galileo make with Jupiter in 1610?",
      options: [
        "Its four largest moons orbiting it",
        "Its rings",
        "A crashed spacecraft",
        "Solid ground beneath its clouds",
      ],
      answer: "Its four largest moons orbiting it",
      explanation: "Galileo saw Io, Europa, Ganymede, and Callisto orbiting Jupiter, proving Earth is not the center of all celestial motion.",
    },
  },
  {
    id: "saturn",
    name: "Saturn",
    type: "Planet",
    size: 2.9,
    orbitRadius: 104,
    orbitSpeed: 0.05,
    initialAngle: 0.5,
    rotationSpeed: 0.2,
    axialTiltDeg: 26.73,
    textureKey: "saturn",
    fallbackColor: "#E3BB7B",
    hasRing: true,
    whyName:
      "Named after the Roman god of agriculture and time, corresponding to the Greek Titan Cronus.",
    history:
      "The slowest planet visible to ancient naked-eye observers. Galileo observed strange handles in 1610; Huygens identified the rings in 1655.",
    facts: [
      "Its spectacular ring system consists of billions of chunks of pure water ice and dust.",
      "Less dense than water: if you had a bathtub big enough, Saturn would float.",
      "Enceladus, one of its icy moons, sprays water geysers from a global subsurface ocean.",
    ],
    infraredNote:
      "Infrared scans expose temperature contrasts across ring particles and map heat venting from polar vortices.",
    quiz: {
      question: "What is remarkable about Saturn's overall physical density?",
      options: [
        "It is less dense than water",
        "It is denser than solid gold",
        "It is identical to lead",
        "It is pure compressed iron",
      ],
      answer: "It is less dense than water",
      explanation: "Saturn's average density is only 0.687 g/cm³, meaning it would float if placed in a giant ocean of water.",
    },
  },
  {
    id: "uranus",
    name: "Uranus",
    type: "Planet",
    size: 2.0,
    orbitRadius: 124,
    orbitSpeed: 0.035,
    initialAngle: 2.8,
    rotationSpeed: -0.14,
    axialTiltDeg: 97.77,
    textureKey: "uranus",
    fallbackColor: "#4B70DD",
    whyName:
      "Named after the ancient Greek personification of the sky, father of Saturn and grandfather of Jupiter.",
    history:
      "First planet discovered using a telescope (William Herschel, 1781). Herschel originally proposed naming it Georgium Sidus after King George III.",
    facts: [
      "Rotates on its side with an axial tilt of 98°, likely knocked over by a giant ancient impact.",
      "The coldest planetary atmosphere in the Solar System, dipping to −224°C.",
      "Has 13 faint, dark rings composed of organic-rich icy boulders.",
    ],
    infraredNote:
      "Infrared observations highlight high-altitude methane ice crystal clouds that are completely invisible in optical light.",
    quiz: {
      question: "Which astronomer discovered Uranus with a telescope in 1781?",
      options: [
        "William Herschel",
        "Isaac Newton",
        "Johannes Kepler",
        "Edwin Hubble",
      ],
      answer: "William Herschel",
      explanation: "Sir William Herschel discovered Uranus on March 13, 1781 from his garden in Bath, England.",
    },
  },
  {
    id: "neptune",
    name: "Neptune",
    type: "Planet",
    size: 1.9,
    orbitRadius: 144,
    orbitSpeed: 0.025,
    initialAngle: 5.6,
    rotationSpeed: 0.16,
    axialTiltDeg: 28.32,
    textureKey: "neptune",
    fallbackColor: "#274687",
    whyName:
      "Named after the Roman god of the sea because of its striking, deep azure blue appearance.",
    history:
      "Discovered in 1846 by Johann Galle based on mathematical predictions by Urbain Le Verrier and John Couch Adams.",
    facts: [
      "The first planet whose existence was predicted purely by mathematics before ever being seen through a telescope.",
      "Features the fastest winds in the Solar System, clocking over 2,100 km/h.",
      "Its largest moon, Triton, orbits retrograde and shoots liquid nitrogen geysers.",
    ],
    infraredNote:
      "Infrared spectrophotometry tracks storm band dynamics and methane emission bands in the stratosphere.",
    quiz: {
      question: "How was Neptune first discovered in 1846?",
      options: [
        "Predicted by mathematics before being seen",
        "Accidental telescope scan",
        "By an ancient Polynesian navigator",
        "Using a radio telescope dish",
      ],
      answer: "Predicted by mathematics before being seen",
      explanation: "Astronomers calculated Neptune's position by analyzing unexpected gravitational wobbles in Uranus's orbit.",
    },
  },
  {
    id: "pluto",
    name: "Pluto",
    type: "Dwarf planet",
    size: 0.72,
    orbitRadius: 164,
    orbitSpeed: 0.02,
    initialAngle: 1.2,
    rotationSpeed: 0.07,
    axialTiltDeg: 122.5,
    fallbackColor: "#C9A075",
    whyName:
      "Named after the Roman god of the underworld, suggested in 1930 by 11-year-old schoolgirl Venetia Burney in Oxford.",
    history:
      "Discovered by Clyde Tombaugh in 1930 by blinking two photographic plates taken days apart—the exact principle behind Cosmic Detective.",
    facts: [
      "Has a bright heart-shaped nitrogen ice plain named Tombaugh Regio.",
      "Reclassified as a dwarf planet by the International Astronomical Union in 2006.",
      "Its giant moon Charon is so large that both orbit a center of mass outside Pluto itself.",
    ],
    infraredNote:
      "Infrared spectroscopy by New Horizons discovered methane, carbon monoxide, and water ice glaciers across its surface.",
    quiz: {
      question: "How did Clyde Tombaugh discover Pluto in 1930?",
      options: [
        "By blinking two sky photos to spot movement",
        "By launching an interplanetary probe",
        "Using an infrared space telescope",
        "Through computer machine learning",
      ],
      answer: "By blinking two sky photos to spot movement",
      explanation: "Tombaugh spent months comparing pairs of night-sky plates with a blink comparator, watching for jumping dots.",
    },
  },
  {
    id: "haumea",
    name: "Haumea",
    type: "Dwarf planet",
    size: 0.8,
    orbitRadius: 182,
    orbitSpeed: 0.016,
    initialAngle: 3.9,
    rotationSpeed: 0.35,
    axialTiltDeg: 28.2,
    shape: "egg",
    eggScale: [1.6, 1.0, 0.8],
    fallbackColor: "#D3D0CB",
    whyName:
      "Named after Haumea, the Hawaiian goddess of fertility and childbirth, matching where the discovery was made.",
    history:
      "Discovered in 2004 by teams at Caltech and Sierra Nevada Observatory. Officially recognized as a dwarf planet in 2008.",
    facts: [
      "Spins so fast (once every 3.9 hours) that centrifugal force stretched it into an elongated egg shape.",
      "Possesses its own dark ring system, confirmed during a stellar occultation in 2017.",
      "Surrounded by a family of icy fragments created in an ancient giant collision.",
    ],
    infraredNote:
      "Infrared signatures show an unusually pure crystalline water ice shell, indicating resurfacing or cryo-activity.",
    quiz: {
      question: "Why is the dwarf planet Haumea shaped like an elongated egg?",
      options: [
        "It spins extremely fast, once every 3.9 hours",
        "It was melted by a nearby comet",
        "It is pulled apart by Neptune's gravity",
        "It is made of soft liquid metals",
      ],
      answer: "It spins extremely fast, once every 3.9 hours",
      explanation: "Haumea's lightning-fast 3.9-hour rotation flattens its poles and stretches its equator into a football-like triaxial ellipsoid.",
    },
  },
  {
    id: "makemake",
    name: "Makemake",
    type: "Dwarf planet",
    size: 0.68,
    orbitRadius: 198,
    orbitSpeed: 0.014,
    initialAngle: 0.3,
    rotationSpeed: 0.1,
    axialTiltDeg: 29.0,
    fallbackColor: "#B55838",
    whyName:
      "Named after Makemake, the chief creator god of humanity and fertility in the mythology of the Rapa Nui people of Easter Island.",
    history:
      "Discovered on March 31, 2005 by a team led by Mike Brown at Palomar Observatory, shortly after Easter (informally nicknamed Easterbunny).",
    facts: [
      "The second brightest Kuiper Belt object in our sky after Pluto.",
      "Has a reddish-brown hue created by tholins (complex organic molecules formed by ultraviolet light on methane).",
      "Orbits in the cold outer Kuiper belt at an average distance of 45 times Earth's distance from the Sun.",
    ],
    infraredNote:
      "Infrared detection revealed large methane ice grains and traces of ethane on its frigid surface.",
    quiz: {
      question: "Where does the name of the dwarf planet Makemake originate?",
      options: [
        "The Rapa Nui mythology of Easter Island",
        "Ancient Egyptian sun worship",
        "Norse mythology of frost giants",
        "An indigenous Australian constellation",
      ],
      answer: "The Rapa Nui mythology of Easter Island",
      explanation: "Discovered just after Easter 2005, it was named after Makemake, the creator god in the traditions of Easter Island (Rapa Nui).",
    },
  },
  {
    id: "eris",
    name: "Eris",
    type: "Dwarf planet",
    size: 0.74,
    orbitRadius: 218,
    orbitSpeed: 0.011,
    initialAngle: 2.7,
    rotationSpeed: 0.08,
    axialTiltDeg: 44.0,
    fallbackColor: "#EAE6E1",
    whyName:
      "Named after Eris, the Greek goddess of strife and discord, because its discovery sparked intense debate over the definition of a planet.",
    history:
      "Discovered in January 2005 by Mike Brown, Chad Trujillo, and David Rabinowitz. It was initially hailed as the Solar System's 10th planet.",
    facts: [
      "More massive than Pluto, which directly led astronomers to create the 'dwarf planet' classification in 2006.",
      "One of the most reflective bodies in the Solar System, reflecting 96% of sunlight falling on its frozen surface.",
      "Has a small moon named Dysnomia, daughter of the goddess of strife.",
    ],
    infraredNote:
      "Near-infrared spectra indicate an extremely bright, thin frost glaze of methane ice that condenses as Eris travels along its 557-year orbit.",
    quiz: {
      question: "What major astronomical change was triggered by the discovery of Eris in 2005?",
      options: [
        "Creation of the dwarf planet category and Pluto's reclassification",
        "Demotion of Mercury from planet status",
        "Cancellation of all outer solar system space probes",
        "Discovery that the asteroid belt was artificial",
      ],
      answer: "Creation of the dwarf planet category and Pluto's reclassification",
      explanation: "Because Eris was more massive than Pluto, the IAU established a rigorous definition of a planet in 2006, creating the dwarf planet category.",
    },
  },
];
