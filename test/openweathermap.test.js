/* global describe, context it, beforeEach, afterEach */

const Helper = require('hubot-test-helper');
const chai = require('chai');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper('./../src/openweathermap.js');
const { expect } = chai;

describe('hubot-openweathermap', () => {
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
        ['hubot', 'Currently broken clouds and 50F/10C in Nashville'],
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
        ['hubot', 'Currently broken clouds and 50F/10C in Nashville'],
        [
          'hubot',
          'Current watches, warnings, and advisories for Davidson County (TNC037) TN:\n'
          + '- Flood Advisory issued December 9 at 5:48PM CST until December 9 at 9:00PM CST by NWS Nashville TN - https://alerts.weather.gov/search?id=urn:oid:2.49.0.1.840.0.c047e1d6c0e2b6fd1a4c3a616d1f34ef22c8e76f.001.1\n'
          + '- Tornado Watch issued December 9 at 5:38PM CST until December 9 at 7:00PM CST by NWS Nashville TN - https://alerts.weather.gov/search?id=urn:oid:2.49.0.1.840.0.72d8a168f0de2c1ff32e593870093279ea4e85e5.003.1',
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
        ['hubot', 'Currently broken clouds and 50F/10C in Nashville'],
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
        ['hubot', 'Currently scattered clouds and 47F/8C in Seattle'],
        [
          'hubot',
          'Current watches, warnings, and advisories for King County (WAC033) WA:\n'
          + '- Wind Advisory issued December 26 at 3:52AM PST until December 27 at 1:00PM PST by NWS Seattle WA - https://alerts.weather.gov/search?id=urn:oid:2.49.0.1.840.0.03c9a16ab3afeeb61c14b4af6207edf30654fcb6.002.1',
        ],
      ]);
    });
  });

  context('handle API error', () => {
    beforeEach((done) => {
      nock('https://api.openweathermap.org')
        .get('/data/2.5/weather')
        .query({ q: 'seattle,WA,US', appid: 'abcdef' })
        .replyWithError(new Error('Internal service error'));

      room.user.say('alice', 'hubot weather seattle, WA');
      setTimeout(done, 100);
    });

    it('hubot responds with error message', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather seattle, WA'],
        ['hubot', 'Encountered error: Error: Internal service error'],
      ]);
    });
  });
});

describe('hubot-openweathermap no API key', () => {
  let room = null;

  beforeEach(() => {
    room = helper.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    room.destroy();
    nock.cleanAll();
  });

  context('error on no configured coordinates', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot weather');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather'],
        ['hubot', 'No API Key configured.'],
      ]);
    });
  });
});

describe('hubot-openweathermap no default location', () => {
  let room = null;

  beforeEach(() => {
    process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
    room = helper.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    room.destroy();
    nock.cleanAll();
    delete process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;
  });

  context('error on no configured coordinates', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot weather');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => {
      expect(room.messages).to.eql([
        ['alice', 'hubot weather'],
        ['hubot', 'No default location set.'],
      ]);
    });
  });
});
