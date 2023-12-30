// Description
//   Mock Discord adapter for older Hubot
module.exports = (robot) => {
  robot.adapterName = 'discord';
  robot.parseVersion = () => '3.0.0';
};
