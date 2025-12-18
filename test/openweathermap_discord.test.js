/* global describe, context it, beforeEach, afterEach */

const Helper = require('hubot-test-helper');
const chai = require('chai');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper([
  './adapters/discord.js',
  './../src/openweathermap.js',
]);
const helperLegacy = new Helper([
  './adapters/discord-legacy.js',
  './../src/openweathermap.js',
]);

const { expect } = chai;

describe('hubot-openweathermap discord', () => {
  let room = null;

  beforeEach(() => {
    process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
    process.env.HUBOT_DEFAULT_LATITUDE = '36.1798';
    process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7411';
    room = helper.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    room.destroy();
    nock.cleanAll();
    delete process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;
    delete process.env.HUBOT_DEFAULT_LATITUDE;
    delete process.env.HUBOT_DEFAULT_LONGITUDE;
  });

  context('get weather for configured coordinates', () => {
    beforeEach((done) => {
      nock('https://api.openweathermap.org')
        .get('/data/2.5/weather')
        .query({ lat: '36.1798', lon: '-86.7411', appid: 'abcdef' })
        .replyWithFile(200, './test/fixtures/api.openweathermap.org-data-2.5-weather-37206.json');
      nock('https://api.weather.gov')
        .get('/points/36.1798,-86.7411')
        .replyWithFile(200, './test/fixtures/weather.gov-points-36.1798--86.7411.geojson');
      nock('https://api.weather.gov')
        .get('/alerts/active/zone/TNC037')
        .replyWithFile(200, './test/fixtures/weather.gov-alerts-active-zone-TNC037-none.geojson');

      room.user.say('alice', 'hubot weather');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather'],
        [
          'hubot',
          {
            embeds: [{
              data: {
                title: 'Weather in Nashville',
                url: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1798&lon=-86.7411',
                author: {
                  name: 'OpenWeather',
                  url: 'https://openweathermap.org/',
                  icon_url: 'https://github.com/openweathermap.png',
                },
                fields: [
                  {
                    name: 'Conditions',
                    value: 'Clouds (broken clouds)',
                    inline: true,
                  },
                  {
                    name: 'Temperature',
                    value: '50F/10C',
                    inline: true,
                  },
                  {
                    name: 'Feels Like',
                    value: '48F/9C',
                    inline: true,
                  },
                  {
                    name: 'Humidity',
                    value: '77%',
                    inline: true,
                  },
                ],
                thumbnail: {
                  url: 'https://openweathermap.org/img/wn/04d@4x.png',
                },
                color: 15429195,
                footer: {
                  text: 'Weather data provided by OpenWeather',
                  icon_url: 'https://github.com/openweathermap.png',
                },
                timestamp: '2023-12-26T17:28:39.000Z',
              },
            }],
          },
        ],
      ]);
    });
  });

  context('get weather for configured coordinates with active alerts', () => {
    beforeEach((done) => {
      nock('https://api.openweathermap.org')
        .get('/data/2.5/weather')
        .query({ lat: '36.1798', lon: '-86.7411', appid: 'abcdef' })
        .replyWithFile(200, './test/fixtures/api.openweathermap.org-data-2.5-weather-37206.json');
      nock('https://api.weather.gov')
        .get('/points/36.1798,-86.7411')
        .replyWithFile(200, './test/fixtures/weather.gov-points-36.1798--86.7411.geojson');
      nock('https://api.weather.gov')
        .get('/alerts/active/zone/TNC037')
        .replyWithFile(200, './test/fixtures/weather.gov-alerts-active-zone-TNC037-tornadoes.geojson');

      room.user.say('alice', 'hubot weather');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather'],
        [
          'hubot',
          {
            embeds: [
              {
                data: {
                  author: {
                    icon_url: 'https://github.com/openweathermap.png',
                    name: 'OpenWeather',
                    url: 'https://openweathermap.org/',
                  },
                  color: 15429195,
                  fields: [
                    {
                      inline: true,
                      name: 'Conditions',
                      value: 'Clouds (broken clouds)',
                    },
                    {
                      inline: true,
                      name: 'Temperature',
                      value: '50F/10C',
                    },
                    {
                      inline: true,
                      name: 'Feels Like',
                      value: '48F/9C',
                    },
                    {
                      inline: true,
                      name: 'Humidity',
                      value: '77%',
                    },
                  ],
                  footer: {
                    icon_url: 'https://github.com/openweathermap.png',
                    text: 'Weather data provided by OpenWeather',
                  },
                  thumbnail: {
                    url: 'https://openweathermap.org/img/wn/04d@4x.png',
                  },
                  timestamp: '2023-12-26T17:28:39.000Z',
                  title: 'Weather in Nashville',
                  url: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1798&lon=-86.7411',
                },
              },
            ],
          },
        ],
        [
          'hubot',
          {
            embeds: [
              {
                data: {
                  author: {
                    icon_url: 'https://github.com/NOAAGov.png',
                    name: 'Weather.gov',
                    url: 'https://weather.gov/',
                  },
                  color: 5697536,
                  description: '```\n* WHAT...Flooding caused by excessive rainfall is expected.\n\n* WHERE...A portion of Middle Tennessee, including the following\ncounties, Cheatham, Davidson, Macon, Robertson, Sumner and\nTrousdale.\n\n* WHEN...Until 900 PM CST.\n\n* IMPACTS...Minor flooding in low-lying and poor drainage areas.\n\n* ADDITIONAL DETAILS...\n- At 548 PM CST, Doppler radar indicated heavy rain due to\nthunderstorms. Minor flooding is ongoing or expected to begin\nshortly in the advisory area. Between 1 and 2 inches of rain\nhave fallen.\n- Some locations that will experience flooding include...\nGallatin, Ashland City, Lafayette, Madison, Hendersonville,\nGoodlettsville, White House, Millersville, Greenbrier,\nWestmoreland, Ridgetop, Old Hickory, Joelton, Cottontown,\nBledsoe Creek State Park, Whites Creek, Bethpage, Beaman Park\nand Bells Bend.\n- http://www.weather.gov/safety/flood\n```',
                  fields: [
                    {
                      inline: true,
                      name: 'Severity',
                      value: 'Minor',
                    },
                    {
                      inline: true,
                      name: 'Certainty',
                      value: 'Likely',
                    },
                    {
                      inline: false,
                      name: 'Areas Affected',
                      value: 'Cheatham, TN; Davidson, TN; Macon, TN; Robertson, TN; Sumner, TN; Trousdale, TN',
                    },
                    {
                      inline: false,
                      name: 'Instructions / Response',
                      value: "Turn around, don't drown when encountering flooded roads. Most flood\ndeaths occur in vehicles.",
                    },
                  ],
                  footer: {
                    icon_url: 'https://github.com/NOAAGov.png',
                    text: 'Alerts provided by the National Weather Service',
                  },
                  timestamp: '2023-12-09T23:48:00.000Z',
                  title: 'Flood Advisory issued December 9 at 5:48PM CST until December 9 at 9:00PM CST by NWS Nashville TN',
                },
              },
              {
                data: {
                  author: {
                    icon_url: 'https://github.com/NOAAGov.png',
                    name: 'Weather.gov',
                    url: 'https://weather.gov/',
                  },
                  color: 16726072,
                  description: '```\nTORNADO WATCH 714 REMAINS VALID UNTIL 7 PM CST THIS EVENING FOR\nTHE FOLLOWING AREAS\n\nIN TENNESSEE THIS WATCH INCLUDES 14 COUNTIES\n\nIN MIDDLE TENNESSEE\n\nDAVIDSON              HICKMAN               LAWRENCE\nLEWIS                 MACON                 MAURY\nPERRY                 RUTHERFORD            SMITH\nSUMNER                TROUSDALE             WAYNE\nWILLIAMSON            WILSON\n\nTHIS INCLUDES THE CITIES OF BRENTWOOD, CARTHAGE, CENTERVILLE,\nCLIFTON, COLLINWOOD, COLUMBIA, FRANKLIN, GALLATIN,\nGOODLETTSVILLE, GORDONSVILLE, HARTSVILLE, HENDERSONVILLE,\nHOHENWALD, LA VERGNE, LAFAYETTE, LAWRENCEBURG, LEBANON, LINDEN,\nLOBELVILLE, MOUNT JULIET, MURFREESBORO, NASHVILLE, SMYRNA,\nSOUTH CARTHAGE, AND WAYNESBORO.\n```',
                  fields: [
                    {
                      inline: true,
                      name: 'Severity',
                      value: 'Extreme',
                    },
                    {
                      inline: true,
                      name: 'Certainty',
                      value: 'Possible',
                    },
                    {
                      inline: false,
                      name: 'Areas Affected',
                      value: 'Davidson, TN; Hickman, TN; Lawrence, TN; Lewis, TN; Macon, TN; Maury, TN; Perry, TN; Rutherford, TN; Smith, TN; Sumner, TN; Trousdale, TN; Wayne, TN; Williamson, TN; Wilson, TN',
                    },
                    {
                      inline: false,
                      name: 'Instructions / Response',
                      value: 'Monitor',
                    },
                  ],
                  footer: {
                    icon_url: 'https://github.com/NOAAGov.png',
                    text: 'Alerts provided by the National Weather Service',
                  },
                  timestamp: '2023-12-09T23:38:00.000Z',
                  title: 'Tornado Watch issued December 9 at 5:38PM CST until December 9 at 7:00PM CST by NWS Nashville TN',
                },
              },
            ],
          },
        ],
      ]);
    });
  });

  context('get weather for a zip code', () => {
    beforeEach((done) => {
      nock('https://api.openweathermap.org')
        .get('/data/2.5/weather')
        .query({ zip: 37206, appid: 'abcdef' })
        .replyWithFile(200, './test/fixtures/api.openweathermap.org-data-2.5-weather-37206.json');
      nock('https://api.weather.gov')
        .get('/points/36.1798,-86.7411')
        .replyWithFile(200, './test/fixtures/weather.gov-points-36.1798--86.7411.geojson');
      nock('https://api.weather.gov')
        .get('/alerts/active/zone/TNC037')
        .replyWithFile(200, './test/fixtures/weather.gov-alerts-active-zone-TNC037-none.geojson');

      room.user.say('alice', 'hubot weather 37206');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather 37206'],
        [
          'hubot',
          {
            embeds: [
              {
                data: {
                  author: {
                    icon_url: 'https://github.com/openweathermap.png',
                    name: 'OpenWeather',
                    url: 'https://openweathermap.org/',
                  },
                  color: 15429195,
                  fields: [
                    {
                      inline: true,
                      name: 'Conditions',
                      value: 'Clouds (broken clouds)',
                    },
                    {
                      inline: true,
                      name: 'Temperature',
                      value: '50F/10C',
                    },
                    {
                      inline: true,
                      name: 'Feels Like',
                      value: '48F/9C',
                    },
                    {
                      inline: true,
                      name: 'Humidity',
                      value: '77%',
                    },
                  ],
                  footer: {
                    icon_url: 'https://github.com/openweathermap.png',
                    text: 'Weather data provided by OpenWeather',
                  },
                  thumbnail: {
                    url: 'https://openweathermap.org/img/wn/04d@4x.png',
                  },
                  timestamp: '2023-12-26T17:28:39.000Z',
                  title: 'Weather in Nashville',
                  url: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1798&lon=-86.7411',
                },
              },
            ],
          },
        ],
      ]);
    });
  });

  context('get weather for a city', () => {
    beforeEach((done) => {
      nock('https://api.openweathermap.org')
          .get('/data/2.5/weather')
          .query({ q: 'seattle,WA,US', appid: 'abcdef' })
        .replyWithFile(200, './test/fixtures/api.openweathermap.org-data-2.5-weather-seattle.json');
      nock('https://api.weather.gov')
        .get('/points/47.6038,-122.3301')
        .replyWithFile(200, './test/fixtures/weather.gov-points-47.6038--122.3301.geojson');
      nock('https://api.weather.gov')
        .get('/alerts/active/zone/WAC033')
        .replyWithFile(200, './test/fixtures/weather.gov-alerts-active-zone-WAC033-wind.geojson');

      room.user.say('alice', 'hubot weather seattle, WA');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather seattle, WA'],
        [
          'hubot',
          {
            embeds: [
              {
                data: {
                  author: {
                    icon_url: 'https://github.com/openweathermap.png',
                    name: 'OpenWeather',
                    url: 'https://openweathermap.org/',
                  },
                  color: 15429195,
                  fields: [
                    {
                      inline: true,
                      name: 'Conditions',
                      value: 'Clouds (scattered clouds)',
                    },
                    {
                      inline: true,
                      name: 'Temperature',
                      value: '47F/8C',
                    },
                    {
                      inline: true,
                      name: 'Feels Like',
                      value: '45F/7C',
                    },
                    {
                      inline: true,
                      name: 'Humidity',
                      value: '90%',
                    },
                  ],
                  footer: {
                    icon_url: 'https://github.com/openweathermap.png',
                    text: 'Weather data provided by OpenWeather',
                  },
                  thumbnail: {
                    url: 'https://openweathermap.org/img/wn/03d@4x.png',
                  },
                  timestamp: '2023-12-26T18:56:40.000Z',
                  title: 'Weather in Seattle',
                  url: 'https://openweathermap.org/weathermap?zoom=12&lat=47.6038&lon=-122.3301',
                },
              },
            ],
          },
        ],
        [
          'hubot',
          {
            embeds: [
              {
                data: {
                  author: {
                    icon_url: 'https://github.com/NOAAGov.png',
                    name: 'Weather.gov',
                    url: 'https://weather.gov/',
                  },
                  color: 16574522,
                  description: '```\n* WHAT...East winds 20 to 35 mph with gusts 45 to 55 mph near gaps\nin the terrain.\n\n* WHERE...East Puget Sound Lowlands.\n\n* WHEN...From 6 PM this evening to 1 PM PST Wednesday.\n\n* IMPACTS...Gusty winds could blow around unsecured objects.\nTree limbs could be blown down and a few power outages may\nresult.\n```',
                  fields: [
                    {
                      inline: true,
                      name: 'Severity',
                      value: 'Moderate',
                    },
                    {
                      inline: true,
                      name: 'Certainty',
                      value: 'Likely',
                    },
                    {
                      inline: false,
                      name: 'Areas Affected',
                      value: 'East Puget Sound Lowlands',
                    },
                    {
                      inline: false,
                      name: 'Instructions / Response',
                      value: 'Use extra caution when driving, especially if operating a high\nprofile vehicle. Secure outdoor objects.',
                    },
                  ],
                  footer: {
                    icon_url: 'https://github.com/NOAAGov.png',
                    text: 'Alerts provided by the National Weather Service',
                  },
                  timestamp: '2023-12-26T11:52:00.000Z',
                  title: 'Wind Advisory issued December 26 at 3:52AM PST until December 27 at 1:00PM PST by NWS Seattle WA',
                },
              },
            ],
          },
        ],
      ]);
    });
  });
});

describe('hubot-openweathermap discord legacy', () => {
  let room = null;

  beforeEach(() => {
    process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
    process.env.HUBOT_DEFAULT_LATITUDE = '36.1798';
    process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7411';
    room = helperLegacy.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    room.destroy();
    nock.cleanAll();
    delete process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;
    delete process.env.HUBOT_DEFAULT_LATITUDE;
    delete process.env.HUBOT_DEFAULT_LONGITUDE;
  });
  context('return plaintext response if Hubot version is < 11', () => {
    beforeEach((done) => {
      nock('https://api.openweathermap.org')
        .get('/data/2.5/weather')
        .query({ q: 'seattle,WA,US', appid: 'abcdef' })
        .replyWithFile(200, './test/fixtures/api.openweathermap.org-data-2.5-weather-seattle.json');
      nock('https://api.weather.gov')
        .get('/points/47.6038,-122.3301')
        .replyWithFile(200, './test/fixtures/weather.gov-points-47.6038--122.3301.geojson');
      nock('https://api.weather.gov')
        .get('/alerts/active/zone/WAC033')
        .replyWithFile(200, './test/fixtures/weather.gov-alerts-active-zone-WAC033-wind.geojson');

      room.user.say('alice', 'hubot weather seattle, wa');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather seattle, wa'],
        ['hubot', 'Currently scattered clouds and 47F/8C in Seattle'],
        [
          'hubot',
          'Current watches, warnings, and advisories for King County (WAC033) WA:\n'
          + 'See https://weather.gov for details.\n'
          + '- Wind Advisory issued December 26 at 3:52AM PST until December 27 at 1:00PM PST by NWS Seattle WA',
        ],
      ]);
    });
  });
});
