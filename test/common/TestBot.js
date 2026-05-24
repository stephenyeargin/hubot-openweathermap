const path = require('path');
const { Robot, TextMessage } = require('hubot');
const nock = require('nock');

class TestBotContext {
  constructor(robot, user) {
    this.robot = robot; this.user = user;
    this.sends = []; this.replies = [];
    this.robot.adapter.on('send', (_, strings) => {
      strings.forEach((s) => this.sends.push(s));
    });
    this.robot.adapter.on('reply', (_, strings) => {
      strings.forEach((s) => this.replies.push(s));
    });
    this.nock = nock;
  }
  async send(message) {
    const id = (Math.random() + 1).toString(36).substring(7);
    this.robot.adapter.receive(new TextMessage(this.user, message, id));
    await new Promise((done) => { setTimeout(done, 50); });
  }
  async sendAndWaitForResponse(message, responseType = 'send') {
    return new Promise((done) => {
      this.robot.adapter.once(responseType, (_, strings) => done(strings[0] != null ? strings[0] : strings));
      this.send(message);
    });
  }
  shutdown() {
    delete process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY;
    delete process.env.HUBOT_DEFAULT_LATITUDE;
    delete process.env.HUBOT_DEFAULT_LONGITUDE;
    delete process.env.HUBOT_OPEN_WEATHER_OLLAMA_ENABLED;
    nock.cleanAll();
    this.robot.shutdown();
  }
}

async function createTestBot(script, settings = {}) {
  process.env.HUBOT_LOG_LEVEL = 'silent';
  process.env.HUBOT_OPEN_WEATHER_MAP_API_KEY = 'test_api_key';
  process.env.HUBOT_DEFAULT_LATITUDE = '36.1627';
  process.env.HUBOT_DEFAULT_LONGITUDE = '-86.7816';
  nock.cleanAll();
  nock.disableNetConnect();
  const robot = new Robot(path.resolve(__dirname, 'adapter'), false, 'hubot');
  await robot.loadAdapter(path.resolve(__dirname, 'adapter.js'));
  script(robot);
  return new Promise((done) => {
    robot.adapter.on('connected', () => {
      if (settings.adapterName) robot.adapterName = settings.adapterName;
      const user = robot.brain.userForId('1', { name: 'testuser', room: '#testroom' });
      done(new TestBotContext(robot, user));
    });
    robot.run();
  });
}

module.exports = { createTestBot, TestBotContext };
