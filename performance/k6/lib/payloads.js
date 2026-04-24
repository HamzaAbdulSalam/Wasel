const categories = [
  "traffic_jam",
  "accident",
  "hazard",
  "construction",
  "road_closure",
  "weather",
  "other",
];

const cities = ["Gaza", "Nablus", "Hebron", "Ramallah", "Jenin", "Jericho"];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomCoordinate(min, max) {
  return min + Math.random() * (max - min);
}

export function buildReportPayload() {
  const id = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  return {
    category: randomFrom(categories),
    description: `k6 load report ${id} - blocked road and heavy traffic around checkpoint`,
    city: randomFrom(cities),
    latitude: Number(randomCoordinate(31.2, 32.6).toFixed(8)),
    longitude: Number(randomCoordinate(34.2, 35.6).toFixed(8)),
  };
}

export function buildIncidentQuery(cityOverride) {
  const city = cityOverride || randomFrom(cities);
  return `city=${encodeURIComponent(city)}&status=active&page=1&limit=20&sortBy=createdAt&sortOrder=desc`;
}
