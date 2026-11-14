const fs = require('fs');

let js = fs.readFileSync('js/audio.js', 'utf8');

const targetGap = 'witherSpawn: 0.5 };';
const targetMaxlen = 'witherSpawn: 2.5 };';

if (!js.includes(targetGap)) throw new Error('targetGap not found');
if (!js.includes(targetMaxlen)) throw new Error('targetMaxlen not found');

const borealisGap = 'witherSpawn: 0.5, borealisBreath: 0.22, borealisRoarEpic: 1.0, borealisRoar: 0.6, borealisSlam: 0.3, borealisStomp: 0.18, borealisGrowl: 0.8, borealisFreezeMagic: 0.35, borealisIceCast: 0.15, borealisSnarl: 0.2, borealisBite: 0.15, borealisFrostCreak: 0.1, borealisIceCrack: 0.08, borealisIceBreak: 0.08, borealisFrostbite: 0.18 };';
const borealisMaxlen = 'witherSpawn: 2.5, borealisBreath: 2.5, borealisRoarEpic: 3.8, borealisRoar: 2.5, borealisSlam: 2.2, borealisStomp: 1.5, borealisGrowl: 2.5, borealisFreezeMagic: 2.4, borealisIceCast: 1.4, borealisSnarl: 0.9, borealisBite: 0.8, borealisFrostCreak: 1.0, borealisIceCrack: 0.8, borealisIceBreak: 0.8, borealisFrostbite: 1.2 };';

js = js.replace(targetGap, borealisGap);
js = js.replace(targetMaxlen, borealisMaxlen);

fs.writeFileSync('js/audio.js', js, 'utf8');
console.log('Successfully patched GAP and MAXLEN for Borealis!');
