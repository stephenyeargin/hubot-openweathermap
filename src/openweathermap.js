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

module.exports = (robot) => {
  const baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
  const baseUrlNWS = 'https://api.weather.gov';

  const getForecast = (query, callback) => {
    query.appid = process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;
    robot.http(baseUrl)
      .query(query)
      .get()((err, res, body) => {
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

  const getAlerts = (query, callback) => robot.http(`${baseUrlNWS}/points/${query.latitude},${query.longitude}`)
    .get()((err1, res1, body1) => {
      if (err1) {
        callback(err1);
        return;
      }
      const pointJSON = JSON.parse(body1);
      const countyCode = pointJSON.properties.county.match(/.*\/(\w+)$/)[1];

      robot.http(`${baseUrlNWS}/alerts/active/zone/${countyCode}`)
        .get()((err2, res2, body2) => {
          if (err2) {
            callback(err2);
            return;
          }
          const alerts = JSON.parse(body2);
          robot.logger.debug(alerts);
          callback(err2, alerts);
        });
    });

  const formatAlerts = (json) => {
    const output = [`${json.title}:`];
    json.features.forEach((alert) => {
      output.push(`- ${alert.properties.headline}`);
    });
    return output.join('\n');
  };

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

  const formatWeather = (json) => `Currently ${json.weather[0].main} and ${formatUnits(json.main.temp, 'imperial')}F/${formatUnits(json.main.temp, 'metric')}C in ${json.name}`;

  const handleError = (err, msg) => {
    robot.logger.error(err);
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
  robot.respond(/weather ([\w ]+),(?:\s)?(\w{2})\s?(\w{2,3})?/i, (msg) => {
    if (!process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY) {
      msg.send('No API Key configured.');
      return;
    }

    const cityName = msg.match[1];
    const state = msg.match[2].toUpperCase();
    const country = msg.match[3] ? msg.match[3].toUpperCase() : 'US';
    robot.logger.debug(cityName, state);

    getForecast({
      q: `${cityName},${state},${country}`,
    }, (err1, forecastData) => {
      if (err1) {
        handleError(err1, msg);
        return;
      }

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
};
