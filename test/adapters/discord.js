// Description
//   Mock Discord adapter
module.exports = (robot) => {
  robot.adapterName = 'discord';
  robot.parseVersion = () => '11.0.0';
};
