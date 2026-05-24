const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');
const { createTestBot } = require('./common/TestBot');
const script = require('../src/openweathermap');

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
  describe('get weather for configured coordinates', () => {
    let bot;
    before(async () => {
      bot = await createTestBot(script, { adapterName: 'slack' });
      process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
      process.env.HUBOT_DEFAULT_LATITUDE = '36.1798';
      process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7411';
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
      await bot.send('hubot weather');
      await new Promise((r) => setTimeout(r, 150));
    });
    after(() => bot.shutdown());

    it('responds with weather attachment', () => {
      assert.ok(bot.sends.length >= 1);
      const msg = bot.sends[0];
      assert.ok(Array.isArray(msg.attachments));
      assert.equal(msg.attachments.length, 1);
      assert.equal(msg.attachments[0].title, 'Weather for Nashville-Davidson, Tennessee');
    });

    it('responds with alert attachment', () => {
      assert.ok(bot.sends.length >= 2);
      const msg = bot.sends[1];
      assert.ok(Array.isArray(msg.attachments));
      assert.equal(msg.attachments.length, 1);
      assert.equal(msg.attachments[0].title, 'Flood Advisory');
    });
  });

  describe('get weather for a zip code', () => {
    let bot;
    before(async () => {
      bot = await createTestBot(script, { adapterName: 'slack' });
      process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
      process.env.HUBOT_DEFAULT_LATITUDE = '36.1798';
      process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7411';
      mockGeoZip('37206', './test/fixtures/api.openweathermap-org-geo-1.0-zip-37206.json');
      mockOneCall(
        36.1798,
        -86.7411,
        './test/fixtures/api.openweathermap.org-data-3.0-onecall-37206.json',
      );
      await bot.send('hubot weather 37206');
      await new Promise((r) => setTimeout(r, 150));
    });
    after(() => bot.shutdown());

    it('responds with weather attachment', () => {
      assert.ok(bot.sends.length >= 1);
      const msg = bot.sends[0];
      assert.ok(Array.isArray(msg.attachments));
      assert.equal(msg.attachments.length, 1);
      assert.equal(msg.attachments[0].title, 'Weather for Nashville, US');
    });

    it('responds with alert attachment', () => {
      assert.ok(bot.sends.length >= 2);
      const msg = bot.sends[1];
      assert.ok(Array.isArray(msg.attachments));
      assert.equal(msg.attachments.length, 1);
      assert.equal(msg.attachments[0].title, 'Flood Advisory');
    });
  });

  describe('get weather for a city', () => {
    let bot;
    before(async () => {
      bot = await createTestBot(script, { adapterName: 'slack' });
      process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
      process.env.HUBOT_DEFAULT_LATITUDE = '36.1798';
      process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7411';
      mockGeoDirect('denver,co,us', './test/fixtures/api.openweathermap-org-geo-1.0-direct-denver.json');
      mockOneCall(
        39.7392364,
        -104.984862,
        './test/fixtures/api.openweathermap.org-data-3.0-onecall-denver.json',
      );
      await bot.send('hubot weather denver, CO');
      await new Promise((r) => setTimeout(r, 150));
    });
    after(() => bot.shutdown());

    it('responds with weather attachment', () => {
      assert.ok(bot.sends.length >= 1);
      const msg = bot.sends[0];
      assert.ok(Array.isArray(msg.attachments));
      assert.equal(msg.attachments.length, 1);
      assert.equal(msg.attachments[0].title, 'Weather for Denver, Colorado');
    });

    it('responds with alert attachment', () => {
      assert.ok(bot.sends.length >= 2);
      const msg = bot.sends[1];
      assert.ok(Array.isArray(msg.attachments));
      assert.equal(msg.attachments.length, 1);
      assert.equal(msg.attachments[0].title, 'Red Flag Warning');
    });
  });

  describe('get weather for location outside US', () => {
    let bot;
    before(async () => {
      bot = await createTestBot(script, { adapterName: 'slack' });
      process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
      process.env.HUBOT_DEFAULT_LATITUDE = '36.1798';
      process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7411';
      nock('https://api.openweathermap.org')
        .get('/geo/1.0/direct')
        .query({ q: 'London, UK', limit: 1, appid: 'abcdef' })
        .reply(200, [{
          name: 'London', lat: 51.5072, lon: -0.1276, country: 'GB',
        }]);
      mockOneCall(
        51.5072,
        -0.1276,
        './test/fixtures/api.openweathermap.org-data-3.0-onecall-denver.json',
      );
      await bot.send('hubot weather London, UK');
      await new Promise((r) => setTimeout(r, 150));
    });
    after(() => bot.shutdown());

    it('responds with weather attachment', () => {
      assert.ok(bot.sends.length >= 1);
      const msg = bot.sends[0];
      assert.ok(Array.isArray(msg.attachments));
      assert.equal(msg.attachments.length, 1);
      assert.equal(msg.attachments[0].title, 'Weather for London, GB');
    });

    it('responds with alert attachment', () => {
      assert.ok(bot.sends.length >= 2);
      const msg = bot.sends[1];
      assert.ok(Array.isArray(msg.attachments));
      assert.equal(msg.attachments.length, 1);
      assert.equal(msg.attachments[0].title, 'Red Flag Warning');
    });
  });

  describe('friendly message when location not found', () => {
    let bot;
    before(async () => {
      bot = await createTestBot(script, { adapterName: 'slack' });
      process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
      process.env.HUBOT_DEFAULT_LATITUDE = '36.1798';
      process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7411';
      nock('https://api.openweathermap.org')
        .get('/geo/1.0/direct')
        .query({ q: 'nowhere, ZZ', limit: 1, appid: 'abcdef' })
        .reply(200, []);
      await bot.send('hubot weather nowhere, ZZ');
      await new Promise((r) => setTimeout(r, 150));
    });
    after(() => bot.shutdown());

    it('responds with friendly error', () => {
      assert.ok(bot.sends.length >= 1);
      assert.ok(bot.sends[0].includes("Sorry, I couldn’t find that location."));
    });
  });

  describe('handle One Call API error', () => {
    let bot;
    before(async () => {
      bot = await createTestBot(script, { adapterName: 'slack' });
      process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
      process.env.HUBOT_DEFAULT_LATITUDE = '36.1798';
      process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7411';
      mockGeoDirect('server, ERROR', './test/fixtures/api.openweathermap-org-geo-1.0-direct-denver.json');
      nock('https://api.openweathermap.org')
        .get('/data/3.0/onecall')
        .query({ lat: 39.7392364, lon: -104.984862, appid: 'abcdef' })
        .replyWithError(new Error('Mock internal service error'));
      await bot.send('hubot weather server, ERROR');
      await new Promise((r) => setTimeout(r, 150));
    });
    after(() => bot.shutdown());

    it('responds with generic error', () => {
      assert.ok(bot.sends.length >= 1);
      assert.ok(bot.sends[0].includes("Sorry, I couldn’t retrieve weather data for that location."));
    });
  });
});

describe('hubot-openweathermap slack no API key', () => {
  let bot;
  before(async () => {
    bot = await createTestBot(script, { adapterName: 'slack' });
    delete process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;
    delete process.env.HUBOT_DEFAULT_LATITUDE;
    delete process.env.HUBOT_DEFAULT_LONGITUDE;
  });
  after(() => bot.shutdown());

  it('responds with missing API key message', async () => {
    const response = await bot.sendAndWaitForResponse('hubot weather');
    assert.ok(response.includes('No API Key configured.'));
  });
});

describe('hubot-openweathermap slack no default location', () => {
  let bot;
  before(async () => {
    bot = await createTestBot(script, { adapterName: 'slack' });
    process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'abcdef';
    delete process.env.HUBOT_DEFAULT_LATITUDE;
    delete process.env.HUBOT_DEFAULT_LONGITUDE;
  });
  after(() => bot.shutdown());

  it('responds with missing default location message', async () => {
    const response = await bot.sendAndWaitForResponse('hubot weather');
    assert.ok(response.includes('No default location set.'));
  });
});
