'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const {deck,best}=require('./cards');
const suit=['♠','♥','♦','♣'];const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const hand=(values)=>values.map((v,i)=>({v,r:ranks[v-2],s:suit[i%4]}));
assert.deepEqual(best(hand([14,2,3,4,5])),[4,5]);
assert.deepEqual(best(hand([10,11,12,13,14])),[4,14]);
assert.equal(best(hand([2,3,4,6,7]))[0],0);
assert.equal(best(hand([2,3,4,5,5]))[0],1);
assert.equal(best(hand([14,2,3,4,4,7,9]))[0],1);
const first=fs.readFileSync('index.html','utf8').split('<script>')[1].split('</script>')[0];
const ctx=vm.createContext({console,Math,crypto:webcrypto,document:{getElementById:()=>({value:'hard'})},setTimeout:()=>{}});
vm.runInContext(first.replace(/\nrender\(\);/,'\n'),ctx);
const soloDeck=()=>vm.runInContext('deck()',ctx);
const soloBest=h=>{ctx.testHand=h;return vm.runInContext('best(testHand)',ctx)};
let counts=Array(9).fill(0), soloCounts=Array(9).fill(0), N=30000;
function check(d){assert.equal(d.length,52);assert.equal(new Set(d.map(c=>c.r+c.s)).size,52);}
for(let i=0;i<N;i++){let d=deck();check(d);counts[best(d.slice(0,7))[0]]++;}
for(let i=0;i<3000;i++){let d=soloDeck();check(d);let h=d.slice(0,7),a=best(h),b=soloBest(h);assert.equal(JSON.stringify(a),JSON.stringify(b));soloCounts[b[0]]++;}
assert(counts[4]/N>.035&&counts[4]/N<.06,'straight distribution unexpected');
console.log('PASS: 30,000 server deals, 3,000 solo deals; unique decks, wheel/broadway, no false straight, same solo/server scoring.');
console.log('Server best-hand counts:',counts,'straight %:',(100*counts[4]/N).toFixed(2));
console.log('Solo best-hand counts:',soloCounts,'straight %:',(100*soloCounts[4]/3000).toFixed(2));
