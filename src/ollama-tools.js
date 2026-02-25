// Description:
//   OpenWeatherMap tools for Ollama integration
//
// Configuration:
//   HUBOT_OPEN_WEATHER_OLLAMA_ENABLED

module.exports = (robot, {
  geocodeLocation,
  getOneCallWeather,
  reverseGeocode,
  formatUnits,
}) => {
  // eslint-disable-next-line global-require
  const dayjs = require('dayjs');

  /**
   * Register tools for Ollama integration if enabled
   */
  if (process.env.HUBOT_OPEN_WEATHER_OLLAMA_ENABLED !== 'true') {
    robot.logger.debug('OpenWeatherMap Ollama tools disabled (set HUBOT_OPEN_WEATHER_OLLAMA_ENABLED=true to enable)');
    return;
  }

  robot.logger.info('Registering OpenWeatherMap tools with Ollama');

  try {
    // Resolve the registry once using explicit search paths for linked installs
    // eslint-disable-next-line global-require
    const path = require('path');
    const registryPath = require.resolve('hubot-ollama/src/tool-registry', {
      paths: [
        __dirname,
        path.resolve(__dirname, '../../node_modules'),
        path.resolve(__dirname, '../../../node_modules'),
        process.cwd(),
      ],
    });
    // eslint-disable-next-line global-require, import/no-unresolved, import/no-dynamic-require
    const registry = require(registryPath);

    robot.logger.info('Tool registry loaded successfully');

    const weatherTool = {
      description: 'Get current weather conditions for a location. Returns comprehensive weather data including temperature, conditions, humidity, and active weather alerts.',
      parameters: {
        type: 'object',
        required: ['location'],
        properties: {
          location: {
            type: 'string',
            description: 'Location to get weather for. Can be a city name, city/state, city/country, or ZIP code (e.g., "Denver, CO", "London", "75001").',
          },
        },
      },
      handler: async ({ location }) => new Promise((resolve, reject) => {
        geocodeLocation(location, (geoErr, coords) => {
          if (geoErr) {
            robot.logger.error(`Geocoding error for ${location}:`, geoErr);
            reject(new Error(`Could not find location: ${location}`));
            return;
          }

          getOneCallWeather(coords, (weatherErr, weather) => {
            if (weatherErr) {
              robot.logger.error('Weather fetch error:', weatherErr);
              reject(new Error(`Could not retrieve weather: ${weatherErr}`));
              return;
            }

            weather.location = {
              name: coords.name,
              state: coords.state,
              country: coords.country,
            };

            const result = {
              location: `${weather.location.name}${weather.location.state ? `, ${weather.location.state}` : ''}${weather.location.country ? `, ${weather.location.country}` : ''}`,
              current: {
                description: weather.current.weather[0].description,
                temperature_f: formatUnits(weather.current.temp, 'imperial'),
                temperature_c: formatUnits(weather.current.temp, 'metric'),
                feels_like_f: formatUnits(weather.current.feels_like, 'imperial'),
                feels_like_c: formatUnits(weather.current.feels_like, 'metric'),
                humidity: `${weather.current.humidity}%`,
                wind_speed: weather.current.wind_speed,
                uv_index: weather.current.uvi,
              },
              alerts: weather.alerts?.map((alert) => ({
                event: alert.event,
                description: alert.description,
                sender: alert.sender_name,
                starts: dayjs.unix(alert.start).format(),
                ends: dayjs.unix(alert.end).format(),
              })) || [],
            };

            robot.logger.debug('Weather result:', result);
            resolve(result);
          });
        });
      }),
    };

    registry.registerTool('get_current_weather', weatherTool);
    robot.logger.info('Registered get_current_weather tool');

    const reverseGeocodeTool = {
      description: 'Get the location name for given coordinates and retrieve weather for that location. Useful when you have latitude and longitude but need the location name and current weather.',
      parameters: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: {
            type: 'number',
            description: 'Latitude coordinate',
          },
          longitude: {
            type: 'number',
            description: 'Longitude coordinate',
          },
        },
      },
      handler: async ({ latitude, longitude }) => new Promise((resolve, reject) => {
        const coords = { lat: latitude, lon: longitude };

        reverseGeocode(coords, (geoErr, place) => {
          if (geoErr) {
            robot.logger.error(`Reverse geocoding error for ${latitude}, ${longitude}:`, geoErr);
            reject(new Error(`Could not reverse geocode coordinates: ${geoErr}`));
            return;
          }

          getOneCallWeather(coords, (weatherErr, weather) => {
            if (weatherErr) {
              robot.logger.error('Weather fetch error:', weatherErr);
              reject(new Error(`Could not retrieve weather: ${weatherErr}`));
              return;
            }

            if (place) {
              weather.location = place;
            }

            const result = {
              location: place ? `${place.name}${place.state ? `, ${place.state}` : ''}${place.country ? `, ${place.country}` : ''}` : `${latitude}, ${longitude}`,
              coordinates: {
                latitude,
                longitude,
              },
              current: {
                description: weather.current.weather[0].description,
                temperature_f: formatUnits(weather.current.temp, 'imperial'),
                temperature_c: formatUnits(weather.current.temp, 'metric'),
                feels_like_f: formatUnits(weather.current.feels_like, 'imperial'),
                feels_like_c: formatUnits(weather.current.feels_like, 'metric'),
                humidity: `${weather.current.humidity}%`,
                wind_speed: weather.current.wind_speed,
                uv_index: weather.current.uvi,
              },
              alerts: weather.alerts?.map((alert) => ({
                event: alert.event,
                description: alert.description,
                sender: alert.sender_name,
                starts: dayjs.unix(alert.start).format(),
                ends: dayjs.unix(alert.end).format(),
              })) || [],
            };

            robot.logger.debug('Reverse geocode weather result:', result);
            resolve(result);
          });
        });
      }),
    };

    registry.registerTool('reverse_geocode_weather', reverseGeocodeTool);
    robot.logger.info('Registered reverse_geocode_weather tool');

    robot.logger.info('OpenWeatherMap tools registered with Ollama');
  } catch (err) {
    // hubot-ollama not installed, silently ignore
    if (err.code !== 'MODULE_NOT_FOUND') {
      robot.logger.error(`Failed to register OpenWeather tools with Ollama: ${err.message}`, err);
    } else {
      robot.logger.debug('hubot-ollama not installed, skipping Ollama tool registration');
    }
  }
};
