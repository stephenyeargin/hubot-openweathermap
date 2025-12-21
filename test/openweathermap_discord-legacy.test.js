/* global describe, context it, beforeEach, afterEach */

const Helper = require('hubot-test-helper');
const chai = require('chai');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper([
  './adapters/discord-legacy.js',
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

describe('hubot-openweathermap discord-legacy', () => {
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
        ['hubot', 'Currently broken clouds and 50F/10C in Nashville-Davidson, Tennessee'],
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
        ['hubot', 'Currently broken clouds and 50F/10C in Nashville, US'],
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
        ['hubot', 'Currently scattered clouds and 59F/15C in Denver, Colorado'],
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
        ['hubot', 'Currently scattered clouds and 59F/15C in London, GB'],
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
