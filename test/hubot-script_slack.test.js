/* global describe, context it, beforeEach, afterEach */

const Helper = require('hubot-test-helper');
const chai = require('chai');
chai.use(require('sinon-chai'));
const nock = require('nock');

const helper = new Helper([
  './../test/adapters/slack.js',
  './../src/hubot-script.js',
]);
const { expect } = chai;

describe('hubot-script slack', () => {
  let room = null;

  beforeEach(() => {
    room = helper.createRoom();
    nock.disableNetConnect();
  });

  afterEach(() => {
    room.destroy();
    nock.cleanAll();
  });

  // Return a Slack formatted message when using adapter
  context('ask hubot to return a Slack message', () => {
    beforeEach((done) => {
      room.user.say('alice', 'hubot slack test');
      setTimeout(done, 100);
    });

    it('hubot responds with message', () => expect(room.messages).to.eql([
      ['alice', 'hubot slack test'],
      ['hubot', {
        attachments: [
          {
            title: 'Slack Test',
            text: 'This message is formatted for Slack.',
            color: '#36a64f',
          },
        ],
      }],
    ]));
  });
});
