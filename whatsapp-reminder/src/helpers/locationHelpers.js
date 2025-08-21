const axios = require("axios");

const FOURSQUARE_API_KEY = "fsq3nYbfFq3b4B1VLL0/jqqovlE2/9ZE3xA3HR/zN0sluTs=";

async function getNearbyRestaurants(locationName) {
  try {
    // Step 1: Get coordinates from location name
    const geoRes = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: locationName, format: "json", limit: 1 },
    });

    if (!geoRes.data.length) throw new Error("Location not found");

    const { lat, lon } = geoRes.data[0];

    // Step 2: Search for restaurants
    const searchRes = await axios.get("https://api.foursquare.com/v3/places/search", {
      headers: {
        Authorization: FOURSQUARE_API_KEY,
        Accept: "application/json",
      },
      params: {
        ll: `${lat},${lon}`,
        categories: "13065", // Restaurants
        radius: 5000,
        limit: 5,
      },
    });

    const places = searchRes.data.results;

    // Step 3: Collect details
    const detailedPlaces = await Promise.all(
      places.map(async (place) => {
        const fsq_id = place.fsq_id;
        const name = place.name || "Unnamed";
        const address = place.location?.formatted_address || "No address available";
        const mapsLink = place.geocodes?.main
          ? `https://www.google.com/maps/search/?api=1&query=${place.geocodes.main.latitude},${place.geocodes.main.longitude}`
          : "";

        let phone = "Not available";
        let website = "Not available";
        let imageUrl = null;

        // Step 4: Get additional info
        try {
          const detailRes = await axios.get(`https://api.foursquare.com/v3/places/${fsq_id}`, {
            headers: {
              Authorization: FOURSQUARE_API_KEY,
              Accept: "application/json",
            },
          });

          const details = detailRes.data;
          if (details.tel) phone = details.tel;
          if (details.website) website = details.website;
        } catch {
          // ignore detail errors
        }

        // Step 5: Get image
        try {
          const photoRes = await axios.get(`https://api.foursquare.com/v3/places/${fsq_id}/photos`, {
            headers: {
              Authorization: FOURSQUARE_API_KEY,
              Accept: "application/json",
            },
          });

          if (photoRes.data.length > 0) {
            const photo = photoRes.data[0];
            imageUrl = `${photo.prefix}original${photo.suffix}`;
          }
        } catch {
          // ignore image errors
        }

        const caption = `🍽️ *${name}*\n📍 ${address}\n📞 ${phone}\n🌐 ${website}\n➡️ Directions: ${mapsLink}`;

        return { image: imageUrl, caption, mapsLink };
      })
    );

    return detailedPlaces;
  } catch (err) {
    console.error("❌ Error fetching restaurants:", err.message);
    return [];
  }
}

module.exports = { getNearbyRestaurants };

