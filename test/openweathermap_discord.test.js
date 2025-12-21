/* global describe, context it, beforeEach, afterEach */

const Helper = require('hubot-test-helper');
const chai = require('chai');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper([
  './adapters/discord.js',
  './../src/openweathermap.js',
]);

const { expect } = chai;

/**
 * Test helpers
 */
const mockOneCall = (lat, lon, fixture) => nock('https://api.openweathermap.org')
  .get('/data/3.0/onecall')
  .query({ lat, lon, appid: 'abcdef' })
  .replyWithFile(200, fixture);

const mockGeoDirect = (query, fixture) => nock('https://api.openweathermap.org')
  .get('/geo/1.0/direct')
  .query({ q: query, limit: 1, appid: 'abcdef' })
  .replyWithFile(200, fixture);

const mockGeoReverse = (latitude, longitude, fixture) => nock('https://api.openweathermap.org')
  .get('/geo/1.0/reverse')
  .query({
    lat: latitude, lon: longitude, limit: 1, appid: 'abcdef',
  })
  .replyWithFile(200, fixture);

const mockGeoZip = (zip, fixture) => nock('https://api.openweathermap.org')
  .get('/geo/1.0/zip')
  .query({ zip, appid: 'abcdef' })
  .replyWithFile(200, fixture);

describe('hubot-openweathermap discord', () => {
  let room;

  beforeEach(() => {
    process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
    process.env.HUBOT_DEFAULT_LATITUDE = '36.1798';
    process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7411';
    room = helper.createRoom();
    room.robot.logger = {
      debug: () => {},
      info: () => {},
      warning: () => {},
      error: () => {},
    };
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
      mockGeoReverse(
        '36.1798',
        '-86.7411',
        './test/fixtures/api.openweathermap-org-geo-1.0-reverse-nashville.json',
      );
      mockOneCall(
        '36.1798',
        '-86.7411',
        './test/fixtures/api.openweathermap.org-data-3.0-onecall-37206.json',
      );

      room.user.say('alice', 'hubot weather');
      setTimeout(done, 150);
    });

    it('responds with weather', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather'],
        ['hubot',
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
                      value: 'Rain (broken clouds)',
                    },
                    {
                      inline: true,
                      name: 'Temperature',
                      value: '50F/10C',
                    },
                    {
                      inline: true,
                      name: 'Feels Like',
                      value: '49F/10C',
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
                    url: 'https://openweathermap.org/img/wn/10n@4x.png',
                  },
                  timestamp: '2025-12-19T02:18:53.000Z',
                  title: 'Weather for Nashville-Davidson, Tennessee',
                  url: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1622&lon=-86.7744',
                },
              },
              {
                data: {
                  color: 16711680,
                  description: '```\n* WHAT...Flooding caused by excessive rainfall is expected.\n\n* WHERE...A portion of Middle Tennessee, including the following\ncounties, Cheatham, Davidson, Robertson and Sumner.\n\n* WHEN...Until 1000 PM CST.\n\n* IMPACTS...Minor flooding in low-lying and poor drainage areas.\n\n* ADDITIONAL DETAILS...\n- At 656 PM CST, Doppler radar indicated heavy rain due to\nthunderstorms. Minor flooding is ongoing or expected to begin\nshortly in the advisory area. Between 1 and 2 inches of rain\nhave fallen.\n- Some locations that will experience flooding include...\nGallatin, Springfield, Ashland City, Nashville, Madison,\nHendersonville, Goodlettsville, White House, Millersville,\nGreenbrier, Forest Hills, Oak Hill, Coopertown, Belle Meade,\nLakewood, Ridgetop, Cross Plains, Portland, Joelton and Old\nHickory.\n- http://www.weather.gov/safety/flood\n```',
                  fields: [
                    {
                      inline: true,
                      name: 'Effective',
                      value: 'Dec 18, 2025 6:56 PM CST - Dec 18, 2025 10:00 PM CST',
                    },
                  ],
                  footer: {
                    icon_url: 'https://github.com/openweathermap.png',
                    text: 'NWS Nashville TN',
                  },
                  title: 'Flood Advisory',
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
      mockGeoZip('37206', './test/fixtures/api.openweathermap-org-geo-1.0-zip-37206.json');
      mockOneCall(
        36.1798,
        -86.7411,
        './test/fixtures/api.openweathermap.org-data-3.0-onecall-37206.json',
      );

      room.user.say('alice', 'hubot weather 37206');
      setTimeout(done, 150);
    });

    it('responds with weather', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather 37206'],
        ['hubot',
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
                      value: 'Rain (broken clouds)',
                    },
                    {
                      inline: true,
                      name: 'Temperature',
                      value: '50F/10C',
                    },
                    {
                      inline: true,
                      name: 'Feels Like',
                      value: '49F/10C',
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
                    url: 'https://openweathermap.org/img/wn/10n@4x.png',
                  },
                  timestamp: '2025-12-19T02:18:53.000Z',
                  title: 'Weather for Nashville, US',
                  url: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1622&lon=-86.7744',
                },
              },
              {
                data: {
                  color: 16711680,
                  description: '```\n* WHAT...Flooding caused by excessive rainfall is expected.\n\n* WHERE...A portion of Middle Tennessee, including the following\ncounties, Cheatham, Davidson, Robertson and Sumner.\n\n* WHEN...Until 1000 PM CST.\n\n* IMPACTS...Minor flooding in low-lying and poor drainage areas.\n\n* ADDITIONAL DETAILS...\n- At 656 PM CST, Doppler radar indicated heavy rain due to\nthunderstorms. Minor flooding is ongoing or expected to begin\nshortly in the advisory area. Between 1 and 2 inches of rain\nhave fallen.\n- Some locations that will experience flooding include...\nGallatin, Springfield, Ashland City, Nashville, Madison,\nHendersonville, Goodlettsville, White House, Millersville,\nGreenbrier, Forest Hills, Oak Hill, Coopertown, Belle Meade,\nLakewood, Ridgetop, Cross Plains, Portland, Joelton and Old\nHickory.\n- http://www.weather.gov/safety/flood\n```',
                  fields: [
                    {
                      inline: true,
                      name: 'Effective',
                      value: 'Dec 18, 2025 6:56 PM CST - Dec 18, 2025 10:00 PM CST',
                    },
                  ],
                  footer: {
                    icon_url: 'https://github.com/openweathermap.png',
                    text: 'NWS Nashville TN',
                  },
                  title: 'Flood Advisory',
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
      mockGeoDirect('denver,co,us', './test/fixtures/api.openweathermap-org-geo-1.0-direct-denver.json');
      mockOneCall(
        39.7392364,
        -104.984862,
        './test/fixtures/api.openweathermap.org-data-3.0-onecall-denver.json',
      );

      room.user.say('alice', 'hubot weather denver, CO');
      setTimeout(done, 150);
    });

    it('responds with weather', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather denver, CO'],
        ['hubot', {
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
                    value: '59F/15C',
                  },
                  {
                    inline: true,
                    name: 'Feels Like',
                    value: '56F/13C',
                  },
                  {
                    inline: true,
                    name: 'Humidity',
                    value: '23%',
                  },
                ],
                footer: {
                  icon_url: 'https://github.com/openweathermap.png',
                  text: 'Weather data provided by OpenWeather',
                },
                thumbnail: {
                  url: 'https://openweathermap.org/img/wn/03n@4x.png',
                },
                timestamp: '2025-12-20T04:23:43.000Z',
                title: 'Weather for Denver, Colorado',
                url: 'https://openweathermap.org/weathermap?zoom=12&lat=40.0154&lon=-105.2702',
              },
            },
            {
              data: {
                color: 16711680,
                description: '```\n...RED FLAG WARNING REMAINS IN EFFECT UNTIL MIDNIGHT...\n\nWest west winds of 20-35 mph with gusts as high as 60 mph in wind\nprone areas near the base of the foothills will continue into\nthis evening. They will also be spreading east onto the nearby\nadjacent plains and I-25 Corridor through late evening and\novernight. While the Particularly Dangerous Situation for the\nfoothills of Boulder and northern Jefferson Counties has eased,\nRed Flag conditions will remain in place as we stay in a near\nrecord warm, dry, and windy airmass along the Front Range through\nmidnight. In fact, strong, gusty winds will persist through much\nof the night with only a slow improvement in humidity values.\nThus, near critical Red Flag conditions will occur into early\nSaturday morning.\n\n* AFFECTED AREA...Fire Weather Zone 239.\n\n* TIMING...Until midnight MST tonight.\n\n* WINDS...West 25 to 35 mph with gusts up to 60 mph.\n\n* RELATIVE HUMIDITY...As low as 14 percent.\n\n* IMPACTS...Conditions will be favorable for rapid fire spread.\nAvoid outdoor burning and any activity that may produce a\nspark and start a wildfire.\n```',
                fields: [
                  {
                    inline: true,
                    name: 'Effective',
                    value: 'Dec 19, 2025 8:08 PM MST - Dec 20, 2025 12:00 AM MST',
                  },
                ],
                footer: {
                  icon_url: 'https://github.com/openweathermap.png',
                  text: 'NWS Denver CO',
                },
                title: 'Red Flag Warning',
              },
            },
          ],
        }],
      ]);
    });
  });

  context('get weather for location outside US', () => {
    beforeEach((done) => {
      nock('https://api.openweathermap.org')
        .get('/geo/1.0/direct')
        .query({
          q: 'London, UK',
          limit: 1,
          appid: 'abcdef',
        })
        .reply(200, [{
          name: 'London',
          lat: 51.5072,
          lon: -0.1276,
          country: 'GB',
        }]);
      mockOneCall(
        51.5072,
        -0.1276,
        './test/fixtures/api.openweathermap.org-data-3.0-onecall-denver.json',
      );

      room.user.say('alice', 'hubot weather London, UK');
      setTimeout(done, 150);
    });

    it('responds with weather', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather London, UK'],
        ['hubot', {
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
                    value: '59F/15C',
                  },
                  {
                    inline: true,
                    name: 'Feels Like',
                    value: '56F/13C',
                  },
                  {
                    inline: true,
                    name: 'Humidity',
                    value: '23%',
                  },
                ],
                footer: {
                  icon_url: 'https://github.com/openweathermap.png',
                  text: 'Weather data provided by OpenWeather',
                },
                thumbnail: {
                  url: 'https://openweathermap.org/img/wn/03n@4x.png',
                },
                timestamp: '2025-12-20T04:23:43.000Z',
                title: 'Weather for London, GB',
                url: 'https://openweathermap.org/weathermap?zoom=12&lat=40.0154&lon=-105.2702',
              },
            },
            {
              data: {
                color: 16711680,
                description: '```\n...RED FLAG WARNING REMAINS IN EFFECT UNTIL MIDNIGHT...\n\nWest west winds of 20-35 mph with gusts as high as 60 mph in wind\nprone areas near the base of the foothills will continue into\nthis evening. They will also be spreading east onto the nearby\nadjacent plains and I-25 Corridor through late evening and\novernight. While the Particularly Dangerous Situation for the\nfoothills of Boulder and northern Jefferson Counties has eased,\nRed Flag conditions will remain in place as we stay in a near\nrecord warm, dry, and windy airmass along the Front Range through\nmidnight. In fact, strong, gusty winds will persist through much\nof the night with only a slow improvement in humidity values.\nThus, near critical Red Flag conditions will occur into early\nSaturday morning.\n\n* AFFECTED AREA...Fire Weather Zone 239.\n\n* TIMING...Until midnight MST tonight.\n\n* WINDS...West 25 to 35 mph with gusts up to 60 mph.\n\n* RELATIVE HUMIDITY...As low as 14 percent.\n\n* IMPACTS...Conditions will be favorable for rapid fire spread.\nAvoid outdoor burning and any activity that may produce a\nspark and start a wildfire.\n```',
                fields: [
                  {
                    inline: true,
                    name: 'Effective',
                    value: 'Dec 19, 2025 8:08 PM MST - Dec 20, 2025 12:00 AM MST',
                  },
                ],
                footer: {
                  icon_url: 'https://github.com/openweathermap.png',
                  text: 'NWS Denver CO',
                },
                title: 'Red Flag Warning',
              },
            },
          ],
        }],
      ]);
    });
  });

  context('friendly message when location not found', () => {
    beforeEach((done) => {
      nock('https://api.openweathermap.org')
        .get('/geo/1.0/direct')
        .query({ q: 'nowhere, ZZ', limit: 1, appid: 'abcdef' })
        .reply(200, []);

      room.user.say('alice', 'hubot weather nowhere, ZZ');
      setTimeout(done, 150);
    });

    it('responds with friendly error', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather nowhere, ZZ'],
        ['hubot', 'Sorry, I couldn’t find that location.'],
      ]);
    });
  });

  context('handle One Call API error', () => {
    beforeEach((done) => {
      mockGeoDirect('server, ERROR', './test/fixtures/api.openweathermap-org-geo-1.0-direct-denver.json');

      nock('https://api.openweathermap.org')
        .get('/data/3.0/onecall')
        .query({ lat: 39.7392364, lon: -104.984862, appid: 'abcdef' })
        .replyWithError(new Error('Mock internal service error'));

      room.user.say('alice', 'hubot weather server, ERROR');
      setTimeout(done, 150);
    });

    it('responds with generic error', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather server, ERROR'],
        ['hubot', 'Sorry, I couldn’t retrieve weather data for that location.'],
      ]);
    });
  });
});

describe('hubot-openweathermap no API key', () => {
  let room;

  beforeEach(() => {
    room = helper.createRoom();
    room.robot.logger = {
      debug: () => {},
      info: () => {},
      warning: () => {},
      error: () => {},
    };
    nock.disableNetConnect();
  });

  afterEach(() => {
    room.destroy();
    nock.cleanAll();
  });

  it('responds with missing API key message', (done) => {
    room.user.say('alice', 'hubot weather');
    setTimeout(() => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather'],
        ['hubot', 'No API Key configured.'],
      ]);
      done();
    }, 100);
  });
});

describe('hubot-openweathermap no default location', () => {
  let room;

  beforeEach(() => {
    process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
    room = helper.createRoom();
    room.robot.logger = {
      debug: () => {},
      info: () => {},
      warning: () => {},
      error: () => {},
    };
    nock.disableNetConnect();
  });

  afterEach(() => {
    room.destroy();
    nock.cleanAll();
    delete process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;
  });

  it('responds with missing default location message', (done) => {
    room.user.say('alice', 'hubot weather');
    setTimeout(() => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather'],
        ['hubot', 'No default location set.'],
      ]);
      done();
    }, 100);
  });
});
