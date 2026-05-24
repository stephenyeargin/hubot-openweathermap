const { describe, it, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const modulePath = path.resolve(__dirname, '../src/ollama-tools');

function makeLogger() {
  const calls = {};
  const stub = (name) => {
    calls[name] = [];
    return (...args) => calls[name].push(args);
  };
  return {
    info: stub('info'),
    debug: stub('debug'),
    error: stub('error'),
    calls,
  };
}

function makeFunctions() {
  return {
    geocodeLocation: () => {},
    getOneCallWeather: () => {},
    reverseGeocode: () => {},
    formatUnits: () => '50',
  };
}

describe('ollama-tools', () => {
  beforeEach(() => {
    delete require.cache[modulePath];
  });

  afterEach(() => {
    delete process.env.HUBOT_OPEN_WEATHER_OLLAMA_ENABLED;
    delete require.cache[modulePath];
  });

  describe('when HUBOT_OPEN_WEATHER_OLLAMA_ENABLED is not set', () => {
    it('logs debug message and returns early', () => {
      const logger = makeLogger();
      const robot = { logger };
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');
      registerOllamaTools(robot, makeFunctions());

      assert.equal(logger.calls.debug.length, 1);
      assert.ok(logger.calls.debug[0][0].includes('OpenWeatherMap Ollama tools disabled'));
      assert.equal(logger.calls.info.length, 0);
    });
  });

  describe('when HUBOT_OPEN_WEATHER_OLLAMA_ENABLED is true', () => {
    it('attempts to register tools when enabled', () => {
      process.env.HUBOT_OPEN_WEATHER_OLLAMA_ENABLED = 'true';
      const logger = makeLogger();
      const robot = { logger };
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');
      registerOllamaTools(robot, makeFunctions());

      const totalLogs = logger.calls.info.length + logger.calls.debug.length;
      assert.ok(totalLogs > 0);
    });

    it('handles missing hubot-ollama gracefully', () => {
      process.env.HUBOT_OPEN_WEATHER_OLLAMA_ENABLED = 'true';
      const logger = makeLogger();
      const robot = { logger };
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');

      assert.doesNotThrow(() => {
        registerOllamaTools(robot, makeFunctions());
      });

      assert.equal(logger.calls.error.length, 0);
    });

    it('validates all required functions are passed', () => {
      process.env.HUBOT_OPEN_WEATHER_OLLAMA_ENABLED = 'true';
      const logger = makeLogger();
      const robot = { logger };
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');

      assert.doesNotThrow(() => {
        registerOllamaTools(robot, {
          geocodeLocation: makeFunctions().geocodeLocation,
        });
      });
    });
  });

  describe('error handling', () => {
    it('does not crash when functions are not provided', () => {
      process.env.HUBOT_OPEN_WEATHER_OLLAMA_ENABLED = 'true';
      const logger = makeLogger();
      const robot = { logger };
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');

      assert.doesNotThrow(() => {
        registerOllamaTools(robot, {});
      });
    });

    it('handles missing robot logger gracefully', () => {
      process.env.HUBOT_OPEN_WEATHER_OLLAMA_ENABLED = 'true';
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');

      const incompleteRobot = {};
      assert.throws(() => {
        registerOllamaTools(incompleteRobot, makeFunctions());
      });
    });
  });
});
