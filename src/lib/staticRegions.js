// Static region/market data as fallback when Base44 API is unavailable
// This mirrors the data stored in the Base44 Region entity
export const STATIC_REGIONS = [
  {
    name: "Northeast",
    managing_director: "Josh Peyton",
    markets: [
      "New Jersey",
      "New York City",
      "Connecticut",
      "New England",
      "Long Island",
      "Philadelphia",
      "Mid Atlantic"
    ]
  },
  {
    name: "Central",
    managing_director: "Damla Gerhart",
    markets: [
      "Chicago",
      "Ohio",
      "Indianapolis",
      "Minneapolis",
      "Michigan",
      "Pittsburgh",
      "Austin",
      "Dallas"
    ]
  },
  {
    name: "South",
    managing_director: "Chris Frasier",
    markets: [
      "Charlotte",
      "Raleigh",
      "South Carolina",
      "Atlanta",
      "Florida",
      "Nashville"
    ]
  },
  {
    name: "West",
    managing_director: "Chris Cooper",
    markets: [
      "SoCal",
      "NorCal",
      "Phoenix",
      "Denver",
      "Las Vegas"
    ]
  }
];
