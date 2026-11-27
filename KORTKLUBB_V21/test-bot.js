const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const js=fs.readFileSync(__dirname+'/index.html','utf8').split('<script>')[1].split('</script>')[0];
const ctx=vm.createContext({console,Math,crypto:require('node:crypto').webcrypto,document:{getElementById:()=>({value:'hard'})},setTimeout:()=>{},setInterval:()=>{}});
vm.runInContext(js.replace(/\nrender\(\);/,'\n'),ctx);
vm.runInContext(`
function testC(v,s){return {v,s,r:R[v-2]}}
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
const aa=hardEquity([testC(14,'♠'),testC(14,'♥')],[],300,seeded(21));
const weak=hardEquity([testC(7,'♠'),testC(2,'♥')],[],300,seeded(21));
const royal=hardEquity([testC(14,'♠'),testC(13,'♠')],[testC(12,'♠'),testC(11,'♠'),testC(10,'♠'),testC(2,'♥'),testC(3,'♦')],100,seeded(21));
const testResults={aa,weak,royal,small:hardDecision(.3,10,900,100,true,.5),large:hardDecision(.15,500,900,600,true,.5),strong:hardDecision(.8,100,900,300,true,.1),short:hardDecision(.35,900,20,1000,false,.5)};
`,ctx);
const r=vm.runInContext('testResults',ctx);assert(r.aa>.75&&r.aa>r.weak);assert.equal(r.royal,1);assert.equal(r.small,'call');assert.equal(r.large,'fold');assert.equal(r.strong,'raise');assert.equal(r.short,'call');
// Run actual hard bot on the flop against modest bets over random hands.
const results=vm.runInContext(`(()=>{let folds=0,calls=0,raises=0;for(let i=0;i<80;i++){let d=deck();p=newP();p.active=true;p.street=1;p.turn=1;p.hole=[[d.pop(),d.pop()],[d.pop(),d.pop()]];p.board=[d.pop(),d.pop(),d.pop()];p.d=d;p.pot=110;p.bet=[10,0];p.cash=[940,950];p.acted=[true,false];const original=pAct;pAct=(i,kind)=>{if(kind==='fold')folds++;if(kind==='call')calls++;if(kind==='raise')raises++;p.turn=0};try{aiTurn()}finally{pAct=original}}return {folds,calls,raises}})()`,ctx);
assert(results.calls+results.raises>60); console.log('PASS hard bot:',r,results);
