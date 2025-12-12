import { Market } from "@/types/market";

export const sampleMarkets: Market[] = [
  // Multi-outcome markets (like Person of the Year, Elections)
  {
    id: "1",
    marketId: 1,
    title: "Time 2025 Person of the Year",
    category: "Culture",
    volume: "$19m",
    outcomes: [
      { id: "1a", name: "Artificial Intelligence", price: 43 },
      { id: "1b", name: "Jensen Huang", price: 21 },
    ],
  },
  {
    id: "2",
    marketId: 2,
    title: "Romania: Bucharest Mayoral Election",
    category: "Elections",
    volume: "$122m",
    outcomes: [
      { id: "2a", name: "Ciprian Ciucu", price: 57 },
      { id: "2b", name: "Daniel Baluta", price: 33 },
    ],
  },
  {
    id: "3",
    marketId: 3,
    title: "# of views of next MrBeast video on day 1?",
    category: "Culture",
    volume: "$3m",
    outcomes: [
      { id: "3a", name: "25-30M", price: 1 },
      { id: "3b", name: "35-40M", price: 98 },
    ],
  },
  // Simple Yes/No markets
  {
    id: "4",
    marketId: 4,
    title: "Russia x Ukraine ceasefire in 2025?",
    category: "World",
    volume: "$50m",
    outcomes: [
      { id: "4a", name: "Yes", price: 5 },
    ],
  },
  // Sports - Versus style
  {
    id: "5",
    marketId: 5,
    title: "La Liga Match",
    category: "Sports",
    volume: "$1m",
    isLive: true,
    liveLabel: "LALIGA",
    outcomes: [
      { id: "5a", name: "Elche CF", price: 73 },
      { id: "5b", name: "Girona FC", price: 7 },
      { id: "5c", name: "Draw", price: 20 },
    ],
  },
  {
    id: "6",
    marketId: 6,
    title: "Bundesliga 2",
    category: "Sports",
    volume: "$436k",
    isLive: true,
    liveLabel: "BL2",
    outcomes: [
      { id: "6a", name: "Hertha BSC", price: 42 },
      { id: "6b", name: "1. FC Magdeburg", price: 23 },
      { id: "6c", name: "Draw", price: 35 },
    ],
  },
  {
    id: "7",
    marketId: 7,
    title: "Counter Strike Match",
    category: "Esports",
    volume: "$571k",
    eventTime: "9:00 AM",
    liveLabel: "COUNTER STRIKE",
    outcomes: [
      { id: "7a", name: "B8", price: 28 },
      { id: "7b", name: "Natus Vincere", price: 72 },
    ],
  },
  {
    id: "8",
    marketId: 8,
    title: "NFL Game",
    category: "Sports",
    volume: "$779k",
    eventTime: "1:00 PM",
    liveLabel: "NFL",
    outcomes: [
      { id: "8a", name: "Colts", price: 54 },
      { id: "8b", name: "Jaguars", price: 47 },
    ],
  },
  {
    id: "9",
    marketId: 9,
    title: "NFL Game",
    category: "Sports",
    volume: "$734k",
    eventTime: "1:00 PM",
    liveLabel: "NFL",
    outcomes: [
      { id: "9a", name: "Seahawks", price: 74 },
      { id: "9b", name: "Falcons", price: 27 },
    ],
  },
  // Economy/Finance
  {
    id: "10",
    marketId: 10,
    title: "Fed decision in December?",
    category: "Economy",
    volume: "$277m",
    outcomes: [
      { id: "10a", name: "50+ bps decrease", price: 1 },
      { id: "10b", name: "25 bps decrease", price: 93 },
    ],
  },
  {
    id: "11",
    marketId: 11,
    title: "Maduro out by...?",
    category: "Politics",
    volume: "$22m",
    outcomes: [
      { id: "11a", name: "December 31, 2025", price: 9 },
      { id: "11b", name: "March 31, 2026", price: 33 },
    ],
  },
  {
    id: "12",
    marketId: 12,
    title: "F1 Drivers Champion",
    category: "Sports",
    volume: "$156m",
    outcomes: [
      { id: "12a", name: "Lando Norris", price: 76 },
      { id: "12b", name: "Max Verstappen", price: 21 },
    ],
  },
  // Elections
  {
    id: "13",
    marketId: 13,
    title: "Honduras Presidential Election",
    category: "Elections",
    volume: "$19m",
    outcomes: [
      { id: "13a", name: 'Nasry "Tito" Asfura', price: 86 },
      { id: "13b", name: "Salvador Nasralla", price: 14 },
    ],
  },
  {
    id: "14",
    marketId: 14,
    title: "SpaceX IPO Closing Market Cap",
    category: "Business",
    volume: "$88k",
    outcomes: [
      { id: "14a", name: "600B-700B", price: 7 },
      { id: "14b", name: "800B-900B", price: 13 },
    ],
  },
  {
    id: "15",
    marketId: 15,
    title: "Elon Musk # tweets December 2 - December 9, 2025?",
    category: "Culture",
    volume: "$9m",
    outcomes: [
      { id: "15a", name: "360-379", price: 14 },
      { id: "15b", name: "380-399", price: 18 },
    ],
  },
  {
    id: "16",
    marketId: 16,
    title: "Which party will win the House in 2026?",
    category: "Politics",
    volume: "$831k",
    outcomes: [
      { id: "16a", name: "Democratic Party", price: 74 },
      { id: "16b", name: "Republican Party", price: 26 },
    ],
  },
  // Crypto
  {
    id: "17",
    marketId: 17,
    title: "What price will Bitcoin hit in 2025?",
    category: "Crypto",
    volume: "$5m",
    outcomes: [
      { id: "17a", name: "↑ 105,000", price: 17 },
      { id: "17b", name: "↑ 100,000", price: 32 },
    ],
  },
  {
    id: "18",
    marketId: 18,
    title: "GPT ads by...?",
    category: "Tech",
    volume: "$2m",
    outcomes: [
      { id: "18a", name: "December 31", price: 5 },
      { id: "18b", name: "March 31", price: 32 },
    ],
  },
  {
    id: "19",
    marketId: 19,
    title: "Largest Company end of 2025?",
    category: "Business",
    volume: "$12m",
    outcomes: [
      { id: "19a", name: "NVIDIA", price: 87 },
      { id: "19b", name: "Apple", price: 10 },
    ],
  },
  {
    id: "20",
    marketId: 20,
    title: "Will Trump release Epstein files by...?",
    category: "Politics",
    volume: "$8m",
    outcomes: [
      { id: "20a", name: "December 19", price: 60 },
      { id: "20b", name: "December 31", price: 69 },
    ],
  },
];

export const subCategories = [
  { id: "all", name: "All" },
  { id: "trump", name: "Trump" },
  { id: "fed", name: "Fed" },
  { id: "ukraine", name: "Ukraine" },
  { id: "venezuela", name: "Venezuela" },
  { id: "honduras", name: "Honduras Election" },
  { id: "bucharest", name: "Bucharest Mayor" },
  { id: "best-2025", name: "Best of 2025" },
  { id: "aztec", name: "Aztec" },
  { id: "equities", name: "Equities" },
  { id: "weather", name: "Weather" },
];
