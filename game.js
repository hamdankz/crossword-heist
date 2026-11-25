const crypto=require('node:crypto'),fs=require('node:fs');
const entries=fs.readFileSync(__dirname+'/clues.txt','utf8').trim().split('\n').map(l=>l.split('|')).filter(([w])=>/^[A-Z]{4,10}$/.test(w));
const bank=entries.map(e=>e[0]), clues=Object.fromEntries(entries);
const rand=n=>crypto.randomInt(n);
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=rand(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
const SIZE=15;
function puzzle(seen=new Set()){
for(let attempt=0;attempt<300;attempt++){
let grid=Array.from({length:SIZE},()=>Array(SIZE).fill('')), words=[],paths={},items=[],used=new Set();
function put(w,r,c,d){let path=Array.from({length:w.length},(_,k)=>(r+(d===1?k:0))*SIZE+c+(d===0?k:0));path.forEach((i,k)=>{grid[i/SIZE|0][i%SIZE]=w[k];used.add(i+':'+d)});words.push(w);paths[w]=[path];items.push({word:w,clue:clues[w],path,d});}
let first=shuffle(bank.filter(w=>w.length<=8))[0];put(first,Math.floor(SIZE/2),Math.floor((SIZE-first.length)/2),0);
for(let step=0;step<19;step++){
let options=[];
for(const w of shuffle(bank).filter(w=>!words.includes(w))){for(let d=0;d<2;d++)for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
let dr=d,dc=1-d;if(r+dr*(w.length-1)>=SIZE||c+dc*(w.length-1)>=SIZE||grid[r-dr]?.[c-dc]||grid[r+dr*w.length]?.[c+dc*w.length])continue;
let cross=0,ok=true;for(let k=0;k<w.length;k++){let y=r+dr*k,x=c+dc*k,v=grid[y][x];if(v){if(v!==w[k]||used.has((y*SIZE+x)+':'+d)){ok=false;break}cross++}else if(grid[y-dc]?.[x-dr]||grid[y+dc]?.[x+dr]){ok=false;break}}
if(ok&&cross)options.push([w,r,c,d]);}if(options.length>=25)break;}
if(!options.length)break;put(...options[rand(options.length)]);}
if(words.length<15)continue;let signature=words.slice().sort().join('|');if(seen.has(signature))continue;seen.add(signature);items.sort((a,b)=>a.path[0]-b.path[0]||a.d-b.d);let n=0,last=-1;for(let e of items){if(e.path[0]!==last){n++;last=e.path[0]}e.number=n;e.id=n+(e.d?'D':'A')};return {grid,words,paths,items,signature};}
throw Error('Could not generate fresh crossword');}
function resolve(players){let alive=players.filter(p=>p.hp>0);let events=[];let totals=new Map(alive.map(p=>[p.id,0]));for(const p of alive)for(const [id,n] of Object.entries(p.plan.attacks)){if(n){totals.set(id,(totals.get(id)||0)+n);events.push({from:p.name,to:players.find(q=>q.id===id).name,damage:n})}}let results=alive.map(p=>{let incoming=totals.get(p.id),blocked=Math.min(incoming,p.plan.shield),damage=incoming-blocked; p.hp=Math.max(0,p.hp-damage);return {name:p.name,incoming,blocked,hp:p.hp}});return {events,results}}
function damagePower(streak,length=4){return (length-3)*2**Math.min(20,Math.max(0,streak-1))}
function guardAmounts(p,maxHp,power){let heal=Math.min(maxHp-p.hp,power),shield=Math.min(maxHp-p.shield,power-heal);return {heal,shield}}
function recover(p,maxHp,power){let {heal,shield}=guardAmounts(p,maxHp,power);p.hp+=heal;p.shield+=shield;return `guarded +${heal} HP, +${shield} shield`}
function resetMatch(r,players){r.players=players;r.match=(r.match||0)+1;r.round=0;r.last=null;r.elim=0;r.events=[];r.winners=[];r.maxHp=30+5*(players.length-2);for(const p of players)Object.assign(p,{hp:r.maxHp,shield:0,words:0,damage:0,best:0,streak:0,vote:false,pending:null,eliminated:0,forfeited:false});}
function standings(r){return [...r.scores.values()].sort((a,b)=>b.points-a.points||b.wins-a.wins||b.damage-a.damage||b.words-a.words||a.name.localeCompare(b.name))}
function recordClaim(r,p){for(const q of r.players)if(q!==p)q.streak=0;p.streak=r.last===p.id?p.streak+1:1;r.last=p.id;p.best=Math.max(p.best,p.streak)}
function resetBoard(r){r.round++;r.claimed=[];r.closing=false;for(const p of r.players){p.vote=false;p.pending=null}}
module.exports={SIZE,guardAmounts,resetMatch,standings,bank,recover,recordClaim,resetBoard,damagePower,puzzle,resolve,shuffle};
