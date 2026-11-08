/* ミライ島ランキング: Cloudflare Worker + D1. Browser scores are not cheat-proof. */
const GAME_ORIGIN='https://takuto.murakawa.xyz';
const LIMIT=30,DAILY_LIMIT=8;
function json(data,status=200,origin=''){
 const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
 if(origin===GAME_ORIGIN){headers['access-control-allow-origin']=GAME_ORIGIN;headers['vary']='Origin';}
 return new Response(JSON.stringify(data),{status,headers});
}
function fail(message,status,origin){return json({error:message},status,origin);}
function scoreValue(v){const n=Number(v);return Number.isInteger(n)&&n>=0&&n<=1000?n:null;}
function playerName(v){
 if(typeof v!=='string')return null;
 const x=v.normalize('NFKC').trim();
 if(!x||Array.from(x).length>14||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>]/u.test(x)||/https?:\/\/|www\./i.test(x))return null;
 return x;
}
async function dailyHash(request,env){
 const ip=request.headers.get('cf-connecting-ip')||'unknown';
 const day=new Date().toISOString().slice(0,10);
 const bits=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.HASH_SALT+'|'+day+'|'+ip));
 return {day,key:Array.from(new Uint8Array(bits),v=>v.toString(16).padStart(2,'0')).join('')};
}
const TOP='SELECT id,name,score_tenths FROM scores ORDER BY score_tenths DESC,id ASC LIMIT 30';
export default {
 async fetch(request,env){
  const origin=request.headers.get('origin')||'',url=new URL(request.url);
  if(origin&&origin!==GAME_ORIGIN)return fail('許可されていないアクセスです',403,origin);
  if(request.method==='OPTIONS'){
   if(origin!==GAME_ORIGIN)return fail('不許可',403,origin);
   return new Response(null,{status:204,headers:{'access-control-allow-origin':GAME_ORIGIN,'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'600','vary':'Origin'}});
  }
  if(!env.DB)return fail('ランキングは準備中です',503,origin);
  try {
   if(request.method==='GET'&&url.pathname==='/v1/leaderboard'){
    const {results=[]}=await env.DB.prepare(TOP).all();
    return json({entries:results.map((r,i)=>({rank:i+1,name:r.name,score:r.score_tenths/10})),limit:LIMIT},200,origin);
   }
   if(request.method==='GET'&&url.pathname==='/v1/qualify'){
    const score=scoreValue(url.searchParams.get('score'));
    if(score===null)return fail('得点が正しくありません',400,origin);
    const total=await env.DB.prepare('SELECT COUNT(*) AS n FROM scores').first();
    const bottom=await env.DB.prepare('SELECT score_tenths FROM scores ORDER BY score_tenths DESC,id ASC LIMIT 1 OFFSET 29').first();
    const above=await env.DB.prepare('SELECT COUNT(*) AS n FROM scores WHERE score_tenths>=?').bind(score).first();
    const eligible=total.n<LIMIT||score>bottom.score_tenths;
    return json({eligible,provisionalRank:eligible?Math.min(LIMIT,above.n+1):null,limit:LIMIT},200,origin);
   }
   if(request.method==='POST'&&url.pathname==='/v1/scores'){
    if(origin!==GAME_ORIGIN)return fail('許可されていないアクセスです',403,origin);
    if(!env.HASH_SALT||env.HASH_SALT.length<20)return fail('ランキングは準備中です',503,origin);
    if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return fail('JSONで送信してください',415,origin);
    const raw=await request.text();
    if(raw.length>1024)return fail('入力が長すぎます',413,origin);
    let body;try{body=JSON.parse(raw);}catch{return fail('JSONの内容が正しくありません',400,origin);}
    const name=playerName(body?.name),score=scoreValue(body?.score);
    if(name===null||score===null)return fail('名前または得点を確認してください',400,origin);
    const {day,key}=await dailyHash(request,env);
    const quota=await env.DB.prepare('SELECT used FROM rate_limits WHERE key=?').bind(key).first();
    if((quota?.used||0)>=DAILY_LIMIT)return fail('本日の登録回数の上限です',429,origin);
    const insert=env.DB.prepare('INSERT INTO scores(name,score_tenths) SELECT ?,? WHERE (SELECT COUNT(*) FROM scores)<? OR ?>(SELECT score_tenths FROM scores ORDER BY score_tenths DESC,id ASC LIMIT 1 OFFSET 29) RETURNING id').bind(name,score,LIMIT,score);
    const trim=env.DB.prepare('DELETE FROM scores WHERE id NOT IN (SELECT id FROM scores ORDER BY score_tenths DESC,id ASC LIMIT 30)');
    const results=await env.DB.batch([insert,trim]);
    const id=results[0]?.results?.[0]?.id;
    if(!id)return fail('登録前に順位が更新されました',409,origin);
    await env.DB.prepare('INSERT INTO rate_limits(key,day,used) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET used=used+1').bind(key,day).run();
    const {results:all=[]}=await env.DB.prepare(TOP).all();
    const index=all.findIndex(r=>r.id===id);
    return json({registered:index>=0,rank:index>=0?index+1:null,name,score:score/10},index>=0?201:409,origin);
   }
   return fail('該当するAPIはありません',404,origin);
  } catch (_error) {return fail('ランキングサーバーに接続できません',503,origin);}
 }
};