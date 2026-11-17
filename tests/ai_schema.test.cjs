'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const S=require('../js/ai_schema.js');
const base={bore:80,rod:25,stroke:600,pressure:6,frequency:12,temperature:30,dailyHours:16,annualDays:230,mass:100,elasticModulus:210000,lengthFactor:2,safetyFactor:5,loadMode:'theoretical',velocityMode:'calculated'};
test('all four calculator sections mapped',()=>{
 assert.equal(S.fields.length,16);
 assert.equal(S.groups.length,4);
 assert.deepEqual(new Set(S.fields.map(x=>x.key)),new Set([...Object.keys(base),'manualLoad','manualVelocity']));
});
test('full base set enables apply',()=>{
 assert.equal(S.summary(base).ready,true);
 assert.equal(S.summary(base).required.length,14);
});
test('modes require manual values only when selected',()=>{
 const d={...base,loadMode:'manual',velocityMode:'manual'};
 assert.deepEqual(S.missingKeys(d).sort(),['manualLoad','manualVelocity']);
 d.manualLoad=3000;d.manualVelocity=.24;
 assert.equal(S.summary(d).ready,true);
 assert.equal(S.summary(d).required.length,16);
});
test('never automatically accepts defaults or invented values',()=>{
 assert.equal(S.summary({}).completed,0);
 assert.equal(S.summary({mass:25,stroke:200}).ready,false);
});
test('bad geometry prevented',()=>{
 const d={...base,rod:80};
 assert.equal(S.summary(d).ready,false);
 assert.ok(S.summary(d).errors.rod);
});
