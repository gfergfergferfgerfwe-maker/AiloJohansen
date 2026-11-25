'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const filename=process.env.KK_DATA_FILE||path.join(__dirname,'data','profiles.json');
const avatars=['♠','♥','♦','♣','★','⚡','☀','☾','◆','●'];
const gifs=['gg','wow','clap','laugh','thinking','nice'];
let db={users:{},sessions:{}};
try{db=JSON.parse(fs.readFileSync(filename,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const err=m=>{throw Error(m)};
function save(){fs.mkdirSync(path.dirname(filename),{recursive:true});let tmp=filename+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db),{mode:0o600});fs.renameSync(tmp,filename);}
function view(u){return {username:u.username,avatar:u.avatar,coins:u.coins,rating:u.rating,hands:u.hands,wins:u.wins};}
function auth(token){let k=typeof token==='string'?hash(token):'',s=db.sessions[k];if(!s||s.exp<Date.now()||!db.users[s.user])err('Logg inn først.');return db.users[s.user];}
function sign(body){let username=String(body.username||'').trim(),key=username.toLowerCase(),pass=String(body.password||'');if(!/^[\p{L}\p{N}_-]{3,24}$/u.test(username)||['__proto__','constructor','prototype'].includes(key))err('Bruk 3–24 bokstaver, tall, _ eller -.');if(pass.length<8||pass.length>128)err('Passord må ha 8–128 tegn.');let u=Object.hasOwn(db.users,key)?db.users[key]:null;
if(body.op==='register'){if(u)err('Navnet er opptatt.');if(Object.keys(db.users).length>=5000)err('Kontogrensen er nådd.');let salt=crypto.randomBytes(16).toString('hex');u={key,username,salt,hash:crypto.scryptSync(pass,salt,64).toString('hex'),avatar:avatars.includes(body.avatar)?body.avatar:'♠',coins:10,rating:1000,hands:0,wins:0};db.users[key]=u;}else {if(!u)err('Feil brukernavn eller passord.');let a=crypto.scryptSync(pass,u.salt,64),b=Buffer.from(u.hash,'hex');if(!crypto.timingSafeEqual(a,b))err('Feil brukernavn eller passord.');}
let token=crypto.randomBytes(32).toString('hex');for(let [k,s] of Object.entries(db.sessions))if(s.exp<Date.now())delete db.sessions[k];db.sessions[hash(token)]={user:key,exp:Date.now()+30*86400e3};save();return {auth:token,profile:view(u)};}
function logout(token){if(typeof token==='string')delete db.sessions[hash(token)];save();}
function leaderboard(){return Object.values(db.users).filter(u=>u.hands>0).sort((a,b)=>b.rating-a.rating||b.wins-a.wins||a.username.localeCompare(b.username)).slice(0,30).map(view);}
module.exports={avatars,gifs,view,auth,sign,logout,leaderboard,save,users:db.users};
