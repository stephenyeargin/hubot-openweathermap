/* global describe, context it, beforeEach, afterEach */

const Helper = require('hubot-test-helper');
const chai = require('chai');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper('./../src/hubot-script.js');
const { expect } = chai;

describe('hubot-script', () => {
  let room = null;

  beforeEach(() => {
    process.env.HUBOT_EXAMPLE_API_KEY = 'abcdef';
    room = helper.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    room.destroy();
    nock.cleanAll();
    delete process.env.HUBOT_EXAMPLE_API_KEY;
  });

  // Example: Returning data through an API
  context('ask hubot to get a message', () => {
    beforeEach((done) => {
      nock('https://api.example.com')
        .matchHeader('x-api-key', 'abcdef')
        .get('/v1/status.json')
        .replyWithFile(200, './test/fixtures/sample_api_response.json');
      room.user.say('alice', 'hubot hello:get');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => expect(room.messages).to.eql([
      ['alice', 'hubot hello:get'],
      ['hubot', 'GET: Hello world!'],
    ]));
  });

  // Example: Sending data through an API
  context('ask hubot to post a message', () => {
    beforeEach((done) => {
      nock('https://api.example.com')
        .matchHeader('x-api-key', 'abcdef')
        .post('/v1/status', { payload: 'Hello world!' })
        .reply(200, { status: 'Status updated!' });
      room.user.say('alice', 'hubot hello:post Hello world!');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => expect(room.messages).to.eql([
      ['alice', 'hubot hello:post Hello world!'],
      ['hubot', 'POST: Status updated!'],
    ]));
  });

  // Return a plaintext message when not using Slack adapter
  context('ask hubot to return a plain text message', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot slack test');
      setTimeout(done, 100);
    });

    it('hubot responds with plain text message', () => expect(room.messages).to.eql([
      ['alice', 'hubot slack test'],
      ['hubot', 'This message is not formatted for Slack.'],
    ]));
  });
});
