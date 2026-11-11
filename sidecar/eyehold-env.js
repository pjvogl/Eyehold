/* Read Eyehold env names first. STARNET_* then SKYNET_* remain fallbacks.
 * Membership, not truthiness: an empty EYEHOLD_X still wins over a set STARNET_X.
 */
'use strict';
function readScopedEnv(suffix, env) {
  const eyehold = 'EYEHOLD_' + suffix;
  if (Object.prototype.hasOwnProperty.call(env, eyehold)) return env[eyehold];
  const starnet = 'STARNET_' + suffix;
  if (Object.prototype.hasOwnProperty.call(env, starnet)) return env[starnet];
  return env['SKYNET_' + suffix];
}
module.exports = { readScopedEnv };
