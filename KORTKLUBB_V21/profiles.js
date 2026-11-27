'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const filename=process.env.KK_DATA_FILE||path.join(__dirname,'data','profiles.json');
const remoteURL=process.env.RD_DATABASE_URL, remoteKey=process.env.RD_DATABASE_KEY;
const storageMode=remoteURL||remoteKey?'database':process.env.KK_DATA_FILE?'file-configured':'local-file';
let revision=0, savedRevision=0;
function databaseEndpoint(){if(!remoteURL||!remoteKey)throw Error('Sett både RD_DATABASE_URL og RD_DATABASE_KEY.');const url=new URL(remoteURL);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('RD_DATABASE_URL må være en HTTPS-prosjektadresse.');return url.origin+'/rest/v1/royaldeck_state';}
async function remoteRequest(method,query,payload){const url=databaseEndpoint()+query;let res;try{res=await fetch(url,{method,headers:{apikey:remoteKey,...(remoteKey.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+remoteKey}),'Content-Type':'application/json',...(method==='POST'?{Prefer:'resolution=merge-duplicates,return=minimal'}:{})},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(12000)});}catch{throw Error('Kontodatabasen svarer ikke.');}if(!res.ok)throw Error('Kontodatabasen avviste forespørselen (HTTP '+res.status+').');return method==='GET'?res.json():undefined;}
async function initialize(){if(storageMode!=='database')return;const rows=await remoteRequest('GET','?id=eq.main&select=payload');if(!Array.isArray(rows))throw Error('Ugyldig databasesvar.');if(rows.length){const d=rows[0].payload;if(!d||typeof d.users!=='object'||!d.users||Array.isArray(d.users)||!d.sessions||typeof d.sessions!=='object'||Array.isArray(d.sessions))throw Error('Ugyldig lagret kontodatabase.');db.users=d.users;db.sessions=d.sessions;module.exports.users=db.users;}else{revision++;await flush();}}
async function flush(){if(storageMode!=='database'||savedRevision===revision)return;let rev=revision;await remoteRequest('POST','?on_conflict=id',{id:'main',payload:db});savedRevision=rev;}

const avatars=['♠','♥','♦','♣','★','⚡','☀','☾','◆','●'];
const banners=['slate','red','blue','green','purple','gold','pink','cyan'];
const ranks=[{min:1500,name:'Royal',key:'royal'},{min:1400,name:'Diamond',key:'diamond'},{min:1300,name:'Gold',key:'gold'},{min:1200,name:'Silver',key:'silver'},{min:1100,name:'Bronze',key:'bronze'},{min:0,name:'Unranked',key:'unranked'}];
function rank(n){return ranks.find(r=>n>=r.min)||ranks.at(-1);}
function identity(u){return {character:characterOf(u),outfit:outfitOf(u),username:u.username,avatar:u.avatar,banner:banners.includes(u.banner)?u.banner:'slate',rating:u.rating,rank:rank(u.rating),item:catalog.find(i=>i.id===u.equipped)?.id||null,photo:u.photoId?'/avatars/'+u.photoId+'.jpg':null};}
function setPhoto(u,data){if(typeof data!=='string'||data.length>88000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))err('Ugyldig bilde.');const b=Buffer.from(data,'base64');if(b.length<100||b.length>65536||b[0]!==255||b[1]!==216||b.at(-2)!==255||b.at(-1)!==217)err('Bildet må være JPEG, maks 64 kB.');let i=2,valid=false;while(i+4<b.length&&b[i]===255){let m=b[i+1];if(m===218||m===217)break;let n=b.readUInt16BE(i+2);if(n<2||i+2+n>b.length)break;if([192,193,194].includes(m)&&n>=8){let h=b.readUInt16BE(i+5),w=b.readUInt16BE(i+7);valid=w>=1&&h>=1&&w<=192&&h<=192;break;}i+=2+n;}if(!valid)err('Bildet må være maks 192 × 192 piksler.');u.photo=data;u.photoId=crypto.randomBytes(16).toString('hex');}
function getPhoto(id){let u=Object.values(db.users).find(x=>x.photoId===id);return u?.photo?Buffer.from(u.photo,'base64'):null;}
const catalog=[{id:'cash',name:'Dollar Bundle',icon:'💵',cost:3},{id:'shades',name:'Black Shades',icon:'🕶️',cost:3},{id:'coffee',name:'Espresso',icon:'☕',cost:3},{id:'headphones',name:'Studio Headphones',icon:'🎧',cost:4},{id:'dice',name:'Lucky Dice',icon:'🎲',cost:4},{id:'watch',name:'Luxury Watch',icon:'⌚',cost:5},{id:'gold',name:'Gold Vault',icon:'🪙',cost:6},{id:'diamond',name:'Ice Diamond',icon:'💎',cost:7},{id:'crown',name:'Royal Crown',icon:'👑',cost:7}];
catalog.forEach(i=>i.slot="table");catalog.push(...[{"id": "suit", "name": "Midnight Suit", "icon": "🤵", "cost": 7, "slot": "top"}, {"id": "hoodie", "name": "Graphite Hoodie", "icon": "🧥", "cost": 4, "slot": "top"}, {"id": "polo", "name": "Ivory Polo", "icon": "👕", "cost": 3, "slot": "top"}, {"id": "bomber", "name": "Olive Bomber", "icon": "🧥", "cost": 5, "slot": "top"}, {"id": "burgundy", "name": "Burgundy Jacket", "icon": "🧥", "cost": 6, "slot": "top"}, {"id": "cap", "name": "Black Cap", "icon": "🧢", "cost": 3, "slot": "head"}, {"id": "beanie", "name": "Winter Beanie", "icon": "🧢", "cost": 4, "slot": "head"}, {"id": "frames", "name": "Gold Frames", "icon": "👓", "cost": 5, "slot": "face"}, {"id": "sunglasses", "name": "Dark Glasses", "icon": "🕶️", "cost": 4, "slot": "face"}, {"id": "wristwatch", "name": "Steel Watch", "icon": "⌚", "cost": 6, "slot": "wrist"}, {"id": "bracelet", "name": "Gold Bracelet", "icon": "🟡", "cost": 5, "slot": "wrist"}, {"id": "case", "name": "Leather Card Case", "icon": "🧳", "cost": 5, "slot": "table"}, {"id": "plant", "name": "Mini Bonsai", "icon": "🪴", "cost": 4, "slot": "table"}]);
const slots=["top","head","face","wrist"];
function characterOf(u){if(Number.isInteger(u.character)&&u.character>=0&&u.character<12)return u.character;let h=0;for(let ch of u.username)h=(Math.imul(h,31)+ch.charCodeAt(0))>>>0;return h%12;}
function outfitOf(u){let o={};for(let slot of slots){let i=catalog.find(i=>i.slot===slot&&i.id===u.outfit?.[slot]);if(i&&u.owned?.includes(i.id))o[slot]=i.id;}return o;}
function setCharacter(u,n){if(!Number.isInteger(n)||n<0||n>=12)err("Ugyldig karakter.");u.character=n;save();}
const quizzes=[
 [['Hvor mange kort er det i en vanlig kortstokk uten jokere?',['48','52','54'],1],['Hvor mange spar er det i stokken?',['13','12','14'],0],['Hvilken hånd er høyest i poker?',['To par','Tre like','Ett par'],1]],
 [['Hvor mange ess finnes i en kortstokk?',['2','4','8'],1],['Hva betyr flush?',['Fem kort i samme farge','Fem kort på rad','Fire like'],0],['Hva er blackjack-verdien av en konge?',['11','13','10'],2]],
 [['Hvor mange røde kort er det i en kortstokk?',['24','26','28'],1],['Hvilken kombinasjon slår en straight?',['Ett par','To par','Flush'],2],['Hva kalles tre like og ett par?',['Fullt hus','Straight','Flush'],0]],
 [['Hvor mange bildekort er det i en kortstokk?',['12','16','8'],0],['Hvor mange felleskort kan Texas Hold’em ha?',['4','5','7'],1],['Hva er verdien av ess i blackjack?',['Bare 1','Bare 11','1 eller 11'],2]],
 [['Hvor mange kort får hver spiller i Texas Hold’em?',['2','3','5'],0],['Hvilket kort er ikke et bildekort?',['Knekt','Ess','Dame'],1],['Hva er sjansen for et rødt kort fra en full kortstokk?',['25 %','75 %','50 %'],2]],
 [['Hva er høyest?',['Fire like','Fullt hus','Tre like'],0],['Hvor mange kort har hver farge?',['12','13','14'],1],['Hvor mange kort er det i en straight?',['4','5','6'],1]]
];
function day(){return Math.floor(Date.now()/86400000)}
function challenge(u){let d=day(),q=quizzes[d%quizzes.length];return {day:d,completed:u.quizDay===d,attempts:u.quizAttemptDay===d?u.quizAttempts||0:0,reward:3,questions:q.map(([text,choices])=>({text,choices}))};}
function solve(u,answers){let d=day();if(u.quizDay===d)err('Dagens oppgave er allerede fullført.');if(!Array.isArray(answers)||answers.length!==3||answers.some(n=>!Number.isInteger(n)||n<0||n>2))err('Svar på alle tre spørsmål.');if(u.quizAttemptDay!==d){u.quizAttemptDay=d;u.quizAttempts=0;}if(u.quizAttempts>=2)err('Dagens to forsøk er brukt.');u.quizAttempts++;let ok=quizzes[d%quizzes.length].every((q,i)=>q[2]===answers[i]);if(ok){u.quizDay=d;u.coins+=3;}save();return ok;}
function shop(u,op,item,slot){
 u.owned??=[];u.outfit??={};
 if(op==='equip'&&item===null){if(!slot||slot==='table')u.equipped=null;else if(slots.includes(slot))delete u.outfit[slot];else err('Ukjent plass.');save();return;}
 let i=catalog.find(x=>x.id===item);if(!i)err('Ukjent tilbehør.');
 if(op==='buyItem'){if(u.owned.includes(i.id))err('Du eier allerede dette.');if(u.coins<i.cost)err('Ikke nok JanCoins.');u.coins-=i.cost;u.owned.push(i.id);}else if(!u.owned.includes(i.id))err('Du eier ikke dette.');
 if(i.slot==='table')u.equipped=i.id;else u.outfit[i.slot]=i.id;save();
}
const gifs=['gg','wow','clap','laugh','thinking','nice'];
let db={users:{},sessions:{}};
try{db=JSON.parse(fs.readFileSync(filename,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const err=m=>{throw Error(m)};
function save(){if(storageMode==='database'){revision++;return;}fs.mkdirSync(path.dirname(filename),{recursive:true});let tmp=filename+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db),{mode:0o600});fs.renameSync(tmp,filename);}
function view(u){return {...identity(u),coins:u.coins,owned:u.owned||[],hands:u.hands,wins:u.wins};}
function auth(token){let k=typeof token==='string'?hash(token):'',s=db.sessions[k];if(!s||s.exp<Date.now()||!db.users[s.user])err('Logg inn først.');return db.users[s.user];}
function sign(body){let username=String(body.username||'').trim(),key=username.toLowerCase(),pass=String(body.password||'');if(!/^[\p{L}\p{N}_-]{3,24}$/u.test(username)||['__proto__','constructor','prototype'].includes(key))err('Bruk 3–24 bokstaver, tall, _ eller -.');if(pass.length<8||pass.length>128)err('Passord må ha 8–128 tegn.');let u=Object.hasOwn(db.users,key)?db.users[key]:null;
if(body.op==='register'){if(u)err('Navnet er opptatt.');if(Object.keys(db.users).length>=5000)err('Kontogrensen er nådd.');let salt=crypto.randomBytes(16).toString('hex');u={key,username,salt,hash:crypto.scryptSync(pass,salt,64).toString('hex'),avatar:avatars.includes(body.avatar)?body.avatar:'♠',coins:10,rating:1000,hands:0,wins:0};db.users[key]=u;}else {if(!u)err('Feil brukernavn eller passord.');let a=crypto.scryptSync(pass,u.salt,64),b=Buffer.from(u.hash,'hex');if(!crypto.timingSafeEqual(a,b))err('Feil brukernavn eller passord.');}
let token=crypto.randomBytes(32).toString('hex');for(let [k,s] of Object.entries(db.sessions))if(s.exp<Date.now())delete db.sessions[k];db.sessions[hash(token)]={user:key,exp:Date.now()+30*86400e3};save();return {auth:token,profile:view(u)};}
function logout(token){if(typeof token==='string')delete db.sessions[hash(token)];save();}
function leaderboard(){return Object.values(db.users).filter(u=>u.hands>0).sort((a,b)=>b.rating-a.rating||b.wins-a.wins||a.username.localeCompare(b.username)).slice(0,30).map(view);}
module.exports={initialize,flush,storageMode,setCharacter,catalog,challenge,solve,shop,avatars,banners,ranks,rank,identity,setPhoto,getPhoto,gifs,view,auth,sign,logout,leaderboard,save,users:db.users};
