/* Read Eyehold env names only. An unset name is undefined.
 * Membership, not truthiness: an empty EYEHOLD_X is a real value.
 */
'use strict';
function readScopedEnv(suffix, env) {
  const eyehold = 'EYEHOLD_' + suffix;
  if (Object.prototype.hasOwnProperty.call(env, eyehold)) return env[eyehold];
  return undefined;
}
module.exports = { readScopedEnv };
