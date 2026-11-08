/* ミライ島: オプトインのランキング UI。
 * API未設定・通信失敗のときは、既存の結果発表に進む（ゲームの進行を妨げない）。
 */
const IslandRanking=(()=>{
 const api=(window.MIRAI_LEADERBOARD_API||'').trim().replace(/\/+$/,'');
 let checking=false,sending=false,checkSerial=0,provisional=0;
 const ready=()=>/^https:\/\/[^/]+/i.test(api);
 const tenth=()=>Math.round(endAnalysis().avg*10);
 const point=v=>(Number(v)/10).toFixed(1);
 const btn=()=>ready()?'<button class="btn ghost" onclick="IslandRanking.view()">🏆 ランキング TOP30</button>':'';
 async function send(path,options={}){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try {
     const response=await fetch(api+path,{cache:'no-store',signal:controller.signal,...options});
     let data;try{data=await response.json();}catch{data={};}
     if(!response.ok){const e=new Error(data.error||'通信できませんでした');e.status=response.status;throw e;}
     return data;
   } finally {clearTimeout(timer);}
 }
 function end(){
   if(!s||!['ranking-check','ranking-entry'].includes(s.phase))return;
   checkSerial++; checking=false;s.phase='end';save();render();returnToIslandTop();
 }
 async function check(){
   if(!s||s.phase!=='ranking-check'||checking)return;
   if(!ready()){end();return;}
   checking=true;const id=++checkSerial,score=tenth();
   try{
     const data=await send('/v1/qualify?score='+encodeURIComponent(score));
     if(id!==checkSerial||!s||s.phase!=='ranking-check')return;
     if(data.eligible){
       provisional=Number(data.provisionalRank)||0;
       s.phase='ranking-entry';save();render();returnToIslandTop();
     } else end();
   }catch(_){if(id===checkSerial)end();}
   finally{checking=false;}
 }
 function afterFinish(){check();}
 function onResume(){if(s?.phase==='ranking-check')check();else if(s?.phase==='ranking-entry'&&!ready())end();}
 function message(msg){
   const el=document.getElementById('ranking-error');
   if(el){el.textContent=msg;el.hidden=false;}
 }
 async function submit(ev){
   ev?.preventDefault?.();
   if(s?.phase!=='ranking-entry'||sending)return false;
   const input=document.getElementById('ranking-name');
   const name=(input?.value||'').normalize('NFKC').trim();
   if(!name||Array.from(name).length>14){message('ニックネームは1〜14文字で入力してください。');return false;}
   if(/[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(name)||/https?:\/\/|www\./i.test(name)){message('名前に使えない文字列が含まれています。');return false;}
   sending=true;const button=document.getElementById('ranking-submit');
   if(button){button.disabled=true;button.textContent='登録しています…';}
   try{
     const data=await send('/v1/scores',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,score:tenth()})});
     if(!s||s.phase!=='ranking-entry')return false;
     s.rankingResult={name:data.name||name,rank:Number(data.rank)||null,score:endAnalysis().avg};
     end();
   }catch(err){
     if(err.status===409){message('登録直前に順位が変わりました。結果発表へ進んでください。');if(button){button.textContent='結果発表へ';button.onclick=()=>end();button.type='button';}}
     else message(err.message||'登録できませんでした。通信環境を確認するか、登録せず進んでください。');
   }finally{
     sending=false;
     if(button&&!s?.rankingResult){button.disabled=false;if(button.type!=='button')button.textContent='ランキングに登録する';}
   }
   return false;
 }
 function screen(){
   const score=tenth();
   if(s?.phase==='ranking-check')return '<div class="shell"><main class="main ranking-page"><section class="panel ranking-qualify"><p class="eyebrow">6年間の島づくりが終了！</p><h1>ランキングを確認しています…</h1><p class="lead">あなたの最終評価を上位30位と照合中です。</p><button class="btn secondary" onclick="IslandRanking.skip()">結果発表へ進む</button></section></main></div>';
   return `<div class="shell"><main class="main ranking-page"><section class="panel ranking-qualify"><p class="eyebrow">6年間の島づくりが終了！</p><div class="ranking-trophy">🏆</div><h1>ハイスコア達成！</h1><p class="lead">ランキングに入れるチャンスです！</p><div class="ranking-score"><strong>${point(score)}点</strong>${provisional?'<span>暫定 '+provisional+'位</span>':''}</div><form onsubmit="return IslandRanking.submit(event)"><label for="ranking-name">公開するニックネーム（14文字以内）</label><input id="ranking-name" type="text" maxlength="28" autocomplete="off" required placeholder="例：島づくり名人"><p class="micro-note">名前と得点はランキングに公開されます。登録は任意です。同点の場合は先着順です。</p><p class="ranking-error" id="ranking-error" role="alert" hidden></p><button id="ranking-submit" class="btn" type="submit">ランキングに登録する</button></form><button class="btn secondary" onclick="IslandRanking.skip()">登録せず結果発表へ</button></section></main></div>`;
 }
 function badge(){
   if(!s?.rankingResult)return '';
   const r=s.rankingResult;
   return `<section class="panel ranking-success"><strong>🏆 ランキング登録完了！</strong><span>${esc(r.name)} ・ ${r.rank?String(r.rank)+'位':'登録済み'} ・ ${Number(r.score).toFixed(1)}点</span></section>`;
 }
 async function view(){
   if(!ready())return;
   document.getElementById('ranking-board')?.remove();
   const root=document.createElement('div');
   root.className='overlay ranking-board-overlay';root.id='ranking-board';
   root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','島づくりランキング');
   root.innerHTML='<div class="modal ranking-board"><h2>🏆 島づくり TOP30</h2><p class="muted" id="ranking-board-content">読み込み中…</p><button class="btn secondary" onclick="IslandRanking.close()">閉じる</button></div>';
   root.addEventListener('click',e=>{if(e.target===root)close();});
   document.body.appendChild(root);
   try{
     const data=await send('/v1/leaderboard');
     if(!document.getElementById('ranking-board-content'))return;
     const entries=Array.isArray(data.entries)?data.entries.slice(0,30):[];
     document.getElementById('ranking-board-content').innerHTML=entries.length?
       '<ol class="ranking-entries">'+entries.map((r,i)=>`<li><span class="ranking-place">${i+1}位</span><span class="ranking-person">${esc(String(r.name||'匿名'))}</span><strong>${Number(r.score).toFixed(1)}点</strong></li>`).join('')+'</ol>':
       '<p>まだ登録されたスコアはありません。最初の挑戦者を目指そう！</p>';
   }catch(_){const p=document.getElementById('ranking-board-content');if(p)p.textContent='ランキングを読み込めませんでした。時間をおいて再度お試しください。';}
 }
 function close(){document.getElementById('ranking-board')?.remove();}
 return {ready,btn,afterFinish,onResume,screen,submit,skip:end,badge,view,close};
})();