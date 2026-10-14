const express = require('express');
const redis = require('redis');
const app = express();

const PORT = 2000;
// Connect to Redis using the Docker container service name
const redisClient = redis.createClient({
    url: 'redis://weather-cache:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Mock database execution delay simulation
const mockWeatherDatabase = {
    "bengaluru": "24°C - Clear Sky",
    "london": "12°C - Rainy",
    "newyork": "18°C - Windy"
};

app.get('/api/weather/:city', async (req, res) => {
    const city = req.params.city.toLowerCase();

    try {
        // Step 1: Check Redis Cache first!
        const cachedWeather = await redisClient.get(city);
        
        if (cachedWeather) {
            console.log(`Cache Hit for ${city}!`);
            return res.json({ source: "Redis Cache", data: cachedWeather });
        }

        // Step 2: Cache Miss - Get from "database"
        console.log(`Cache Miss for ${city}. Fetching from Database...`);
        const weatherData = mockWeatherDatabase[city];

        if (!weatherData) {
            return res.status(404).json({ error: "City not found in database" });
        }

        // Step 3: Save to Redis Cache for future requests (expires in 60 seconds)
        await redisClient.setEx(city, 60, weatherData);

        return res.json({ source: "Mock Database", data: weatherData });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function run() {
    await redisClient.connect();
    console.log('Connected to Redis Cache Server');
    app.listen(PORT, () => console.log(`Weather backend active on port ${PORT}`));
}

run();
