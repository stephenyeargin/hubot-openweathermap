// Description:
//   Open Weather Map
//
// Commands:
//   hubot weather - Get weather for default location.
//   hubot weather <location> - Get weather for given query.
//
// Configuration:
//   HUBOT_OPEN_WEATHER_MAP_API_KEY - API Key
//   HUBOT_DEFAULT_LATITUDE - Default latitude for Hubot interactions
//   HUBOT_DEFAULT_LONGITUDE - Default longitude for Hubot interactions

const dayjs = require('dayjs');
const semver = require('semver');
const { EmbedBuilder: DiscordEmbedBuilder } = require('discord.js');
// eslint-disable-next-line global-require
const hubotVersion = require('hubot/package.json').version || '0.0.0';

module.exports = (robot) => {
  const baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
  const baseUrlNWS = 'https://api.weather.gov';
  // Default to US when a two-letter US state is provided without country code
  const US_STATES = new Set([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC',
  ]);
  // Map full US state names to their two-letter abbreviations
  const US_STATE_NAME_TO_ABBR = {
    alabama: 'AL',
    alaska: 'AK',
    arizona: 'AZ',
    arkansas: 'AR',
    california: 'CA',
    colorado: 'CO',
    connecticut: 'CT',
    delaware: 'DE',
    florida: 'FL',
    georgia: 'GA',
    hawaii: 'HI',
    idaho: 'ID',
    illinois: 'IL',
    indiana: 'IN',
    iowa: 'IA',
    kansas: 'KS',
    kentucky: 'KY',
    louisiana: 'LA',
    maine: 'ME',
    maryland: 'MD',
    massachusetts: 'MA',
    michigan: 'MI',
    minnesota: 'MN',
    mississippi: 'MS',
    missouri: 'MO',
    montana: 'MT',
    nebraska: 'NE',
    nevada: 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'north dakota': 'ND',
    ohio: 'OH',
    oklahoma: 'OK',
    oregon: 'OR',
    pennsylvania: 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    'south dakota': 'SD',
    tennessee: 'TN',
    texas: 'TX',
    utah: 'UT',
    vermont: 'VT',
    virginia: 'VA',
    washington: 'WA',
    'west virginia': 'WV',
    wisconsin: 'WI',
    wyoming: 'WY',
    'district of columbia': 'DC',
    'd.c.': 'DC',
    dc: 'DC',
  };
  // Regex to accept "City, ST" or full state names
  // Optional country code requires a preceding comma
  const CITY_STATE_COUNTRY_REGEX = new RegExp(
    'weather ([\\w ]+),\\s*([A-Za-z ]+?)(?=\\s*(?:,|$))'
    + '(?:\\s*,\\s*([A-Za-z]{2,3}))?',
    'i',
  );

  /**
   * Get Severity Color
   * @param {string} severity NWS severity scale
   * @returns string
   */
  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'extreme':
        return '#FF3838';
      case 'severe':
        return '#FFB302';
      case 'moderate':
        return '#FCE83A';
      case 'minor':
        return '#56F000';
      default:
        return '#A4ABB6';
    }
  };

  /**
   * Get Forecast
   * @param {string} query City or zip code search
   * @param {function} callback Arguments: Error, Response Object
   * @return void
   */
  const getForecast = (query, callback) => {
    query.appid = process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;
    robot.http(baseUrl)
      .query(query)
      .get()((err, _res, body) => {
        if (err) {
          callback(err);
          return;
        }
        const json = JSON.parse(body);
        if ((json.cod != null) && (json.cod !== 200)) {
          callback(json.message);
          return;
        }
        callback(err, json);
      });
  };

  /**
   * Get Alerts
   * @param {object} query Geo coordinates for alert location as { latitude, longitude }
   * @param {function} callback Arguments: Error, Response Object
   * @returns void
   */
  const getAlerts = (query, callback) => robot.http(`${baseUrlNWS}/points/${query.latitude},${query.longitude}`)
    .headers({
      'User-agent': '@stephenyeargin/hubot-openweathermap <hubot@yearg.in>',
    })
    .get()((err1, _res1, body1) => {
      if (err1) {
        callback(err1);
        return;
      }
      const pointJSON = JSON.parse(body1);

      // Check if the response contains valid properties (e.g., not a 404 error response)
      if (!pointJSON.properties || !pointJSON.properties.county) {
        // Location is outside US or invalid
        callback(null, { features: [] });
        return;
      }

      const countyCode = pointJSON.properties.county.match(/.*\/(\w+)$/)[1];

      robot.http(`${baseUrlNWS}/alerts/active/zone/${countyCode}`)
        .headers({
          'User-agent': '@stephenyeargin/hubot-openweathermap <hubot@yearg.in>',
        })
        .get()((err2, _res2, body2) => {
          if (err2) {
            callback(err2);
            return;
          }
          const alerts = JSON.parse(body2);
          robot.logger.debug(alerts);
          callback(err2, alerts);
        });
    });

  /**
   * Format Alerts
   * @param {object} json Alert API response object
   * @returns string|object Return format based on Hubot adapter
   */
  const formatAlerts = (json) => {
    const output = [`${json.title}:`, 'See https://weather.gov for details.'];
    json.features.forEach((alert) => {
      output.push(`- ${alert.properties.headline}`);
    });
    const textFallback = output.join('\n');
    const adapterName = robot.adapterName ?? robot.adapter?.name ?? '';
    if (/slack/i.test(adapterName)) {
      const attachments = json.features.map((alert) => ({
        author_icon: 'https://github.com/NOAAGov.png',
        author_link: 'https://weather.gov/',
        author_name: 'Weather.gov',
        pretext: alert.properties.event,
        title: alert.properties.headline,
        // Link removed because alerts.weather.gov is no longer available
        fallback: alert.properties.description,
        text: '```\n'
              + `${alert.properties.description}\n`
              + '```',
        mrkdwn_in: ['text'],
        fields: [
          {
            title: 'Severity',
            value: alert.properties.severity,
            short: true,
          },
          {
            title: 'Certainty',
            value: alert.properties.certainty,
            short: true,
          },
          {
            title: 'Areas Affected',
            value: alert.properties.areaDesc,
            short: false,
          },
          {
            title: 'Instructions / Response',
            value: alert.properties.instruction || alert.properties.response,
            short: false,
          },
        ],
        footer: 'Alerts provided by the National Weather Service',
        color: getSeverityColor(alert.properties.severity),
        ts: dayjs(alert.properties.sent).unix(),
      }));
      return {
        text: `*${json.title}*`,
        mrkdwn: true,
        attachments,
      };
    }
    if (robot.adapterName && robot.adapterName.indexOf('discord') > -1) {
      if (semver.lt(robot.parseVersion() || hubotVersion, '11.0.0')) {
        robot.logger.info('@stephenyeargin/hubot-openweathermap: Unable to use Discord embeds if Hubot < v11');
        return textFallback;
      }
      const embeds = json.features.map((alert) => new DiscordEmbedBuilder()
        .setTitle(alert.properties.headline)
        .setColor(getSeverityColor(alert.properties.severity))
        .setTimestamp(new Date(alert.properties.sent))
        .setAuthor({
          name: 'Weather.gov',
          url: 'https://weather.gov/',
          iconURL: 'https://github.com/NOAAGov.png',
        })
        .setDescription('```\n'
        + `${alert.properties.description}\n`
        + '```')
        .addFields(
          {
            name: 'Severity',
            value: alert.properties.severity,
            inline: true,
          },
          {
            name: 'Certainty',
            value: alert.properties.certainty,
            inline: true,
          },
          {
            name: 'Areas Affected',
            value: alert.properties.areaDesc,
            inline: false,
          },
          {
            name: 'Instructions / Response',
            value: alert.properties.instruction || alert.properties.response,
            inline: false,
          },
        )
        .setFooter({
          text: 'Alerts provided by the National Weather Service',
          iconURL: 'https://github.com/NOAAGov.png',
        }));
      return { embeds };
    }
    return textFallback;
  };

  /**
   *
   * @param {float} value Raw value from API
   * @param {string} unit Desired measurement (metric, imperial)
   * @returns
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
   *
   * @param {object} json Response object from API
   * @returns string|object Return format based on Hubot adapter
   */
  const formatWeather = (json) => {
    const textFallback = `Currently ${json.weather[0].description} and ${formatUnits(json.main.temp, 'imperial')}F/${formatUnits(json.main.temp, 'metric')}C in ${json.name}`;
    const adapterName = robot.adapterName ?? robot.adapter?.name ?? '';
    if (/slack/i.test(adapterName)) {
      return {
        attachments: [{
          title: `Weather in ${json.name}`,
          title_link: `https://openweathermap.org/weathermap?zoom=12&lat=${json.coord.lat}&lon=${json.coord.lon}`,
          fallback: textFallback,
          author_icon: 'https://github.com/openweathermap.png',
          author_link: 'https://openweathermap.org/',
          author_name: 'OpenWeather',
          color: '#eb6e4b',
          thumb_url: `https://openweathermap.org/img/wn/${json.weather[0].icon}@4x.png`,
          fields: [
            {
              title: 'Conditions',
              value: `${json.weather[0].main} (${json.weather[0].description})`,
              short: true,
            },
            {
              title: 'Temperature',
              value: `${formatUnits(json.main.temp, 'imperial')}F/${formatUnits(json.main.temp, 'metric')}C`,
              short: true,
            },
            {
              title: 'Feels Like',
              value: `${formatUnits(json.main.feels_like, 'imperial')}F/${formatUnits(json.main.feels_like, 'metric')}C`,
              short: true,
            },
            {
              title: 'Humidity',
              value: `${json.main.humidity}%`,
              short: true,
            },
          ],
          footer: 'Weather data provided by OpenWeather',
          ts: json.dt,
        }],
      };
    }
    if (robot.adapterName && robot.adapterName.indexOf('discord') > -1) {
      if (semver.lt(robot.parseVersion() || hubotVersion, '11.0.0')) {
        robot.logger.info('@stephenyeargin/hubot-openweathermap: Unable to use Discord embeds if Hubot < v11');
        return textFallback;
      }

      const embed = new DiscordEmbedBuilder()
        .setTitle(`Weather in ${json.name}`)
        .setURL(`https://openweathermap.org/weathermap?zoom=12&lat=${json.coord.lat}&lon=${json.coord.lon}`)
        .setAuthor({
          name: 'OpenWeather',
          url: 'https://openweathermap.org/',
          iconURL: 'https://github.com/openweathermap.png',
        })
        .addFields(
          {
            name: 'Conditions',
            value: `${json.weather[0].main} (${json.weather[0].description})`,
            inline: true,
          },
          {
            name: 'Temperature',
            value: `${formatUnits(json.main.temp, 'imperial')}F/${formatUnits(json.main.temp, 'metric')}C`,
            inline: true,
          },
          {
            name: 'Feels Like',
            value: `${formatUnits(json.main.feels_like, 'imperial')}F/${formatUnits(json.main.feels_like, 'metric')}C`,
            inline: true,
          },
          {
            name: 'Humidity',
            value: `${json.main.humidity}%`,
            inline: true,
          },
        )
        .setThumbnail(`https://openweathermap.org/img/wn/${json.weather[0].icon}@4x.png`)
        .setColor('#eb6e4b')
        .setFooter({
          text: 'Weather data provided by OpenWeather',
          iconURL: 'https://github.com/openweathermap.png',
        })
        .setTimestamp(new Date(json.dt * 1000));
      return { embeds: [embed] };
    }
    return textFallback;
  };

  /**
   *
   * @param {object|string} err Stringable object or string representing error
   * @param {*} msg
   */
  const handleError = (err, msg) => {
    robot.logger.error(err);
    const isCityNotFound = (typeof err === 'string') && /city not found/i.test(err);
    if (isCityNotFound) {
      msg.send('Sorry, I couldn\'t find that location. Try a zip code or "City, ST[, Country]".');
      return;
    }
    msg.send(`Encountered error: ${err}`);
  };

  // Give default weather
  robot.respond(/weather$/i, (msg) => {
    if (!process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY) {
      msg.send('No API Key configured.');
      return;
    }

    if (!process.env.HUBOT_DEFAULT_LATITUDE || !process.env.HUBOT_DEFAULT_LONGITUDE) {
      msg.send('No default location set.');
      return;
    }

    getForecast({
      lat: process.env.HUBOT_DEFAULT_LATITUDE,
      lon: process.env.HUBOT_DEFAULT_LONGITUDE,
    }, (err1, forecastData) => {
      if (err1) {
        handleError(err1, msg);
        return;
      }
      robot.logger.debug(forecastData);
      msg.send(formatWeather(forecastData));

      getAlerts({
        latitude: forecastData.coord.lat,
        longitude: forecastData.coord.lon,
      }, (err2, alertData) => {
        if (err2) {
          handleError(err2, msg);
          return;
        }
        robot.logger.debug(alertData);
        if (alertData.features.length > 0) {
          msg.send(formatAlerts(alertData));
        }
      });
    });
  });

  // Search by zip code
  robot.respond(/weather (\d+)/i, (msg) => {
    if (!process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY) {
      msg.send('No API Key configured.');
      return;
    }
    const zipCode = msg.match[1];

    getForecast({
      zip: zipCode,
    }, (err1, forecastData) => {
      if (err1) {
        handleError(err1, msg);
        return;
      }
      robot.logger.debug(forecastData);
      msg.send(formatWeather(forecastData));

      getAlerts({
        latitude: forecastData.coord.lat,
        longitude: forecastData.coord.lon,
      }, (err2, alertData) => {
        if (err2) {
          handleError(err2, msg);
          return;
        }
        robot.logger.info(alertData);
        if (alertData.features.length > 0) {
          msg.send(formatAlerts(alertData));
        }
      });
    });
  });

  // Search by city name
  robot.respond(CITY_STATE_COUNTRY_REGEX, (msg) => {
    if (!process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY) {
      msg.send('No API Key configured.');
      return;
    }

    const cityName = msg.match[1];
    const rawState = msg.match[2].trim();
    const state = rawState.length === 2
      ? rawState.toUpperCase()
      : (US_STATE_NAME_TO_ABBR[rawState.toLowerCase()] || rawState.toUpperCase());
    let country = '';
    if (msg.match[3]) {
      country = msg.match[3].toUpperCase();
    } else if (US_STATES.has(state)) {
      country = 'US';
    }
    robot.logger.debug(cityName, state);

    getForecast({
      q: `${cityName},${state}${country ? `,${country}` : ''}`,
    }, (err1, forecastData) => {
      if (err1) {
        handleError(err1, msg);
        return;
      }
      robot.logger.debug(forecastData);
      msg.send(formatWeather(forecastData));
      getAlerts({
        latitude: forecastData.coord.lat,
        longitude: forecastData.coord.lon,
      }, (err2, alertData) => {
        if (err2) {
          handleError(err2, msg);
          return;
        }
        robot.logger.debug(alertData);
        if (alertData.features.length > 0) {
          msg.send(formatAlerts(alertData));
        }
      });
    });
  });
};
