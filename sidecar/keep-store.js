'use strict';

const WorldModel = require('../frontend/app/worldmodel.js');
const Pipeline = require('../frontend/app/pipeline.js');

function makeKeepStore(o) {
  o = o || {};
  const model = o.worldModel || WorldModel;
  let keep = null;
  let doc = null;
  let routingPlan = null;

  function validateKeepDoc(nextDoc) {
    if (!nextDoc || typeof nextDoc !== 'object' || Array.isArray(nextDoc)) return { ok: false, error: 'keep document required' };
    if (nextDoc.schema === 'eyehold.station') nextDoc.schema = 'eyehold.keep';
    if (nextDoc.schema && nextDoc.schema !== 'eyehold.keep') return { ok: false, error: 'unsupported keep schema' };
    if (!nextDoc.rooms || typeof nextDoc.rooms !== 'object' || Array.isArray(nextDoc.rooms)) return { ok: false, error: 'keep rooms required' };
    if (!Array.isArray(nextDoc.order) || nextDoc.order.length < 1) return { ok: false, error: 'keep must contain at least one room' };
    if (!Array.isArray(nextDoc.props)) return { ok: false, error: 'keep props must be an array' };
    let parsed;
    try { parsed = model.deserialize(nextDoc); } catch (e) { return { ok: false, error: (e && e.message) || 'keep rejected' }; }
    if (!parsed || typeof parsed.bayObjects !== 'function' || typeof parsed.serialize !== 'function') return { ok: false, error: 'keep model unavailable' };
    if (!parsed.rooms || !parsed.rooms().length) return { ok: false, error: 'keep must contain at least one room' };
    const plan = Pipeline.compileRoutingPlan(parsed.projectGeometry());
    return { ok: true, keep: parsed, doc: parsed.serialize(), routingPlan: plan, routingOk: Pipeline.ok(plan) };
  }

  function setKeep(nextDoc) {
    const v = validateKeepDoc(nextDoc);
    if (!v.ok) return { ok: false, error: v.error };
    keep = v.keep;
    doc = v.doc;
    routingPlan = v.routingPlan;
    return { ok: true, rooms: keep.rooms().length, props: keep.props().length, routingOk: v.routingOk, routingPlan };
  }

  function setSaveDoc(saveDoc) {
    if (!saveDoc || typeof saveDoc !== 'object' || Array.isArray(saveDoc)) return { ok: false, error: 'save document required' };
    if (!saveDoc.keep || typeof saveDoc.keep !== 'object' || Array.isArray(saveDoc.keep)) return { ok: false, error: 'save document keep required' };
    return setKeep(saveDoc.keep);
  }

  function clearKeep() { keep = null; doc = null; routingPlan = null; return { ok: true, cleared: true }; }
  function hasKeep() { return !!keep; }
  function getKeep() { return doc; }
  function getRoutingPlan() { return routingPlan; }
  // (multi-bay) dockId = the bay the run is at; the keep model resolves that bay's room (or the agent's desk room)
  function bayObjects(agentId, dockId) { return keep ? keep.bayObjects(agentId, dockId) : null; }

  return { validateKeepDoc, setKeep, setSaveDoc, clearKeep, hasKeep, getKeep, getRoutingPlan, bayObjects };
}

module.exports = { makeKeepStore };
