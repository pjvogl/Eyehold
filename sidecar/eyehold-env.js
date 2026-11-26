/* Read Eyehold env names first, then SKYNET_*.
 * Membership, not truthiness: an empty EYEHOLD_X still wins over a set SKYNET_X.
 */
'use strict';
function readScopedEnv(suffix, env) {
  const eyehold = 'EYEHOLD_' + suffix;
  if (Object.prototype.hasOwnProperty.call(env, eyehold)) return env[eyehold];
  return env['SKYNET_' + suffix];
}
module.exports = { readScopedEnv };
