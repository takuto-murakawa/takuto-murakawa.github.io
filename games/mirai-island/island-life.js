'use strict';
/* ミライ島独自の暮らしと島産品。外部画像/ライブラリ/通信なし。 */
const IslandLife=(()=>{
 const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
 const round=n=>Math.round(n*10)/10;
 // 施設や交通が各地域の生活に与える影響は異なる。地域別の人口を捏造しない。
 function districts(state,medicalAccess=state.medical){
  const {port,inland,education,infra,nature,village,fish}=state;
  const medical=medicalAccess;
  const arr=[
   {id:'harbor',name:'港町',score:round(clamp(.31*port+.16*inland+.18*medical+.20*infra+.15*fish)),detail:'船と水産業が身近。港と水道・道路の状態が暮らしに影響します。',strong:'港・水産・インフラ'},
   {id:'plain',name:'中央の平野',score:round(clamp(.27*medical+.25*education+.20*infra+.18*inland+.10*nature)),detail:'田畑と住宅、学校が集まります。医療と教育、島内交通が暮らしの鍵です。',strong:'医療・教育・交通'},
   {id:'mountain',name:'山あいの集落',score:round(clamp(.35*village+.24*medical+.19*infra+.12*nature+.10*inland)),detail:'集落からの通院や買い物には移動が必要。交通と医療の影響が大きくなります。',strong:'集落への交通・医療'}
  ];
  const min=arr.reduce((a,b)=>a.score<b.score?a:b);
  return {items:arr,weakest:min,spread:round(Math.max(...arr.map(a=>a.score))-min.score)};
 }
 // 島の産品は複数の実力から自然に生まれ、輸送不足なら売上も減る。
 function specialties(state,logistics){
  const satisfaction=logistics?.rate??1;
  const items=[
   {id:'harvest',name:'実りの島便',place:'中央の平野',icon:'grain',detail:'農産物を島外へ届ける',amount:Math.max(0,(state.farm-49)*.16)*Math.min(1,state.port/65)*satisfaction*Math.min(1,state.nature/62)},
   {id:'seafood',name:'潮風の加工品',place:'港町',icon:'fish',detail:'漁獲と加工技術を組み合わせる',amount:Math.max(0,(state.fish-49)*.15)*Math.min(1,state.industry/60)*Math.min(1,state.port/65)*satisfaction},
   {id:'walk',name:'森と文化の散策',place:'山あいの集落',icon:'leaf',detail:'自然と文化を生かした体験',amount:Math.max(0,(state.culture-49)*.13)*Math.min(1,state.tourism/65)*Math.min(1,state.nature/74)*Math.min(1,state.inland/60)*Math.min(1,state.lodging/60)}
  ].map(x=>({...x,income:round(Math.min(2.5,x.amount))}));
  return {items,active:items.filter(x=>x.income>=.7),total:round(items.filter(x=>x.income>=.7).reduce((n,x)=>n+x.income,0))};
 }
 function seasonArt(state){
  const index=((state.turn||1)-1)%4;
  // 固定SVG。ランダム抽選しないため、セーブしても絵が変わらない。
  const boat=`<g class="sea-boat" transform="translate(610 140)"><path d="M-14 1H14L8 10H-9Z" fill="#af795c" stroke="#426776" stroke-width="1.7"/><path d="M-2 0V-15L9-1Z" fill="#f9efd3" stroke="#426776" stroke-width="1.7"/><path d="M-18 13q7-3 13 0t14 0t13 0" fill="none" stroke="#f5ffff" stroke-width="2"/></g>`;
  const bird=state.nature>=69?`<g class="sky-bird" transform="translate(455 81)" fill="none" stroke="#fff7e8" stroke-linecap="round" stroke-width="3"><path d="M-17 0q8-10 17 0q8-10 18-1"/><path d="M-10 9q7-8 14 0"/></g>`:'';
  const harvest=index===2?`<g fill="#b88757" opacity=".88"><circle cx="306" cy="205" r="3"/><circle cx="316" cy="210" r="3"/><circle cx="328" cy="216" r="3"/></g>`:'';
  const winter=index===3?`<g fill="#f5f9f8" opacity=".92"><path d="M135 62l16 5l-9 6Z"/><path d="M404 149l18 8l-12 2Z"/><circle cx="198" cy="112" r="2"/><circle cx="444" cy="200" r="2"/></g>`:'';
  const summer=index===1?`<g fill="#e3c779"><circle cx="277" cy="236" r="2.3"/><circle cx="287" cy="240" r="2.3"/><circle cx="310" cy="248" r="2.3"/></g>`:'';
  return boat+bird+harvest+winter+summer;
 }
 return {districts,specialties,seasonArt};
})();
