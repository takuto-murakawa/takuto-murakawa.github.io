/* 島おこし！ミライ島 Ver.1.2：独自制作の相乗効果・ニュース判定。
   セーブ可能な値以外を外部へ送信せず、架空の指標だけで判定する。 */
'use strict';
const IslandGrowth=(()=>{
 const round=n=>Math.round(n*10)/10;
 const change=(state,values)=>{for(const [k,v] of Object.entries(values)){if(k==='need'||k==='housing')state[k]+=v;else state[k]=Math.max(0,Math.min(100,state[k]+v));}};
 // 産業上の相乗効果は、実際に作れるもの・運べるもの・受け入れられるものがそろった時だけ成立。
 // 重複計上を避けるため、個別の収益はすべて小さな上限を設ける。
 const synergies=[
  {id:'farmworks',title:'農業・加工・物流が連動',detail:'農作物を加工して島外へ運べるため、販売の選択肢が広がっています。',test:(s,d)=>s.farm>=56&&s.industry>=54&&s.port>=57&&d.logistics.rate>=.88&&d.labor>=s.need*.91,bonus:(s,d)=>Math.min(1.8,(s.farm-50)*.06+(s.industry-50)*.035)*d.logistics.rate},
  {id:'seaculture',title:'海の産業と観光が連動',detail:'漁業と観光、宿泊の受け入れがつながり、島内での消費が広がっています。',test:(s,d)=>s.fish>=56&&s.tourism>=57&&s.lodging>=54&&d.logistics.rate>=.8,bonus:(s,d)=>Math.min(1.4,(s.fish-50)*.04+(s.tourism-50)*.055)*d.logistics.rate},
  {id:'villagecircle',title:'集落交通と地域活動が連動',detail:'移動しやすさと地域活動がそろい、地域の商いが少しずつ回っています。',test:s=>s.inland>=63&&s.village>=64&&s.culture>=58,bonus:s=>Math.min(1.0,(s.inland+s.village+s.culture-175)*.035)},
  {id:'learningcare',title:'学びと医療の協力が広がる',detail:'医療と教育が充実し、専門職や若い世代が連携しやすくなっています。',test:s=>s.medical>=66&&s.education>=62&&s.hidden?.medical>=57,bonus:()=>0}
 ];
 const evaluate=(state,derived)=>{
  const active=synergies.filter(x=>x.test(state,derived)).map(x=>({...x,income:round(Math.max(0,x.bonus(state,derived)))}));
  return {active,total:round(Math.min(3.5,active.reduce((a,x)=>a+x.income,0)))};
 };
 const milestones=[
  {id:'population',title:'島の人口が1万人を回復！',detail:'仕事・住まい・暮らしの状況が人口変化に結び付いています。',test:(s,p)=>p.pop<10000&&s.pop>=10000},
  {id:'populationplus',title:'人口が開始時より300人増加！',detail:'人口の推移に新しい節目が生まれました。',test:(s,p)=>p.pop<10300&&s.pop>=10300},
  {id:'budget',title:'島の予算が黒字へ回復！',detail:'収支の改善が予算残高に反映されました。',test:(s,p)=>p.money<0&&s.money>=0},
  {id:'savings',title:'島の蓄えが150コインに到達！',detail:'備えが増えました。暮らしや産業への使い道も考えられます。',test:(s,p)=>p.money<150&&s.money>=150},
  {id:'life',title:'暮らしやすさが70に到達！',detail:'医療、教育、交通などへの取り組みが島の暮らしを支えています。',test:(s,p)=>p.life<70&&s.life>=70},
  {id:'industry',title:'産業の元気が60を突破！',detail:'生産・観光・商工業の成果が高まりました。人手や物流にも目を向けましょう。',test:(s,p)=>p.industryScore<60&&s.industryScore>=60},
  {id:'medical',title:'島の医療体制が70に到達！',detail:'医療の拡充が進みました。人手や地域からのアクセスも大切です。',test:(s,p)=>p.medical<70&&s.medical>=70},
  {id:'nature',title:'島の自然環境が75に到達！',detail:'自然を守る取り組みが実を結んでいます。',test:(s,p)=>p.nature<75&&s.nature>=75},
  {id:'transport',title:'港の物流不足が解消！',detail:'以前は運べなかった荷物を、ほぼ輸送できるようになりました。',test:(s,p,d)=>p.shortage>=8&&d.logistics.shortage<=2},
  {id:'regions',title:'島の3地域で暮らしが改善！',detail:'港町、中央、山あいのいずれも生活環境が60以上になりました。',test:(s,p,d)=>p.weakest<60&&d.districts.weakest.score>=60}
 ];
 function snapshot(s,d){return {pop:s.pop,money:s.money,life:s.life,industryScore:s.industryScore,medical:s.medical,nature:s.nature,shortage:d.logistics.shortage,weakest:d.districts.weakest.score};}
 function updateNews(s,previous,derived,turn){
  s.news=Array.isArray(s.news)?s.news:[];s.newsSeen=Array.isArray(s.newsSeen)?s.newsSeen:[];
  s.synergySeen=Array.isArray(s.synergySeen)?s.synergySeen:[];
  const items=[];
  function add(id,title,detail,type){if(s.newsSeen.includes(id))return; s.newsSeen.push(id);const entry={id,title,detail,type,turn:Math.min(24,Math.max(1,turn))};s.news.push(entry);items.push(entry);}
  for(const m of milestones){if(m.test(s,previous,derived))add('milestone:'+m.id,m.title,m.detail,'milestone');}
  for(const combo of evaluate(s,derived).active){if(!s.synergySeen.includes(combo.id)){s.synergySeen.push(combo.id);add('synergy:'+combo.id,'相乗効果：'+combo.title,combo.detail,'synergy');}}
  s.news=s.news.slice(-32);
  return items;
 }
 return {evaluate,snapshot,updateNews,change};
})();
