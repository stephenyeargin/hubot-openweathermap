// Description:
//   OpenWeather One Call 3.0
//
// Commands:
//   hubot weather
//   hubot weather <location>
//
// Configuration:
//   HUBOT_OPEN_WEATHER_MAP_API_KEY
//   HUBOT_DEFAULT_LATITUDE
//   HUBOT_DEFAULT_LONGITUDE

const dayjs = require('dayjs');
const semver = require('semver');
const LocalizedFormat = require('dayjs/plugin/localizedFormat');
const UTC = require('dayjs/plugin/utc');
const Timezone = require('dayjs/plugin/timezone');
const AdvancedFormat = require('dayjs/plugin/advancedFormat');

const US_STATES = new Set([
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in',
  'ia', 'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv',
  'nh', 'nj', 'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn',
  'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy',
]);

const { EmbedBuilder: DiscordEmbedBuilder } = require('discord.js');
// eslint-disable-next-line global-require
const hubotVersion = require('hubot/package.json').version || '0.0.0';

dayjs.extend(LocalizedFormat);
dayjs.extend(UTC);
dayjs.extend(Timezone);
dayjs.extend(AdvancedFormat);

module.exports = (robot) => {
  const GEO_DIRECT_URL = 'https://api.openweathermap.org/geo/1.0/direct';
  const GEO_ZIP_URL = 'https://api.openweathermap.org/geo/1.0/zip';
  const GEO_REVERSE_URL = 'https://api.openweathermap.org/geo/1.0/reverse';
  const ONECALL_URL = 'https://api.openweathermap.org/data/3.0/onecall';

  /**
   * Convert Kelvin to desired unit
   */
  const formatUnits = (value, unit) => {
    let output;
    switch (unit) {
      case 'metric':
        output = value - 273.15;
        break;
      case 'imperial':
        output = (((value - 273.15) * 9) / 5) + 32;
        break;
      default:
        output = value;
    }
    return output.toFixed(0);
  };

  /**
   * Normalize provided location
   * @param {string} input Location input
   * @returns string
   */
  const normalizeLocation = (input) => {
    const parts = input.split(',').map((p) => p.trim().toLowerCase());

    // city, state → assume US
    if (parts.length === 2 && US_STATES.has(parts[1])) {
      return `${parts[0]},${parts[1]},us`;
    }

    return input;
  };

  /**
   * Format Location Name
   * @param {object} loc Response from geocoding API
   * @returns string
   */
  const formatLocationName = (loc) => {
    if (!loc) return 'Unknown location';

    if (loc.state && loc.country === 'US') {
      return `${loc.name}, ${loc.state}`;
    }

    if (loc.country) {
      return `${loc.name}, ${loc.country}`;
    }

    return loc.name;
  };

  /**
   * Resolve a free-form location string to lat/lon
   */
  const geocodeLocation = (location, callback) => {
    const apiKey = process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;

    // ZIP code (simple heuristic)
    if (/^\d{4,10}$/.test(location)) {
      robot.logger.debug({ message: 'Searched by zip code', location });
      robot.http(GEO_ZIP_URL)
        .query({ zip: location, appid: apiKey })
        .get()((err, _res, body) => {
          if (err) return callback(err);

          const json = JSON.parse(body);
          if (!json.lat || !json.lon) {
            robot.logger.debug(body);
            return callback('Location not found');
          }

          return callback(null, {
            lat: json.lat,
            lon: json.lon,
            name: json.name,
            country: json.country,
          });
        });
      return;
    }

    // Free-form city/region/country string
    robot.logger.debug({ message: 'Searched by free-form city/region-county', location });
    const normalizedLocation = normalizeLocation(location);
    robot.http(GEO_DIRECT_URL)
      .query({
        q: normalizedLocation,
        limit: 1,
        appid: apiKey,
      })
      .get()((err, _res, body) => {
        if (err) return callback(err);

        const json = JSON.parse(body);
        if (!Array.isArray(json) || json.length === 0) {
          robot.logger.debug(body);
          return callback('Location not found');
        }

        const place = json[0];

        return callback(null, {
          lat: place.lat,
          lon: place.lon,
          name: place.name,
          state: place.state,
          country: place.country,
        });
      });
  };

  /**
   * Reverse Geocode
   * @param {object} coords Coordinates to query for a location name
   * @param {function} callback Callback function
   */
  const reverseGeocode = (coords, callback) => {
    const apiKey = process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;

    robot.http(GEO_REVERSE_URL)
      .query({
        lat: coords.lat,
        lon: coords.lon,
        limit: 1,
        appid: apiKey,
      })
      .get()((err, _res, body) => {
        if (err) {
          robot.logger.error(err);
          return callback(err);
        }

        const json = JSON.parse(body);
        if (!Array.isArray(json) || json.length === 0) {
          return callback(null, null);
        }

        const place = json[0];
        return callback(null, {
          lat: place.lat,
          lon: place.lon,
          name: place.name,
          state: place.state,
          country: place.country,
        });
      });
  };

  /**
   * Fetch weather + alerts from One Call 3.0
   */
  const getOneCallWeather = (coords, callback) => {
    robot.http(ONECALL_URL)
      .query({
        lat: coords.lat,
        lon: coords.lon,
        // exclude: 'minutely,hourly,daily',
        appid: process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY,
      })
      .get()((err, _res, body) => {
        if (err) return callback(err);

        const json = JSON.parse(body);
        if (!json.current) {
          robot.logger.debug(body);
          return callback('Weather data unavailable');
        }

        // Normalize alerts array
        json.alerts = json.alerts || [];
        return callback(null, json);
      });
  };

  /**
   * Format weather + alerts (One Call 3.0)
   */
  const formatWeather = (json) => {
    const textFallback = `Currently ${json.current?.weather[0]?.description} and ${formatUnits(
      json.current.temp,
      'imperial',
    )}F/${formatUnits(json.current.temp, 'metric')}C in ${formatLocationName(json.location)}`;
    const adapterName = robot.adapterName ?? robot.adapter?.name ?? '';

    if (/slack/i.test(adapterName)) {
      const blocks = {
        attachments: [
          {
            title: `Weather for ${formatLocationName(json.location)}`,
            title_link: `https://openweathermap.org/weathermap?zoom=12&lat=${json.lat}&lon=${json.lon}`,
            fallback: textFallback,
            author_icon: 'https://github.com/openweathermap.png',
            author_link: 'https://openweathermap.org/',
            author_name: 'OpenWeather',
            color: '#eb6e4b',
            thumb_url: `https://openweathermap.org/img/wn/${json.current.weather[0].icon}@4x.png`,
            fields: [
              {
                title: 'Conditions',
                value: `${json.current.weather[0].main} (${json.current.weather[0].description})`,
                short: true,
              },
              {
                title: 'Temperature',
                value: `${formatUnits(json.current.temp, 'imperial')}F/${formatUnits(json.current.temp, 'metric')}C`,
                short: true,
              },
              {
                title: 'Feels Like',
                value: `${formatUnits(json.current.feels_like, 'imperial')}F/${formatUnits(
                  json.current.feels_like,
                  'metric',
                )}C`,
                short: true,
              },
              {
                title: 'Humidity',
                value: `${json.current.humidity}%`,
                short: true,
              },
            ],
            footer: 'Weather data provided by OpenWeather',
            ts: json.current.dt,
          },
        ],
      };

      json.alerts.forEach((alert) => {
        blocks.attachments.push({
          title: alert.event,
          fallback: `${alert.event}: ${alert.description}`,
          text: `\`\`\`\n${alert.description}\n\`\`\``,
          author_name: alert.sender_name,
          author_icon: 'https://a.slack-edge.com/production-standard-emoji-assets/14.0/apple-small/26a0-fe0f.png',
          color: '#FF0000',
          fields: [
            {
              title: 'Effective',
              value: `${dayjs.unix(alert.start).tz(json.timezone).format('lll z')} - ${dayjs.unix(alert.end).tz(json.timezone).format('lll z')}`,
            },
            {
              title: 'Tags',
              value: alert.tags?.join(', ') || '—',
            },
          ],
        });
      });

      return blocks;
    }

    if (adapterName.includes('discord')) {
      if (semver.lt(robot.parseVersion() || hubotVersion, '11.0.0')) {
        return textFallback;
      }

      const embeds = [
        new DiscordEmbedBuilder()
          .setTitle(`Weather for ${formatLocationName(json.location)}`)
          .setURL(`https://openweathermap.org/weathermap?zoom=12&lat=${json.lat}&lon=${json.lon}`)
          .setAuthor({
            name: 'OpenWeather',
            url: 'https://openweathermap.org/',
            iconURL: 'https://github.com/openweathermap.png',
          })
          .addFields(
            {
              name: 'Conditions',
              value: `${json.current.weather[0].main} (${json.current.weather[0].description})`,
              inline: true,
            },
            {
              name: 'Temperature',
              value: `${formatUnits(json.current.temp, 'imperial')}F/${formatUnits(
                json.current.temp,
                'metric',
              )}C`,
              inline: true,
            },
            {
              name: 'Feels Like',
              value: `${formatUnits(json.current.feels_like, 'imperial')}F/${formatUnits(
                json.current.feels_like,
                'metric',
              )}C`,
              inline: true,
            },
            {
              name: 'Humidity',
              value: `${json.current.humidity}%`,
              inline: true,
            },
          )
          .setThumbnail(`https://openweathermap.org/img/wn/${json.current.weather[0].icon}@4x.png`)
          .setColor('#eb6e4b')
          .setFooter({
            text: 'Weather data provided by OpenWeather',
            iconURL: 'https://github.com/openweathermap.png',
          })
          .setTimestamp(new Date(json.current.dt * 1000)),
      ];

      json.alerts.forEach((alert) => {
        embeds.push(
          new DiscordEmbedBuilder()
            .setTitle(alert.event)
            .setDescription(`\`\`\`\n${alert.description}\n\`\`\``)
            .setColor('#FF0000')
            .addFields(
              {
                name: 'Effective',
                value: `${dayjs.unix(alert.start).tz(json.timezone).format('lll z')} - ${dayjs.unix(alert.end).tz(json.timezone).format('lll z')}`,
                inline: true,
              },
            )
            .setFooter({
              text: alert.sender_name,
              iconURL: 'https://github.com/openweathermap.png',
            }),
        );
      });

      return { embeds };
    }

    return textFallback;
  };

  /**
   * Error handler
   */
  const handleError = (err, msg) => {
    robot.logger.error(err);
    msg.send('Sorry, I couldn’t retrieve weather data for that location.');
  };

  /**
   * Unified responder
   */
  robot.respond(/weather\s*(.*)?$/i, (msg) => {
    if (!process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY) {
      msg.send('No API Key configured.');
      return;
    }

    const query = msg.match[1]?.trim();

    // Default location
    if (!query) {
      if (!process.env.HUBOT_DEFAULT_LATITUDE || !process.env.HUBOT_DEFAULT_LONGITUDE) {
        msg.send('No default location set.');
        return;
      }

      const coords = {
        lat: process.env.HUBOT_DEFAULT_LATITUDE,
        lon: process.env.HUBOT_DEFAULT_LONGITUDE,
      };
      reverseGeocode(coords, (_geoErr, place) => {
        getOneCallWeather(coords, (error, weather) => {
          if (error) {
            robot.logger.debug(error);
            return handleError(error, msg);
          }

          if (place) {
            weather.location = place;
          }

          return msg.send(formatWeather(weather));
        });
      });
      return;
    }

    // Flexible location
    geocodeLocation(query, (geoErr, coords) => {
      if (geoErr) {
        robot.logger.error({ query, geoErr });
        msg.send('Sorry, I couldn’t find that location.');
        return;
      }

      getOneCallWeather(coords, (weatherErr, weather) => {
        if (weatherErr) {
          robot.logger.error({ coords, weatherErr });
          return handleError(weatherErr, msg);
        }
        weather.location = {
          name: coords.name,
          state: coords.state,
          country: coords.country,
        };
        return msg.send(formatWeather(weather));
      });
    });
  });
};
