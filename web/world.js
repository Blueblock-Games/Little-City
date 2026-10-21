/* World save format v2. Individual v1 cities remain compatible and migrate intact. */
(function (root) {
  const E = root.CityEngine;
  const uid = () => crypto.randomUUID();
  const name = (s, fallback) =>
    typeof s === "string" && s.trim() ? s.trim().slice(0, 40) : fallback;
  function cities(w) {
    return w.countries.flatMap((c) => c.cities);
  }
  function active(w) {
    return cities(w).find((c) => c.id === w.activeCityId) || cities(w)[0];
  }
  function fresh(city) {
    return {
      version: 2,
      id: city.id,
      level: 1,
      continentName: "My Continent",
      activeCityId: city.id,
      countries: [{ id: uid(), name: "My Country", cities: [city] }],
      connections: [],
    };
  }
  function summary(w) {
    let list = cities(w);
    return {
      population: list.reduce((n, c) => n + E.stats(c).pop, 0),
      money: list.reduce((n, c) => n + c.money, 0),
      cities: list.length,
      countries: w.countries.length,
    };
  }
  function progress(w) {
    let a = summary(w),
      before = w.level;
    if (a.population >= 32) w.level = Math.max(2, w.level);
    if (a.population >= 120 && a.cities >= 3) w.level = 3;
    return w.level > before
      ? `Level ${w.level} unlocked — ${w.level === 2 ? "name your country and found more cities" : "name your continent and create more countries"}!`
      : null;
  }
  function recalculate(w) {
    let list = cities(w);
    for (let city of list)
      city.tradeIncome =
        w.connections.filter((l) => l.a === city.id || l.b === city.id).length *
        15;
  }
  function addCity(w, countryId, cityName) {
    progress(w);
    if (w.level < 2) throw Error("Reach 32 residents to unlock your country.");
    if (cities(w).length >= 24)
      throw Error("This world has reached its 24-city capacity.");
    let country = w.countries.find((c) => c.id === countryId);
    if (!country) throw Error("Choose a country.");
    if (country.cities.length >= 12)
      throw Error("A country can hold up to 12 cities.");
    let city = E.fresh(name(cityName, "New City"));
    country.cities.push(city);
    w.activeCityId = city.id;
    return city;
  }
  function addCountry(w, countryName, cityName) {
    progress(w);
    if (w.level < 3)
      throw Error(
        "Reach 120 total residents across at least 3 cities to unlock your continent.",
      );
    if (w.countries.length >= 8 || cities(w).length >= 24)
      throw Error("Your continent is full (8 countries / 24 cities).");
    let country = {
      id: uid(),
      name: name(countryName, "New Country"),
      cities: [E.fresh(name(cityName, "First City"))],
    };
    w.countries.push(country);
    w.activeCityId = country.cities[0].id;
    return country;
  }
  function connect(w, a, b) {
    if (w.level < 2) throw Error("Unlock country management first.");
    let list = cities(w),
      source = list.find((c) => c.id === a),
      target = list.find((c) => c.id === b);
    if (!source || !target || a === b)
      throw Error("Choose two different cities.");
    if (
      w.connections.some(
        (l) => (l.a === a && l.b === b) || (l.a === b && l.b === a),
      )
    )
      throw Error("These cities already have a road connection.");
    if (source.money < 150)
      throw Error("The starting city needs $150 to build this road.");
    source.money -= 150;
    w.connections.push({ a, b });
    recalculate(w);
  }
  function tick(w, now = Date.now()) {
    recalculate(w);
    let messages = [];
    for (let city of cities(w)) {
      let events = E.tick(city, now);
      if (city.id === w.activeCityId) messages.push(...events);
    }
    let unlocked = progress(w);
    if (unlocked) messages.push(unlocked);
    return messages;
  }
  function validate(input) {
    if (input?.version === 1) return fresh(E.validate(input));
    if (
      !input ||
      input.version !== 2 ||
      !Array.isArray(input.countries) ||
      input.countries.length < 1 ||
      input.countries.length > 8
    )
      throw Error("This is not a valid world save.");
    let ids = new Set(),
      countryIds = new Set();
    const validId = (x) => typeof x === "string" && /^[\w-]{1,80}$/.test(x);
    let countries = input.countries.map((c) => {
      if (
        !c ||
        !validId(c.id) ||
        countryIds.has(c.id) ||
        !Array.isArray(c.cities) ||
        c.cities.length < 1 ||
        c.cities.length > 12
      )
        throw Error("Invalid country in save.");
      countryIds.add(c.id);
      return {
        id: c.id,
        name: name(c.name, "My Country"),
        cities: c.cities.map((v) => {
          let city = E.validate(v);
          if (ids.has(city.id)) throw Error("Duplicate city ID.");
          ids.add(city.id);
          return city;
        }),
      };
    });
    if (ids.size > 24) throw Error("World saves support at most 24 cities.");
    let level =
      Number.isInteger(input.level) && input.level >= 1 && input.level <= 3
        ? input.level
        : 1;
    if (level === 1 && (countries.length !== 1 || ids.size !== 1))
      throw Error("A level-one world has exactly one city.");
    if (level === 2 && countries.length !== 1)
      throw Error("A level-two world has exactly one country.");
    if (input.connections !== undefined && !Array.isArray(input.connections))
      throw Error("Invalid connections.");
    let seen = new Set();
    const connections = (input.connections || []).map((l) => {
      if (!l || !ids.has(l.a) || !ids.has(l.b) || l.a === l.b)
        throw Error("Invalid road connection.");
      let key = [l.a, l.b].sort().join(":");
      if (seen.has(key)) throw Error("Duplicate road connection.");
      seen.add(key);
      return { a: l.a, b: l.b };
    });
    if (connections.length > 276) throw Error("Too many connections.");
    let w = {
      version: 2,
      id: validId(input.id) ? input.id : countries[0].cities[0].id,
      level,
      continentName: name(input.continentName, "My Continent"),
      activeCityId: ids.has(input.activeCityId)
        ? input.activeCityId
        : countries[0].cities[0].id,
      countries,
      connections,
    };
    progress(w);
    recalculate(w);
    return w;
  }
  root.WorldEngine = {
    fresh,
    validate,
    cities,
    active,
    summary,
    progress,
    recalculate,
    addCity,
    addCountry,
    connect,
    tick,
  };
  if (typeof module !== "undefined") module.exports = root.WorldEngine;
})(globalThis);
