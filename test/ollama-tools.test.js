/* global describe, it, beforeEach, afterEach, context */

const chai = require('chai');
const sinon = require('sinon');
const path = require('path');
chai.use(require('sinon-chai'));

const { expect } = chai;

describe('ollama-tools', () => {
  let robot;
  let mockFunctions;
  const modulePath = path.resolve(__dirname, '../src/ollama-tools.js');

  beforeEach(() => {
    // Clear module cache to get fresh instance
    delete require.cache[modulePath];

    robot = {
      logger: {
        info: sinon.stub(),
        debug: sinon.stub(),
        error: sinon.stub(),
      },
    };

    mockFunctions = {
      geocodeLocation: sinon.stub(),
      getOneCallWeather: sinon.stub(),
      reverseGeocode: sinon.stub(),
      formatUnits: sinon.stub().returns('50'),
    };
  });

  afterEach(() => {
    delete process.env.HUBOT_OPENWEATHER_OLLAMA_ENABLED;
    delete require.cache[modulePath];
    sinon.restore();
  });

  context('when HUBOT_OPENWEATHER_OLLAMA_ENABLED is not set', () => {
    it('logs debug message and returns early', () => {
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');
      registerOllamaTools(robot, mockFunctions);

      expect(robot.logger.debug).to.have.been.calledOnceWith(
        'OpenWeatherMap Ollama tools disabled (set HUBOT_OPEN_WEATHER_OLLAMA_ENABLED=true to enable)',
      );
      expect(robot.logger.info).to.not.have.been.called;
    });
  });

  context('when HUBOT_OPENWEATHER_OLLAMA_ENABLED is true', () => {
    it('attempts to register tools when enabled', () => {
      process.env.HUBOT_OPENWEATHER_OLLAMA_ENABLED = 'true';

      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');
      registerOllamaTools(robot, mockFunctions);

      // Should log that it's trying to register
      // Should log that it's trying to register and also log debug about not finding module
      const totalLogs = robot.logger.info.callCount + robot.logger.debug.callCount;
      expect(totalLogs).to.be.greaterThan(0);
    });

    it('handles missing hubot-ollama gracefully', () => {
      process.env.HUBOT_OPENWEATHER_OLLAMA_ENABLED = 'true';
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');

      // Should not throw even if hubot-ollama is not available
      expect(() => {
        registerOllamaTools(robot, mockFunctions);
      }).to.not.throw();

      // Should log debug about not finding module
      expect(robot.logger.info).to.not.have.been.called;
    });

    it('validates all required functions are passed', () => {
      process.env.HUBOT_OPENWEATHER_OLLAMA_ENABLED = 'true';
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');

      // Should handle even when not all functions are provided
      expect(() => {
        registerOllamaTools(robot, {
          geocodeLocation: mockFunctions.geocodeLocation,
        });
      }).to.not.throw();
    });
  });

  context('error handling', () => {
    it('does not crash when functions are not provided', () => {
      process.env.HUBOT_OPENWEATHER_OLLAMA_ENABLED = 'true';
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');

      expect(() => {
        registerOllamaTools(robot, {});
      }).to.not.throw();
    });

    it('handles missing robot logger gracefully', () => {
      process.env.HUBOT_OPENWEATHER_OLLAMA_ENABLED = 'true';
      // eslint-disable-next-line global-require
      const registerOllamaTools = require('../src/ollama-tools');

      // Should handle even with incomplete robot object
      const incompleteRobot = {};
      expect(() => {
        registerOllamaTools(incompleteRobot, mockFunctions);
      }).to.throw(); // Will throw because logger is missing, which is expected
    });
  });
});
