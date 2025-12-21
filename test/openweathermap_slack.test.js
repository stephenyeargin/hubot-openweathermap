/* global describe, context it, beforeEach, afterEach */

const Helper = require('hubot-test-helper');
const chai = require('chai');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper([
  './adapters/slack.js',
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

describe('hubot-openweathermap slack', () => {
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
        ['hubot', {
          attachments: [
            {
              author_icon: 'https://github.com/openweathermap.png',
              author_link: 'https://openweathermap.org/',
              author_name: 'OpenWeather',
              color: '#eb6e4b',
              fallback: 'Currently broken clouds and 50F/10C in Nashville-Davidson, Tennessee',
              fields: [
                {
                  short: true,
                  title: 'Conditions',
                  value: 'Rain (broken clouds)',
                },
                {
                  short: true,
                  title: 'Temperature',
                  value: '50F/10C',
                },
                {
                  short: true,
                  title: 'Feels Like',
                  value: '49F/10C',
                },
                {
                  short: true,
                  title: 'Humidity',
                  value: '90%',
                },
              ],
              footer: 'Weather data provided by OpenWeather',
              thumb_url: 'https://openweathermap.org/img/wn/10n@4x.png',
              title: 'Weather for Nashville-Davidson, Tennessee',
              title_link: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1622&lon=-86.7744',
              ts: 1766110733,
            },
            {
              author_icon: 'https://a.slack-edge.com/production-standard-emoji-assets/14.0/apple-small/26a0-fe0f.png',
              author_name: 'NWS Nashville TN',
              color: '#FF0000',
              fallback: 'Flood Advisory: * WHAT...Flooding caused by excessive rainfall is expected.\n\n* WHERE...A portion of Middle Tennessee, including the following\ncounties, Cheatham, Davidson, Robertson and Sumner.\n\n* WHEN...Until 1000 PM CST.\n\n* IMPACTS...Minor flooding in low-lying and poor drainage areas.\n\n* ADDITIONAL DETAILS...\n- At 656 PM CST, Doppler radar indicated heavy rain due to\nthunderstorms. Minor flooding is ongoing or expected to begin\nshortly in the advisory area. Between 1 and 2 inches of rain\nhave fallen.\n- Some locations that will experience flooding include...\nGallatin, Springfield, Ashland City, Nashville, Madison,\nHendersonville, Goodlettsville, White House, Millersville,\nGreenbrier, Forest Hills, Oak Hill, Coopertown, Belle Meade,\nLakewood, Ridgetop, Cross Plains, Portland, Joelton and Old\nHickory.\n- http://www.weather.gov/safety/flood',
              fields: [
                {
                  title: 'Effective',
                  value: 'Dec 18, 2025 6:56 PM CST - Dec 18, 2025 10:00 PM CST',
                },
                {
                  title: 'Tags',
                  value: 'Flood',
                },
              ],
              text: '```\n* WHAT...Flooding caused by excessive rainfall is expected.\n\n* WHERE...A portion of Middle Tennessee, including the following\ncounties, Cheatham, Davidson, Robertson and Sumner.\n\n* WHEN...Until 1000 PM CST.\n\n* IMPACTS...Minor flooding in low-lying and poor drainage areas.\n\n* ADDITIONAL DETAILS...\n- At 656 PM CST, Doppler radar indicated heavy rain due to\nthunderstorms. Minor flooding is ongoing or expected to begin\nshortly in the advisory area. Between 1 and 2 inches of rain\nhave fallen.\n- Some locations that will experience flooding include...\nGallatin, Springfield, Ashland City, Nashville, Madison,\nHendersonville, Goodlettsville, White House, Millersville,\nGreenbrier, Forest Hills, Oak Hill, Coopertown, Belle Meade,\nLakewood, Ridgetop, Cross Plains, Portland, Joelton and Old\nHickory.\n- http://www.weather.gov/safety/flood\n```',
              title: 'Flood Advisory',
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
        ['hubot', {
          attachments: [
            {
              author_icon: 'https://github.com/openweathermap.png',
              author_link: 'https://openweathermap.org/',
              author_name: 'OpenWeather',
              color: '#eb6e4b',
              fallback: 'Currently broken clouds and 50F/10C in Nashville, US',
              fields: [
                {
                  short: true,
                  title: 'Conditions',
                  value: 'Rain (broken clouds)',
                },
                {
                  short: true,
                  title: 'Temperature',
                  value: '50F/10C',
                },
                {
                  short: true,
                  title: 'Feels Like',
                  value: '49F/10C',
                },
                {
                  short: true,
                  title: 'Humidity',
                  value: '90%',
                },
              ],
              footer: 'Weather data provided by OpenWeather',
              thumb_url: 'https://openweathermap.org/img/wn/10n@4x.png',
              title: 'Weather for Nashville, US',
              title_link: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1622&lon=-86.7744',
              ts: 1766110733,
            },
            {
              author_icon: 'https://a.slack-edge.com/production-standard-emoji-assets/14.0/apple-small/26a0-fe0f.png',
              author_name: 'NWS Nashville TN',
              color: '#FF0000',
              fallback: 'Flood Advisory: * WHAT...Flooding caused by excessive rainfall is expected.\n\n* WHERE...A portion of Middle Tennessee, including the following\ncounties, Cheatham, Davidson, Robertson and Sumner.\n\n* WHEN...Until 1000 PM CST.\n\n* IMPACTS...Minor flooding in low-lying and poor drainage areas.\n\n* ADDITIONAL DETAILS...\n- At 656 PM CST, Doppler radar indicated heavy rain due to\nthunderstorms. Minor flooding is ongoing or expected to begin\nshortly in the advisory area. Between 1 and 2 inches of rain\nhave fallen.\n- Some locations that will experience flooding include...\nGallatin, Springfield, Ashland City, Nashville, Madison,\nHendersonville, Goodlettsville, White House, Millersville,\nGreenbrier, Forest Hills, Oak Hill, Coopertown, Belle Meade,\nLakewood, Ridgetop, Cross Plains, Portland, Joelton and Old\nHickory.\n- http://www.weather.gov/safety/flood',
              fields: [
                {
                  title: 'Effective',
                  value: 'Dec 18, 2025 6:56 PM CST - Dec 18, 2025 10:00 PM CST',
                },
                {
                  title: 'Tags',
                  value: 'Flood',
                },
              ],
              text: '```\n* WHAT...Flooding caused by excessive rainfall is expected.\n\n* WHERE...A portion of Middle Tennessee, including the following\ncounties, Cheatham, Davidson, Robertson and Sumner.\n\n* WHEN...Until 1000 PM CST.\n\n* IMPACTS...Minor flooding in low-lying and poor drainage areas.\n\n* ADDITIONAL DETAILS...\n- At 656 PM CST, Doppler radar indicated heavy rain due to\nthunderstorms. Minor flooding is ongoing or expected to begin\nshortly in the advisory area. Between 1 and 2 inches of rain\nhave fallen.\n- Some locations that will experience flooding include...\nGallatin, Springfield, Ashland City, Nashville, Madison,\nHendersonville, Goodlettsville, White House, Millersville,\nGreenbrier, Forest Hills, Oak Hill, Coopertown, Belle Meade,\nLakewood, Ridgetop, Cross Plains, Portland, Joelton and Old\nHickory.\n- http://www.weather.gov/safety/flood\n```',
              title: 'Flood Advisory',
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
          attachments: [
            {
              author_icon: 'https://github.com/openweathermap.png',
              author_link: 'https://openweathermap.org/',
              author_name: 'OpenWeather',
              color: '#eb6e4b',
              fallback: 'Currently scattered clouds and 59F/15C in Denver, Colorado',
              fields: [
                {
                  short: true,
                  title: 'Conditions',
                  value: 'Clouds (scattered clouds)',
                },
                {
                  short: true,
                  title: 'Temperature',
                  value: '59F/15C',
                },
                {
                  short: true,
                  title: 'Feels Like',
                  value: '56F/13C',
                },
                {
                  short: true,
                  title: 'Humidity',
                  value: '23%',
                },
              ],
              footer: 'Weather data provided by OpenWeather',
              thumb_url: 'https://openweathermap.org/img/wn/03n@4x.png',
              title: 'Weather for Denver, Colorado',
              title_link: 'https://openweathermap.org/weathermap?zoom=12&lat=40.0154&lon=-105.2702',
              ts: 1766204623,
            },
            {
              author_icon: 'https://a.slack-edge.com/production-standard-emoji-assets/14.0/apple-small/26a0-fe0f.png',
              author_name: 'NWS Denver CO',
              color: '#FF0000',
              fallback: 'Red Flag Warning: ...RED FLAG WARNING REMAINS IN EFFECT UNTIL MIDNIGHT...\n\nWest west winds of 20-35 mph with gusts as high as 60 mph in wind\nprone areas near the base of the foothills will continue into\nthis evening. They will also be spreading east onto the nearby\nadjacent plains and I-25 Corridor through late evening and\novernight. While the Particularly Dangerous Situation for the\nfoothills of Boulder and northern Jefferson Counties has eased,\nRed Flag conditions will remain in place as we stay in a near\nrecord warm, dry, and windy airmass along the Front Range through\nmidnight. In fact, strong, gusty winds will persist through much\nof the night with only a slow improvement in humidity values.\nThus, near critical Red Flag conditions will occur into early\nSaturday morning.\n\n* AFFECTED AREA...Fire Weather Zone 239.\n\n* TIMING...Until midnight MST tonight.\n\n* WINDS...West 25 to 35 mph with gusts up to 60 mph.\n\n* RELATIVE HUMIDITY...As low as 14 percent.\n\n* IMPACTS...Conditions will be favorable for rapid fire spread.\nAvoid outdoor burning and any activity that may produce a\nspark and start a wildfire.',
              fields: [
                {
                  title: 'Effective',
                  value: 'Dec 19, 2025 8:08 PM MST - Dec 20, 2025 12:00 AM MST',
                },
                {
                  title: 'Tags',
                  value: 'Other dangers',
                },
              ],
              text: '```\n...RED FLAG WARNING REMAINS IN EFFECT UNTIL MIDNIGHT...\n\nWest west winds of 20-35 mph with gusts as high as 60 mph in wind\nprone areas near the base of the foothills will continue into\nthis evening. They will also be spreading east onto the nearby\nadjacent plains and I-25 Corridor through late evening and\novernight. While the Particularly Dangerous Situation for the\nfoothills of Boulder and northern Jefferson Counties has eased,\nRed Flag conditions will remain in place as we stay in a near\nrecord warm, dry, and windy airmass along the Front Range through\nmidnight. In fact, strong, gusty winds will persist through much\nof the night with only a slow improvement in humidity values.\nThus, near critical Red Flag conditions will occur into early\nSaturday morning.\n\n* AFFECTED AREA...Fire Weather Zone 239.\n\n* TIMING...Until midnight MST tonight.\n\n* WINDS...West 25 to 35 mph with gusts up to 60 mph.\n\n* RELATIVE HUMIDITY...As low as 14 percent.\n\n* IMPACTS...Conditions will be favorable for rapid fire spread.\nAvoid outdoor burning and any activity that may produce a\nspark and start a wildfire.\n```',
              title: 'Red Flag Warning',
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
          attachments: [
            {
              author_icon: 'https://github.com/openweathermap.png',
              author_link: 'https://openweathermap.org/',
              author_name: 'OpenWeather',
              color: '#eb6e4b',
              fallback: 'Currently scattered clouds and 59F/15C in London, GB',
              fields: [
                {
                  short: true,
                  title: 'Conditions',
                  value: 'Clouds (scattered clouds)',
                },
                {
                  short: true,
                  title: 'Temperature',
                  value: '59F/15C',
                },
                {
                  short: true,
                  title: 'Feels Like',
                  value: '56F/13C',
                },
                {
                  short: true,
                  title: 'Humidity',
                  value: '23%',
                },
              ],
              footer: 'Weather data provided by OpenWeather',
              thumb_url: 'https://openweathermap.org/img/wn/03n@4x.png',
              title: 'Weather for London, GB',
              title_link: 'https://openweathermap.org/weathermap?zoom=12&lat=40.0154&lon=-105.2702',
              ts: 1766204623,
            },
            {
              author_icon: 'https://a.slack-edge.com/production-standard-emoji-assets/14.0/apple-small/26a0-fe0f.png',
              author_name: 'NWS Denver CO',
              color: '#FF0000',
              fallback: 'Red Flag Warning: ...RED FLAG WARNING REMAINS IN EFFECT UNTIL MIDNIGHT...\n\nWest west winds of 20-35 mph with gusts as high as 60 mph in wind\nprone areas near the base of the foothills will continue into\nthis evening. They will also be spreading east onto the nearby\nadjacent plains and I-25 Corridor through late evening and\novernight. While the Particularly Dangerous Situation for the\nfoothills of Boulder and northern Jefferson Counties has eased,\nRed Flag conditions will remain in place as we stay in a near\nrecord warm, dry, and windy airmass along the Front Range through\nmidnight. In fact, strong, gusty winds will persist through much\nof the night with only a slow improvement in humidity values.\nThus, near critical Red Flag conditions will occur into early\nSaturday morning.\n\n* AFFECTED AREA...Fire Weather Zone 239.\n\n* TIMING...Until midnight MST tonight.\n\n* WINDS...West 25 to 35 mph with gusts up to 60 mph.\n\n* RELATIVE HUMIDITY...As low as 14 percent.\n\n* IMPACTS...Conditions will be favorable for rapid fire spread.\nAvoid outdoor burning and any activity that may produce a\nspark and start a wildfire.',
              fields: [
                {
                  title: 'Effective',
                  value: 'Dec 19, 2025 8:08 PM MST - Dec 20, 2025 12:00 AM MST',
                },
                {
                  title: 'Tags',
                  value: 'Other dangers',
                },
              ],
              text: '```\n...RED FLAG WARNING REMAINS IN EFFECT UNTIL MIDNIGHT...\n\nWest west winds of 20-35 mph with gusts as high as 60 mph in wind\nprone areas near the base of the foothills will continue into\nthis evening. They will also be spreading east onto the nearby\nadjacent plains and I-25 Corridor through late evening and\novernight. While the Particularly Dangerous Situation for the\nfoothills of Boulder and northern Jefferson Counties has eased,\nRed Flag conditions will remain in place as we stay in a near\nrecord warm, dry, and windy airmass along the Front Range through\nmidnight. In fact, strong, gusty winds will persist through much\nof the night with only a slow improvement in humidity values.\nThus, near critical Red Flag conditions will occur into early\nSaturday morning.\n\n* AFFECTED AREA...Fire Weather Zone 239.\n\n* TIMING...Until midnight MST tonight.\n\n* WINDS...West 25 to 35 mph with gusts up to 60 mph.\n\n* RELATIVE HUMIDITY...As low as 14 percent.\n\n* IMPACTS...Conditions will be favorable for rapid fire spread.\nAvoid outdoor burning and any activity that may produce a\nspark and start a wildfire.\n```',
              title: 'Red Flag Warning',
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
