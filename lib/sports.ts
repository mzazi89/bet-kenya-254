export type Pick = { id: string; label: string; odds: number };
export type Market = { id: string; name: string; picks: Pick[] };
export type Match = {
  id: string;
  sport: "Football" | "Rugby" | "Cricket" | "Basketball";
  league: string;
  home: string;
  away: string;
  kickoff: string;
  venue: string;
  live?: boolean;
  score?: string;
  markets: Market[];
};

export const MATCHES: Match[] = [
  {
    id: "m1",
    sport: "Football",
    league: "FKF Premier League",
    home: "Gor Mahia",
    away: "AFC Leopards",
    kickoff: "Today · 16:00",
    venue: "Nyayo Stadium, Nairobi",
    live: true,
    score: "1 - 1 · 63'",
    markets: [
      {
        id: "1x2",
        name: "Match result",
        picks: [
          { id: "home", label: "Gor Mahia", odds: 2.05 },
          { id: "draw", label: "Draw", odds: 3.1 },
          { id: "away", label: "AFC Leopards", odds: 3.6 },
        ],
      },
      {
        id: "ou25",
        name: "Total goals",
        picks: [
          { id: "over", label: "Over 2.5", odds: 1.88 },
          { id: "under", label: "Under 2.5", odds: 1.92 },
        ],
      },
      {
        id: "btts",
        name: "Both teams to score",
        picks: [
          { id: "yes", label: "Yes", odds: 1.9 },
          { id: "no", label: "No", odds: 1.82 },
        ],
      },
    ],
  },
  {
    id: "m2",
    sport: "Football",
    league: "FKF Premier League",
    home: "Tusker FC",
    away: "Bandari FC",
    kickoff: "Today · 18:30",
    venue: "Ruaraka Grounds, Nairobi",
    markets: [
      {
        id: "1x2",
        name: "Match result",
        picks: [
          { id: "home", label: "Tusker FC", odds: 1.72 },
          { id: "draw", label: "Draw", odds: 3.4 },
          { id: "away", label: "Bandari FC", odds: 4.6 },
        ],
      },
      {
        id: "ou25",
        name: "Total goals",
        picks: [
          { id: "over", label: "Over 2.5", odds: 2.1 },
          { id: "under", label: "Under 2.5", odds: 1.68 },
        ],
      },
    ],
  },
  {
    id: "m3",
    sport: "Football",
    league: "International Friendly",
    home: "Harambee Stars",
    away: "Uganda Cranes",
    kickoff: "Tomorrow · 20:00",
    venue: "Kasarani Stadium, Nairobi",
    markets: [
      {
        id: "1x2",
        name: "Match result",
        picks: [
          { id: "home", label: "Harambee Stars", odds: 2.25 },
          { id: "draw", label: "Draw", odds: 3.05 },
          { id: "away", label: "Uganda Cranes", odds: 3.15 },
        ],
      },
      {
        id: "btts",
        name: "Both teams to score",
        picks: [
          { id: "yes", label: "Yes", odds: 1.75 },
          { id: "no", label: "No", odds: 2.0 },
        ],
      },
    ],
  },
  {
    id: "m4",
    sport: "Rugby",
    league: "Rugby Africa Cup",
    home: "Kenya Simbas",
    away: "Zimbabwe Goshawks",
    kickoff: "Sat · 15:00",
    venue: "RFUEA Grounds, Nairobi",
    markets: [
      {
        id: "winner",
        name: "Match winner",
        picks: [
          { id: "home", label: "Kenya Simbas", odds: 1.55 },
          { id: "away", label: "Zimbabwe Goshawks", odds: 2.35 },
        ],
      },
      {
        id: "handicap",
        name: "Handicap (-7.5)",
        picks: [
          { id: "home", label: "Simbas -7.5", odds: 1.9 },
          { id: "away", label: "Goshawks +7.5", odds: 1.85 },
        ],
      },
    ],
  },
  {
    id: "m5",
    sport: "Cricket",
    league: "ICC T20 Qualifier",
    home: "Kenya",
    away: "Uganda",
    kickoff: "Sun · 14:00",
    venue: "Gymkhana Club, Nairobi",
    markets: [
      {
        id: "winner",
        name: "Match winner",
        picks: [
          { id: "home", label: "Kenya", odds: 1.66 },
          { id: "away", label: "Uganda", odds: 2.15 },
        ],
      },
      {
        id: "runs",
        name: "Total runs (Kenya innings)",
        picks: [
          { id: "over", label: "Over 150.5", odds: 1.95 },
          { id: "under", label: "Under 150.5", odds: 1.8 },
        ],
      },
    ],
  },
  {
    id: "m6",
    sport: "Basketball",
    league: "Kenya Basketball League",
    home: "Nairobi City Thunder",
    away: "KPA Panthers",
    kickoff: "Sun · 17:00",
    venue: "Nyayo Gymnasium, Nairobi",
    markets: [
      {
        id: "winner",
        name: "Match winner",
        picks: [
          { id: "home", label: "City Thunder", odds: 1.48 },
          { id: "away", label: "KPA Panthers", odds: 2.55 },
        ],
      },
      {
        id: "spread",
        name: "Points spread",
        picks: [
          { id: "home", label: "Thunder -5.5", odds: 1.85 },
          { id: "away", label: "Panthers +5.5", odds: 1.9 },
        ],
      },
    ],
  },
  {
    id: "m7",
    sport: "Football",
    league: "Premier League",
    home: "Arsenal",
    away: "Manchester City",
    kickoff: "Sun · 18:30",
    venue: "Emirates Stadium, London",
    markets: [
      {
        id: "1x2",
        name: "Match result",
        picks: [
          { id: "home", label: "Arsenal", odds: 2.4 },
          { id: "draw", label: "Draw", odds: 3.5 },
          { id: "away", label: "Man City", odds: 2.75 },
        ],
      },
      {
        id: "ou25",
        name: "Total goals",
        picks: [
          { id: "over", label: "Over 2.5", odds: 1.7 },
          { id: "under", label: "Under 2.5", odds: 2.12 },
        ],
      },
    ],
  },
  {
    id: "m8",
    sport: "Football",
    league: "La Liga",
    home: "Real Madrid",
    away: "Barcelona",
    kickoff: "Sun · 21:00",
    venue: "Santiago Bernabéu, Madrid",
    markets: [
      {
        id: "1x2",
        name: "Match result",
        picks: [
          { id: "home", label: "Real Madrid", odds: 2.15 },
          { id: "draw", label: "Draw", odds: 3.45 },
          { id: "away", label: "Barcelona", odds: 3.05 },
        ],
      },
      {
        id: "btts",
        name: "Both teams to score",
        picks: [
          { id: "yes", label: "Yes", odds: 1.62 },
          { id: "no", label: "No", odds: 2.25 },
        ],
      },
    ],
  },
];

export const SPORTS = ["Football", "Rugby", "Cricket", "Basketball"] as const;
export type Sport = (typeof SPORTS)[number];
