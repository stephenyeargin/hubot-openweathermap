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

describe('hubot-openweathermap slack', () => {
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
            attachments: [
              {
                author_icon: 'https://github.com/openweathermap.png',
                author_link: 'https://openweathermap.org/',
                author_name: 'OpenWeather',
                color: '#eb6e4b',
                fallback: 'Currently broken clouds and 50F/10C in Nashville',
                fields: [
                  {
                    short: true,
                    title: 'Conditions',
                    value: 'Clouds (broken clouds)',
                  },
                  {
                    short: true,
                    title: 'Temperature',
                    value: '50F/10C',
                  },
                  {
                    short: true,
                    title: 'Feels Like',
                    value: '48F/9C',
                  },
                  {
                    short: true,
                    title: 'Humidity',
                    value: '77%',
                  },
                ],
                footer: 'Weather data provided by OpenWeather',
                thumb_url: 'https://openweathermap.org/img/wn/04d@4x.png',
                title: 'Weather in Nashville',
                title_link: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1798&lon=-86.7411',
                ts: 1703611719,
              },
            ],
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
            attachments: [
              {
                author_icon: 'https://github.com/openweathermap.png',
                author_link: 'https://openweathermap.org/',
                author_name: 'OpenWeather',
                color: '#eb6e4b',
                fallback: 'Currently broken clouds and 50F/10C in Nashville',
                fields: [
                  {
                    short: true,
                    title: 'Conditions',
                    value: 'Clouds (broken clouds)',
                  },
                  {
                    short: true,
                    title: 'Temperature',
                    value: '50F/10C',
                  },
                  {
                    short: true,
                    title: 'Feels Like',
                    value: '48F/9C',
                  },
                  {
                    short: true,
                    title: 'Humidity',
                    value: '77%',
                  },
                ],
                footer: 'Weather data provided by OpenWeather',
                thumb_url: 'https://openweathermap.org/img/wn/04d@4x.png',
                title: 'Weather in Nashville',
                title_link: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1798&lon=-86.7411',
                ts: 1703611719,
              },
            ],
          },

        ],
        [
          'hubot',
          {
            attachments: [
              {
                author_icon: 'https://github.com/NOAAGov.png',
                author_link: 'https://weather.gov/',
                author_name: 'Weather.gov',
                color: '#56F000',
                fallback: '* WHAT...Flooding caused by excessive rainfall is expected.\n\n* WHERE...A portion of Middle Tennessee, including the following\ncounties, Cheatham, Davidson, Macon, Robertson, Sumner and\nTrousdale.\n\n* WHEN...Until 900 PM CST.\n\n* IMPACTS...Minor flooding in low-lying and poor drainage areas.\n\n* ADDITIONAL DETAILS...\n- At 548 PM CST, Doppler radar indicated heavy rain due to\nthunderstorms. Minor flooding is ongoing or expected to begin\nshortly in the advisory area. Between 1 and 2 inches of rain\nhave fallen.\n- Some locations that will experience flooding include...\nGallatin, Ashland City, Lafayette, Madison, Hendersonville,\nGoodlettsville, White House, Millersville, Greenbrier,\nWestmoreland, Ridgetop, Old Hickory, Joelton, Cottontown,\nBledsoe Creek State Park, Whites Creek, Bethpage, Beaman Park\nand Bells Bend.\n- http://www.weather.gov/safety/flood',
                fields: [
                  {
                    short: true,
                    title: 'Severity',
                    value: 'Minor',
                  },
                  {
                    short: true,
                    title: 'Certainty',
                    value: 'Likely',
                  },
                  {
                    short: false,
                    title: 'Areas Affected',
                    value: 'Cheatham, TN; Davidson, TN; Macon, TN; Robertson, TN; Sumner, TN; Trousdale, TN',
                  },
                  {
                    short: false,
                    title: 'Instructions / Response',
                    value: "Turn around, don't drown when encountering flooded roads. Most flood\ndeaths occur in vehicles.",
                  },
                ],
                mrkdwn_in: [
                  'text',
                ],
                pretext: 'Flood Advisory',
                text: '```\n* WHAT...Flooding caused by excessive rainfall is expected.\n\n* WHERE...A portion of Middle Tennessee, including the following\ncounties, Cheatham, Davidson, Macon, Robertson, Sumner and\nTrousdale.\n\n* WHEN...Until 900 PM CST.\n\n* IMPACTS...Minor flooding in low-lying and poor drainage areas.\n\n* ADDITIONAL DETAILS...\n- At 548 PM CST, Doppler radar indicated heavy rain due to\nthunderstorms. Minor flooding is ongoing or expected to begin\nshortly in the advisory area. Between 1 and 2 inches of rain\nhave fallen.\n- Some locations that will experience flooding include...\nGallatin, Ashland City, Lafayette, Madison, Hendersonville,\nGoodlettsville, White House, Millersville, Greenbrier,\nWestmoreland, Ridgetop, Old Hickory, Joelton, Cottontown,\nBledsoe Creek State Park, Whites Creek, Bethpage, Beaman Park\nand Bells Bend.\n- http://www.weather.gov/safety/flood\n```',
                title: 'Flood Advisory issued December 9 at 5:48PM CST until December 9 at 9:00PM CST by NWS Nashville TN',
                ts: 1702165680,
              },
              {
                author_icon: 'https://github.com/NOAAGov.png',
                author_link: 'https://weather.gov/',
                author_name: 'Weather.gov',
                color: '#FF3838',
                fallback: 'TORNADO WATCH 714 REMAINS VALID UNTIL 7 PM CST THIS EVENING FOR\nTHE FOLLOWING AREAS\n\nIN TENNESSEE THIS WATCH INCLUDES 14 COUNTIES\n\nIN MIDDLE TENNESSEE\n\nDAVIDSON              HICKMAN               LAWRENCE\nLEWIS                 MACON                 MAURY\nPERRY                 RUTHERFORD            SMITH\nSUMNER                TROUSDALE             WAYNE\nWILLIAMSON            WILSON\n\nTHIS INCLUDES THE CITIES OF BRENTWOOD, CARTHAGE, CENTERVILLE,\nCLIFTON, COLLINWOOD, COLUMBIA, FRANKLIN, GALLATIN,\nGOODLETTSVILLE, GORDONSVILLE, HARTSVILLE, HENDERSONVILLE,\nHOHENWALD, LA VERGNE, LAFAYETTE, LAWRENCEBURG, LEBANON, LINDEN,\nLOBELVILLE, MOUNT JULIET, MURFREESBORO, NASHVILLE, SMYRNA,\nSOUTH CARTHAGE, AND WAYNESBORO.',
                fields: [
                  {
                    short: true,
                    title: 'Severity',
                    value: 'Extreme',
                  },
                  {
                    short: true,
                    title: 'Certainty',
                    value: 'Possible',
                  },
                  {
                    short: false,
                    title: 'Areas Affected',
                    value: 'Davidson, TN; Hickman, TN; Lawrence, TN; Lewis, TN; Macon, TN; Maury, TN; Perry, TN; Rutherford, TN; Smith, TN; Sumner, TN; Trousdale, TN; Wayne, TN; Williamson, TN; Wilson, TN',
                  },
                  {
                    short: false,
                    title: 'Instructions / Response',
                    value: 'Monitor',
                  },
                ],
                mrkdwn_in: [
                  'text',
                ],
                pretext: 'Tornado Watch',
                text: '```\nTORNADO WATCH 714 REMAINS VALID UNTIL 7 PM CST THIS EVENING FOR\nTHE FOLLOWING AREAS\n\nIN TENNESSEE THIS WATCH INCLUDES 14 COUNTIES\n\nIN MIDDLE TENNESSEE\n\nDAVIDSON              HICKMAN               LAWRENCE\nLEWIS                 MACON                 MAURY\nPERRY                 RUTHERFORD            SMITH\nSUMNER                TROUSDALE             WAYNE\nWILLIAMSON            WILSON\n\nTHIS INCLUDES THE CITIES OF BRENTWOOD, CARTHAGE, CENTERVILLE,\nCLIFTON, COLLINWOOD, COLUMBIA, FRANKLIN, GALLATIN,\nGOODLETTSVILLE, GORDONSVILLE, HARTSVILLE, HENDERSONVILLE,\nHOHENWALD, LA VERGNE, LAFAYETTE, LAWRENCEBURG, LEBANON, LINDEN,\nLOBELVILLE, MOUNT JULIET, MURFREESBORO, NASHVILLE, SMYRNA,\nSOUTH CARTHAGE, AND WAYNESBORO.\n```',
                title: 'Tornado Watch issued December 9 at 5:38PM CST until December 9 at 7:00PM CST by NWS Nashville TN',
                ts: 1702165080,
              },
            ],
            mrkdwn: true,
            text: '*Current watches, warnings, and advisories for Davidson County (TNC037) TN*',
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
            attachments: [
              {
                author_icon: 'https://github.com/openweathermap.png',
                author_link: 'https://openweathermap.org/',
                author_name: 'OpenWeather',
                color: '#eb6e4b',
                fallback: 'Currently broken clouds and 50F/10C in Nashville',
                fields: [
                  {
                    short: true,
                    title: 'Conditions',
                    value: 'Clouds (broken clouds)',
                  },
                  {
                    short: true,
                    title: 'Temperature',
                    value: '50F/10C',
                  },
                  {
                    short: true,
                    title: 'Feels Like',
                    value: '48F/9C',
                  },
                  {
                    short: true,
                    title: 'Humidity',
                    value: '77%',
                  },
                ],
                footer: 'Weather data provided by OpenWeather',
                thumb_url: 'https://openweathermap.org/img/wn/04d@4x.png',
                title: 'Weather in Nashville',
                title_link: 'https://openweathermap.org/weathermap?zoom=12&lat=36.1798&lon=-86.7411',
                ts: 1703611719,
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
            attachments: [
              {
                author_icon: 'https://github.com/openweathermap.png',
                author_link: 'https://openweathermap.org/',
                author_name: 'OpenWeather',
                color: '#eb6e4b',
                fallback: 'Currently scattered clouds and 47F/8C in Seattle',
                fields: [
                  {
                    short: true,
                    title: 'Conditions',
                    value: 'Clouds (scattered clouds)',
                  },
                  {
                    short: true,
                    title: 'Temperature',
                    value: '47F/8C',
                  },
                  {
                    short: true,
                    title: 'Feels Like',
                    value: '45F/7C',
                  },
                  {
                    short: true,
                    title: 'Humidity',
                    value: '90%',
                  },
                ],
                footer: 'Weather data provided by OpenWeather',
                thumb_url: 'https://openweathermap.org/img/wn/03d@4x.png',
                title: 'Weather in Seattle',
                title_link: 'https://openweathermap.org/weathermap?zoom=12&lat=47.6038&lon=-122.3301',
                ts: 1703617000,
              },
            ],
          },
        ],
        [
          'hubot',
          {
            attachments: [
              {
                author_icon: 'https://github.com/NOAAGov.png',
                author_link: 'https://weather.gov/',
                author_name: 'Weather.gov',
                color: '#FCE83A',
                fallback: '* WHAT...East winds 20 to 35 mph with gusts 45 to 55 mph near gaps\nin the terrain.\n\n* WHERE...East Puget Sound Lowlands.\n\n* WHEN...From 6 PM this evening to 1 PM PST Wednesday.\n\n* IMPACTS...Gusty winds could blow around unsecured objects.\nTree limbs could be blown down and a few power outages may\nresult.',
                fields: [
                  {
                    short: true,
                    title: 'Severity',
                    value: 'Moderate',
                  },
                  {
                    short: true,
                    title: 'Certainty',
                    value: 'Likely',
                  },
                  {
                    short: false,
                    title: 'Areas Affected',
                    value: 'East Puget Sound Lowlands',
                  },
                  {
                    short: false,
                    title: 'Instructions / Response',
                    value: 'Use extra caution when driving, especially if operating a high\nprofile vehicle. Secure outdoor objects.',
                  },
                ],
                mrkdwn_in: [
                  'text',
                ],
                pretext: 'Wind Advisory',
                text: '```\n* WHAT...East winds 20 to 35 mph with gusts 45 to 55 mph near gaps\nin the terrain.\n\n* WHERE...East Puget Sound Lowlands.\n\n* WHEN...From 6 PM this evening to 1 PM PST Wednesday.\n\n* IMPACTS...Gusty winds could blow around unsecured objects.\nTree limbs could be blown down and a few power outages may\nresult.\n```',
                title: 'Wind Advisory issued December 26 at 3:52AM PST until December 27 at 1:00PM PST by NWS Seattle WA',
                ts: 1703591520,
              },
            ],
            mrkdwn: true,
            text: '*Current watches, warnings, and advisories for King County (WAC033) WA*',
          },
        ],
      ]);
    });
  });
});
