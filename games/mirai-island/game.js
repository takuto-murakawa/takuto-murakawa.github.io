'use strict';
const MAX_TURNS=24;const SAVE='miraijima_orig_v11',V10_SAVE='miraijima_orig_v10',LATEST_SAVE='miraijima_orig_v05',PREV_SAVE='miraijima_orig_v04',OLDER_SAVE='miraijima_orig_v03',OLD_SAVE='miraijima_orig_v02';const seasons=['春','夏','秋','冬'];const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));const round=n=>Math.round(n*10)/10;const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const P=[
['port','港の整備','産業',25,2,2,'港の輸送能力を上げる。建設費と維持費が必要。',{port:14,nature:-1}],
['machine','農業の機械化','産業',15,2,1,'生産性を上げ、人手不足を緩和。設備維持費が発生。',{farm:10,need:-160}],
['greenfarm','環境にやさしい農業','産業',11,1,1,'農地と自然を守り、農業を強くする。人手が必要。',{farm:6,nature:7,need:35}],
['fish','漁業・水産加工支援','産業',15,1,1,'漁業が発展。働き手の需要と環境負荷も増える。',{fish:11,industry:2,need:60,nature:-3}],
['hotel','宿泊施設の整備','産業',20,2,2,'観光客を迎える力が増加。働き手と維持費が必要。',{tourism:13,lodging:18,need:90,nature:-5}],
['heritage','歴史・文化観光','産業',11,1,1,'島の歴史と文化を生かす。観光の仕事も増える。',{tourism:8,culture:9,need:45}],
['company','企業誘致','産業',26,2,1,'新しい雇用と産業。人手、住宅、環境の制約あり。',{industry:17,need:135,nature:-4}],
['localbiz','地元企業への支援','産業',13,1,.5,'地元の仕事を増やす。人手を確保できるかが鍵。',{industry:8,need:60}],
['house','移住者向け住宅','暮らし',19,2,1,'住める人数を増やす。維持費とインフラ負荷あり。',{housing:500,infra:-2}],
['vacant','空き家の再生','暮らし',10,1,.4,'比較的安く住まいを確保。増やせる数には限りがある。',{housing:220}],
['school','子育て・教育支援','暮らし',17,2,2,'教育・子育て環境を改善。人手と維持費が必要。',{education:13,need:40}],
['hospital','医療体制の充実','暮らし',19,1,2.2,'医療体制を改善。診療へのアクセスと人材確保が鍵。',{medical:13,need:55}],
['bus','地域公共交通の充実','暮らし',15,1,1.5,'通勤・通院や観光を支える。維持費と運行する人手が必要。',{inland:12,village:11,need:20}],
['repair','インフラの更新','暮らし',18,2,-.5,'水道・道路などの老朽化を改善。事故の備えになる。',{infra:15}],
['energy','再エネ・省エネ','暮らし',19,3,-2,'初期投資は高いが将来の支出と環境負荷を減らす。',{nature:9}],
['reorganize','公共施設の再編','財政',4,1,-1.8,'公共サービスを統合して節約。行き過ぎると通院などに臨時費用。',{medical:-4,education:-3,village:-6}],
['festival','地域の祭り・活動支援','財政',7,0,.5,'地域文化と観光の魅力を高める。',{culture:12,tourism:3}],
['cutbus','交通路線の縮小','財政',2,0,-2,'移動手段を減らして節約。ただし交通不足で通勤・通院や経済に影響。',{inland:-8,village:-10}]
 ].map(a=>({id:a[0],name:a[1],cat:a[2],cost:a[3],delay:a[4],upkeep:a[5],desc:a[6],effect:a[7]}));
// 6年目も意味のある判断を残す、小さな短期政策（17季以降）。
P.push(
 {id:'quickmarket',name:'島産品の販売促進',cat:'産業',cost:3,delay:0,upkeep:0,late:true,desc:'輸送能力が十分なら、今季の島産品を売り込んで臨時収入。',effect:{}},
 {id:'quickclinic',name:'医療スタッフの短期応援',cat:'暮らし',cost:5,delay:0,upkeep:0,late:true,desc:'今季の医療負担を軽減。恒久的な医療施設の充実とは異なる。',effect:{}},
 {id:'quickferry',name:'臨時の船便を確保',cat:'暮らし',cost:5,delay:0,upkeep:0,late:true,desc:'今季の輸送力を補う。恒久的な港湾施設の拡張にはならない。',effect:{}},
 {id:'quickbiz',name:'島の仕事相談会',cat:'産業',cost:4,delay:0,upkeep:0,late:true,desc:'仕事と交流の機会をつくり、小さな商工業の改善を目指す。',effect:{industry:2,culture:2}},
 {id:'quickops',name:'施設運営の見直し',cat:'財政',cost:3,delay:0,upkeep:-.6,late:true,desc:'維持費を少し抑える。費用削減には調整のための支出が必要。',effect:{village:-1}},
 {id:'teleclinic',name:'巡回診療・遠隔医療の導入',cat:'暮らし',cost:11,delay:1,upkeep:.9,desc:'集落から医療を利用しやすくする。病院の代わりにはならず、スタッフが必要。',effect:{medical:6,village:3,need:20}},
 {id:'onrequestbus',name:'予約型交通への転換',cat:'暮らし',cost:9,delay:1,upkeep:.4,desc:'少人数の集落移動や通院を支える。大量の通勤・観光輸送には向かない。',effect:{inland:4,village:7,need:12}}
);
// 大小の規模を選べる政策。費用・成果・維持費・完成時期は比例させず、拡大にリスクを設ける。
const SCALE_IDS=new Set(['port','hospital','bus','hotel','company','repair','house']);
const SCALES={small:{label:'小規模',cost:.62,effect:.55,upkeep:.65,delay:-1},normal:{label:'標準',cost:1,effect:1,upkeep:1,delay:0},large:{label:'大規模',cost:1.77,effect:1.52,upkeep:1.85,delay:1}};
let facilityCounter=0;
const E=[
{id:'storm',title:'台風で港に被害！',kind:'bad',weight:3,can:()=>true,options:[['急いで修理する','予算-6、港-1',s=>{s.money-=6;s.port-=1;}],['応急対応で乗り切る','予算-2、港-5（2季節）',s=>{s.money-=2;s.temp.push({key:'port',delta:-5,until:s.turn+2});}]]},
{id:'snow',title:'大雪で交通に影響',kind:'bad',weight:2,can:s=>[2,3].includes((s.turn-1)%4),options:[['除雪を強化','予算-5、交通-1',s=>{s.money-=5;s.inland-=1;}],['自然回復を待つ','交通-6（1季節）',s=>s.temp.push({key:'inland',delta:-6,until:s.turn+1})]]},
{id:'boom',title:'観光ブーム到来！',kind:'good',weight:3,can:()=>true,options:[['受け入れに投資','予算-4、観光+3、宿泊+2',s=>{s.money-=4;s.tourism+=3;s.lodging+=2;}],['今ある施設で迎える','宿泊・交通に応じた臨時収入',s=>s.money+=round(7*Math.min(1,s.lodging/65,s.inland/60))]]},
{id:'harvest',title:'農作物が豊作！',kind:'good',weight:2,can:s=>(s.turn-1)%4===2,options:[['産品を出荷する','農業と港に応じて臨時収入',s=>s.money+=round(4+s.farm/25*Math.min(1,s.port/60))]]},
{id:'cropbad',title:'農作物が不作に',kind:'bad',weight:2,can:s=>(s.turn-1)%4===2,options:[['支援して影響を抑える','予算-5、農業-1',s=>{s.money-=5;s.farm-=1;}],['状況を見守る','農業-4（自然が豊かなら-2）',s=>s.farm-=s.nature>70?2:4]]},
{id:'fishup',title:'今年は魚が豊富！',kind:'good',weight:2,can:()=>true,options:[['販路を広げる','漁業・港に応じた臨時収入',s=>s.money+=round(2+s.fish/20*Math.min(1,s.port/60))]]},
{id:'fishdown',title:'漁獲量が落ち込んだ',kind:'bad',weight:2,can:()=>true,options:[['漁業を支援','予算-4、漁業-1',s=>{s.money-=4;s.fish-=1;}],['見守る','漁業-4',s=>s.fish-=4]]},
{id:'youth',title:'若者の島外流出',kind:'bad',weight:2,can:s=>s.jobs<62||s.education<58,options:[['学び直し・就職を支援','予算-6、仕事・教育の改善',s=>{s.money-=6;s.education+=3;s.industry+=2;}],['すぐには対応しない','人口-35',s=>s.pop-=35]]},
{id:'newbiz',title:'新しい企業が進出を検討',kind:'good',weight:2,can:s=>s.port>54,options:[['進出を後押し','予算-7、商工業+6、人手需要+55',s=>{s.money-=7;s.industry+=6;s.need+=55;}],['誘致を見送る','変化なし',()=>{}]]},
{id:'exit',title:'工場が事業を縮小',kind:'bad',weight:2,can:s=>s.industry>45,options:[['地元企業の再就職を支援','予算-6、商工業-2、必要人手-40',s=>{s.money-=6;s.industry-=2;s.need-=40;}],['民間の対応を待つ','商工業-6、必要人手-90',s=>{s.industry-=6;s.need-=90;}]]},
{id:'doctor',title:'診療所で人手が不足',kind:'bad',weight:2,can:s=>s.medical>40,options:[['人員確保に予算を使う','予算-5、医療-1',s=>{s.money-=5;s.medical-=1;}],['対応を見送る','医療-5',s=>s.medical-=5]]},
{id:'water',title:'水道施設に故障が発生',kind:'bad',weight:3,can:s=>s.infra<78,options:[['早く復旧する','予算-6、インフラ-1',s=>{s.money-=6;s.infra-=1;}],['応急修理する','予算-2、インフラ-5',s=>{s.money-=2;s.infra-=5;}]]},
{id:'shipfuel',title:'船の運航費用が上昇',kind:'bad',weight:2,can:()=>true,options:[['運航を支える','予算-5、交通-1',s=>{s.money-=5;s.port-=1;}],['負担増を受け入れる','港-5（2季節）',s=>s.temp.push({key:'port',delta:-5,until:s.turn+2})]]},
{id:'buscrisis',title:'交通事業者が経営難に',kind:'bad',weight:2,can:()=>true,options:[['運行を支援','予算-6、地域交通を守る',s=>s.money-=6],['路線を整理','島内交通-5、集落アクセス-6',s=>{s.inland-=5;s.village-=6;}]]},
{id:'festival',title:'地域の祭りが大成功！',kind:'good',weight:2,can:()=>true,options:[['地域の盛り上がりを生かす','地域文化+3、観光+2',s=>{s.culture+=3;s.tourism+=2;}]]},
{id:'bird',title:'珍しい鳥が話題に！',kind:'good',weight:2,can:s=>s.nature>45,options:[['自然を守りながらPR','観光+3、自然+1',s=>{s.tourism+=3;s.nature+=1;}]]},
{id:'pollution',title:'観光地の自然環境が心配',kind:'bad',weight:2,can:s=>s.tourism>54,options:[['環境対策に取り組む','予算-6、自然+2',s=>{s.money-=6;s.nature+=2;}],['観光優先で対応を後回し','自然-5、観光-2',s=>{s.nature-=5;s.tourism-=2;}]]}
,
{id:'ferry_long',title:'海の便が3季節にわたり減る見通し',kind:'long',weight:2,can:s=>!s.arc&&!(s.arcSeen||[]).includes('ferry_long')&&s.turn<=21,options:[
 ['航路の維持を支援','今後3季節、毎季3コインを使い物流を守る',s=>startArc('ferry_long','支援',3)],
 ['運航規模を抑える','今後3季節、港の輸送能力が一時的に下がる',s=>startArc('ferry_long','縮小',3)]
]},
{id:'tourism_long',title:'3季節にわたる観光の注目',kind:'long',weight:2,can:s=>!s.arc&&!(s.arcSeen||[]).includes('tourism_long')&&s.turn<=21&&s.tourism>48,options:[
 ['受け入れに備える','先に予算-5。宿泊や交通が整っていれば収入が増える',s=>{s.money-=5;startArc('tourism_long','強化',3);}],
 ['無理のない受け入れ','収入は控えめ。自然環境への負担も小さい',s=>startArc('tourism_long','控えめ',3)]
]},
{id:'water_long',title:'水道設備の不調が続くおそれ',kind:'long',weight:2,can:s=>!s.arc&&!(s.arcSeen||[]).includes('water_long')&&s.turn<=21&&s.infra<75,options:[
 ['早めに対策する','予算-6。今後3季節の老朽化による負担を抑える',s=>{s.money-=6;startArc('water_long','対策',3);}],
 ['応急処置で乗り切る','今季の出費なし。今後3季節、設備状態が下がる',s=>startArc('water_long','応急',3)]
]}

];
// 新規の好機・秘密条件。すべて本作オリジナルの架空の出来事。
E.push(
 {id:'bulkorder',title:'島の産品にまとまった注文！',kind:'good',weight:3,can:s=>s.farm>52||s.fish>52,options:[['出荷を増やす','輸送余力に応じて予算+4〜10',s=>s.money+=round(4+6*IslandSystems.logistics(s,k=>s[k]).rate)],['品質を高める','商工業+3、地域ブランドが育つ',s=>{s.industry+=3;s.hidden.brand+=7;}]]},
 {id:'ferryextra',title:'船の臨時増便が決まった！',kind:'good',weight:2,can:s=>s.port>=51,options:[['島の産品を運ぶ','今季の臨時収入+6、島外の信頼+2',s=>{s.money+=6;s.hidden.trust+=2;}],['観光客を迎える','観光+3、宿泊+1',s=>{s.tourism+=3;s.lodging+=1;}]]},
 {id:'startup',title:'若い起業家が新事業に挑戦！',kind:'good',weight:2,can:s=>s.education>=48,options:[['小さく支援する','予算-3、商工業+4',s=>{s.money-=3;s.industry+=4;}],['地域の協力をつなぐ','地域文化+2、若者の挑戦力+5',s=>{s.culture+=2;s.hidden.youth+=5;}]]},
 {id:'medapplicant',title:'島の診療所へ応募者が！',kind:'good',weight:2,can:s=>s.medical>=49,options:[['受入れを支援','予算-3、医療+5、働き手需要+15',s=>{s.money-=3;s.medical+=5;s.need+=15;}],['島外との協力を進める','医療+2、医療連携力+5',s=>{s.medical+=2;s.hidden.medical+=5;}]]},
 {id:'prize',title:'島産品が地域賞を受賞！',kind:'good',weight:2,can:s=>Math.max(s.farm,s.fish,s.industry)>=54,options:[['販売を広げる','予算+6、地域ブランド+4',s=>{s.money+=6;s.hidden.brand+=4;}],['小さな作り手を応援','農業+2、漁業+2',s=>{s.farm+=2;s.fish+=2;}]]},
 {id:'collab',title:'島外企業から共同開発の提案！',kind:'good',weight:2,can:s=>s.industry>=53,options:[['共同開発を進める','予算-4、商工業+5、研究力+6',s=>{s.money-=4;s.industry+=5;s.hidden.research+=6;}],['まずは取引を始める','予算+5、島外の信頼+5',s=>{s.money+=5;s.hidden.trust+=5;}]]},
 {id:'culturalvisit',title:'島外から祭りの参加者が！',kind:'good',weight:2,can:s=>s.culture>=52,options:[['交流を楽しむ','文化+3、地域の結束+3',s=>{s.culture+=3;s.hidden.cohesion+=3;}],['観光ともつなぐ','観光+4、自然-1',s=>{s.tourism+=4;s.nature-=1;}]]},
 {id:'vacantmatch',title:'空き家を生かす新しい動き！',kind:'good',weight:2,can:s=>s.housing-s.pop<=550,options:[['住まいとして整える','住宅+140人分、予算-3',s=>{s.housing+=140;s.money-=3;}],['交流と仕事の拠点にする','文化+3、商工業+2、予算-2',s=>{s.culture+=3;s.industry+=2;s.money-=2;}]]},
 {id:'medmedia',title:'特別ニュース：島の医療が注目！',kind:'secret',secretChance:0.52,weight:2,can:s=>s.turn>=7&&s.hidden?.medical>=61&&s.medical>=68&&s.hidden?.medicalStreak>=2,options:[['島外の医療人材とつなぐ','医療+4、島外の信頼+8',s=>{s.medical+=4;s.hidden.trust+=8;}],['共同研究を深める','医療+2、研究力+10',s=>{s.medical+=2;s.hidden.research+=10;}]]},
 {id:'legendarygoods',title:'秘密の好機：島産品が全国で評判！',kind:'secret',secretChance:0.47,weight:2,can:s=>s.hidden?.brand>=65&&s.port>=56&&s.farm>=54&&s.fish>=53,options:[['広く販売する','臨時収入+10、島外の信頼+5',s=>{s.money+=10;s.hidden.trust+=5;}],['品質と自然を守る','自然+3、産業+3',s=>{s.nature+=3;s.industry+=3;}]]},
 {id:'youngreturn',title:'秘密の好機：若者が島に帰ってきた！',kind:'secret',secretChance:0.58,weight:2,can:s=>s.hidden?.youth>=60&&s.housing-s.pop>=110&&s.jobs>=51,options:[['新事業を応援','商工業+4、働き手+15人相当の仕事増',s=>{s.industry+=4;s.need+=15;s.pop=Math.min(s.housing,s.pop+16);}],['学びを地域へ広げる','教育+4、文化+2',s=>{s.education+=4;s.culture+=2;}]]},
 {id:'rarebreeding',title:'秘密の発見：森に珍しい生き物が！',kind:'secret',secretChance:0.5,weight:2,can:s=>s.hidden?.coexist>=62&&s.nature>=70&&s.farm>=50,options:[['保全と観察を進める','自然+4、観光+2',s=>{s.nature+=4;s.tourism+=2;}],['地域の学びに生かす','教育+3、文化+3',s=>{s.education+=3;s.culture+=3;}]]},
 {id:'islandnetwork',title:'秘密の発見：海を越えた協力の輪！',kind:'secret',secretChance:0.46,weight:2,can:s=>s.hidden?.trust>=63&&s.hidden?.cohesion>=58&&s.port>=55,options:[['共同事業を育てる','予算+6、研究力+5',s=>{s.money+=6;s.hidden.research+=5;}],['地域交流を増やす','文化+5、教育+2',s=>{s.culture+=5;s.education+=2;}]]}
);


// Ver.1.1.2 追加イベント：産業・医療・学び・自然・島外交流の多様な好機。
// 条件は実際の島の状態から決まり、費用を払わない選択も用意する。
E.push(
 {id:'sharedshipping',title:'島の小さな生産者が共同出荷を提案！',kind:'good',weight:2,can:s=>s.farm>=49&&s.fish>=47,options:[['共同出荷を支える','予算-3、港+2、島外の信頼+3',s=>{s.money-=3;apply({port:2});s.hidden.trust+=3;}],['まずは試験便を使う','輸送能力に応じて臨時収入',s=>{s.money+=round(2+5*IslandSystems.logistics(s,k=>s[k]).rate);}]]},
 {id:'telehealth',title:'島外の医療チームが遠隔相談を提案！',kind:'good',weight:2,can:s=>s.medical>=51&&s.education>=50,options:[['相談体制を整える','予算-3、医療+4、医療連携力+4',s=>{s.money-=3;apply({medical:4});s.hidden.medical+=4;}],['研修から始める','教育+2、研究力+3',s=>{apply({education:2});s.hidden.research+=3;}]]},
 {id:'craftmarket',title:'島の工房に島外から注文が届いた！',kind:'good',weight:2,can:s=>s.industry>=49&&s.port>=47,options:[['注文を受ける','輸送力に応じて予算+3〜8',s=>{s.money+=round(3+5*IslandSystems.logistics(s,k=>s[k]).rate);s.hidden.trust+=2;}],['商品の改良に取り組む','商工業+3、ブランド力+4',s=>{apply({industry:3});s.hidden.brand+=4;}]]},
 {id:'studentvisit',title:'島外の学生たちが学びにやってきた！',kind:'good',weight:2,can:s=>s.education>=47,options:[['地域の人と交流する','文化+3、地域の結束+4',s=>{apply({culture:3});s.hidden.cohesion+=4;}],['研究活動を手伝ってもらう','教育+2、研究力+4',s=>{apply({education:2});s.hidden.research+=4;}]]},
 {id:'farmrestaurant',title:'島の食材で新しい料理が評判に！',kind:'good',weight:2,can:s=>s.farm>=51&&s.tourism>=48,options:[['島内のお店で広める','観光+3、商工業+2',s=>apply({tourism:3,industry:2})],['島の外へ売り出す','港の余力に応じた予算収入、ブランド力+3',s=>{s.money+=round(2+5*IslandSystems.logistics(s,k=>s[k]).rate);s.hidden.brand+=3;}]]},
 {id:'offseason',title:'静かな季節の島旅が人気に！',kind:'good',weight:2,can:s=>s.tourism>=51&&[0,3].includes((s.turn-1)%4),options:[['長めの滞在を迎える','宿泊能力+3、観光+2、必要な人手+15人',s=>apply({lodging:3,tourism:2,need:15})],['少人数の体験を大切にする','文化+3、自然+2',s=>apply({culture:3,nature:2})]]},
 {id:'repairvolunteers',title:'地域の人たちが施設の点検に協力！',kind:'good',weight:2,can:s=>s.culture>=49&&s.infra<80,options:[['点検活動を後押し','予算-2、インフラ+5、結束力+3',s=>{s.money-=2;apply({infra:5});s.hidden.cohesion+=3;}],['助言を受けて工夫する','インフラ+2、地域の結束+2',s=>{apply({infra:2});s.hidden.cohesion+=2;}]]},
 {id:'ecoguide',title:'自然案内の仲間が新しい散策路を発見！',kind:'good',weight:2,can:s=>s.nature>=60&&s.culture>=50,options:[['案内人を育てる','教育+3、文化+2',s=>apply({education:3,culture:2})],['人数を絞って公開する','観光+2、自然+2',s=>apply({tourism:2,nature:2})]]},
 {id:'logisticschoice',title:'繁忙期の貨物と旅客、どちらを優先？',kind:'mixed',weight:2,can:s=>s.port>=45&&s.tourism>=48&&s.turn>=4,options:[['貨物輸送の調整を支援','予算-3、港+3、島外の信頼+2',s=>{s.money-=3;apply({port:3});s.hidden.trust+=2;}],['旅客の受け入れを優先','観光+3、港-2',s=>apply({tourism:3,port:-2})]]},
 {id:'emptyshop',title:'使われなくなったお店をどう生かす？',kind:'mixed',weight:2,can:s=>s.industry<=70&&s.turn>=5,options:[['若い商いの拠点にする','予算-4、商工業+4、若者の挑戦力+3',s=>{s.money-=4;apply({industry:4});s.hidden.youth+=3;}],['集落の交流場所にする','予算-2、文化+4、集落アクセス+2',s=>{s.money-=2;apply({culture:4,village:2});}]]},
 {id:'renewableoffer',title:'省エネの新技術を試せることに！',kind:'mixed',weight:2,can:s=>s.turn>=6&&s.nature>=48,options:[['先行導入を試す','予算-7、維持費-0.4、自然+2',s=>{s.money-=7;s.maintenance=round(s.maintenance-.4);apply({nature:2});}],['調査と学びから始める','教育+3、研究力+5',s=>{apply({education:3});s.hidden.research+=5;}]]},
 {id:'portfestival',title:'港で新しい交流イベントを開こう！',kind:'mixed',weight:2,can:s=>s.culture>=48&&s.port>=45,options:[['にぎわいを大きくする','予算-4、観光+4、自然-2',s=>{s.money-=4;apply({tourism:4,nature:-2});}],['地域の人が中心になる','予算-2、文化+3、結束力+4',s=>{s.money-=2;apply({culture:3});s.hidden.cohesion+=4;}]]}
);


// Ver.1.2: 島民が自主的に考え、政策以外にも変化を起こす提案。
E.push(
 {id:'citizen_ride',title:'集落の人たちから、乗り合いの提案',kind:'mixed',topic:'島民の提案',weight:3,can:s=>s.village<=64,options:[['準備を少し支援する','予算-3、集落の移動+4、地域文化+1',v=>{v.money-=3;IslandGrowth.change(v,{village:4,culture:1});}],['地域の話し合いを応援する','地域文化+3、地域の結束力+3',v=>{IslandGrowth.change(v,{culture:3});v.hidden.cohesion+=3;}]]},
 {id:'citizen_schoolsea',title:'先生と漁師から、体験授業の提案',kind:'good',topic:'島民の提案',weight:3,can:s=>s.education>=45&&s.fish>=45,options:[['授業の準備を支援する','予算-3、教育+3、地域文化+2',v=>{v.money-=3;IslandGrowth.change(v,{education:3,culture:2});}],['漁師と学校の交流を広げる','教育+1、漁業+2、地域の結束力+2',v=>{IslandGrowth.change(v,{education:1,fish:2});v.hidden.cohesion+=2;}]]},
 {id:'citizen_emptyhouse',title:'島民から、空き家活用の相談',kind:'mixed',topic:'島民の提案',weight:3,can:s=>s.housing-s.pop<650,options:[['住まいとして整備する','予算-4、住まい+110人分',v=>{v.money-=4;IslandGrowth.change(v,{housing:110});}],['交流と学びの場にする','予算-2、教育+2、文化+3',v=>{v.money-=2;IslandGrowth.change(v,{education:2,culture:3});}]]},
 {id:'citizen_health',title:'診療所と住民から、見守り活動の提案',kind:'mixed',topic:'島民の提案',weight:3,can:s=>s.medical>=47,options:[['活動の立ち上げを手伝う','予算-3、医療+2、集落の移動+1',v=>{v.money-=3;IslandGrowth.change(v,{medical:2,village:1});}],['住民同士の協力を後押し','地域文化+3、地域の結束力+4',v=>{IslandGrowth.change(v,{culture:3});v.hidden.cohesion+=4;}]]},
 {id:'citizen_market',title:'港町のみんなで直売市を開きたい！',kind:'good',topic:'島民の提案',weight:3,can:s=>s.farm>=48&&s.fish>=48,options:[['荷物を運び、販売を支える','輸送余力による収入+2〜8',v=>{v.money+=round(2+6*IslandSystems.logistics(v,k=>v[k]).rate);}],['出店者同士の交流を応援','文化+3、商工業+2',v=>IslandGrowth.change(v,{culture:3,industry:2})]]}
);
// Ver.1.2: 四季の好機。発生した時点でどちらを選んでも意味があり、期限や持ち越しはない。
E.push(
 {id:'spring_welcome',title:'春の新しい仲間を迎える会',kind:'good',topic:'春の出来事',weight:3,can:s=>(s.turn-1)%4===0,options:[['仕事の相談会を開く','予算-2、商工業+2、教育+1',v=>{v.money-=2;IslandGrowth.change(v,{industry:2,education:1});}],['地域の交流を応援','文化+3、結束力+2',v=>{IslandGrowth.change(v,{culture:3});v.hidden.cohesion+=2;}]]},
 {id:'spring_greening',title:'春の森づくりに協力者が集まった',kind:'good',topic:'春の出来事',weight:2,can:s=>(s.turn-1)%4===0&&s.nature>=48,options:[['植樹の活動を支える','自然+3、文化+1、予算-2',v=>{v.money-=2;IslandGrowth.change(v,{nature:3,culture:1});}],['自然を学ぶ機会にする','教育+2、自然+1',v=>IslandGrowth.change(v,{education:2,nature:1})]]},
 {id:'summer_harbor',title:'夏の港に人が集まってきた！',kind:'good',topic:'夏の出来事',weight:3,can:s=>(s.turn-1)%4===1&&s.port>=44,options:[['島の店の販売を応援','交通・観光に応じて予算+3〜7',v=>{const r=Math.min(1,v.inland/65,v.tourism/60);v.money+=round(3+4*r);}],['島の文化を伝える','文化+3、観光+1',v=>IslandGrowth.change(v,{culture:3,tourism:1})]]},
 {id:'summer_bus',title:'夏の島内バスに利用者が増加',kind:'mixed',topic:'夏の出来事',weight:2,can:s=>(s.turn-1)%4===1&&s.inland>=47,options:[['増える利用に備える','予算-2、島内交通+3',v=>{v.money-=2;IslandGrowth.change(v,{inland:3});}],['今の便で効率よく運ぶ','臨時収入+3、集落の移動+1',v=>{v.money+=3;IslandGrowth.change(v,{village:1});}]]},
 {id:'autumn_trade',title:'秋の収穫を島の外へ届ける季節！',kind:'good',topic:'秋の出来事',weight:3,can:s=>(s.turn-1)%4===2&&s.farm>=47,options:[['港の余力を生かして出荷','物流に応じた収入+3〜9',v=>{v.money+=round(3+6*IslandSystems.logistics(v,k=>v[k]).rate);}],['生産者同士で品質を高める','農業+2、地域ブランド力+3',v=>{IslandGrowth.change(v,{farm:2});v.hidden.brand+=3;}]]},
 {id:'autumn_culture',title:'秋祭りの新しい担い手が登場',kind:'good',topic:'秋の出来事',weight:2,can:s=>(s.turn-1)%4===2&&s.culture>=45,options:[['祭りの準備を手伝う','予算-2、文化+4',v=>{v.money-=2;IslandGrowth.change(v,{culture:4});}],['若者に出番を任せる','文化+2、若者の挑戦力+3',v=>{IslandGrowth.change(v,{culture:2});v.hidden.youth+=3;}]]},
 {id:'winter_gifts',title:'冬の贈りものに島産品が人気！',kind:'good',topic:'冬の出来事',weight:3,can:s=>(s.turn-1)%4===3&&s.fish>=47&&s.industry>=47,options:[['加工品を島外へ届ける','輸送余力に応じて予算+3〜8',v=>{v.money+=round(3+5*IslandSystems.logistics(v,k=>v[k]).rate);}],['地元の店で楽しむ','商工業+2、文化+2',v=>IslandGrowth.change(v,{industry:2,culture:2})]]},
 {id:'winter_online',title:'冬のオンライン相談が役立ちそう',kind:'mixed',topic:'冬の出来事',weight:2,can:s=>(s.turn-1)%4===3&&s.medical>=45&&s.education>=47,options:[['遠隔相談の工夫を試す','予算-3、医療+2、研究力+3',v=>{v.money-=3;IslandGrowth.change(v,{medical:2});v.hidden.research+=3;}],['地域の集まりを増やす','文化+2、集落の移動+2',v=>IslandGrowth.change(v,{culture:2,village:2})]]}
);
// 既存の能力が連動しているからこそ生まれる一度きりの特別な展開。
E.push(
 {id:'link_farm',title:'農家と加工業者が、共同の出荷を開始！',kind:'good',topic:'政策の相乗効果',weight:4,can:s=>!s.synergyStories?.includes('link_farm')&&IslandGrowth.evaluate(s,derived()).active.some(x=>x.id==='farmworks'),options:[['島外の販路を広げる','物流に応じた収入+6〜10、ブランド力+2',v=>{v.money+=round(6+4*IslandSystems.logistics(v,k=>v[k]).rate);v.hidden.brand+=2;}],['小さな作り手の支援を進める','農業+2、商工業+2',v=>IslandGrowth.change(v,{farm:2,industry:2})]]},
 {id:'link_fish',title:'港の料理と島めぐりが結びついた！',kind:'good',topic:'政策の相乗効果',weight:4,can:s=>!s.synergyStories?.includes('link_fish')&&IslandGrowth.evaluate(s,derived()).active.some(x=>x.id==='seaculture'),options:[['来訪者に魅力を伝える','観光+3、文化+2',v=>IslandGrowth.change(v,{tourism:3,culture:2})],['地域の小さな商売に還元する','予算+5、商工業+1',v=>{v.money+=5;IslandGrowth.change(v,{industry:1});}]]},
 {id:'link_village',title:'集落をつなぐ小さな市が生まれた！',kind:'good',topic:'政策の相乗効果',weight:4,can:s=>!s.synergyStories?.includes('link_village')&&IslandGrowth.evaluate(s,derived()).active.some(x=>x.id==='villagecircle'),options:[['暮らしの支え合いを広げる','集落の移動+2、文化+2',v=>IslandGrowth.change(v,{village:2,culture:2})],['地域の商売を助ける','商工業+2、予算+3',v=>{v.money+=3;IslandGrowth.change(v,{industry:2});}]]},
 {id:'link_care',title:'学校と診療所の共同活動が始まった！',kind:'good',topic:'政策の相乗効果',weight:4,can:s=>!s.synergyStories?.includes('link_care')&&IslandGrowth.evaluate(s,derived()).active.some(x=>x.id==='learningcare'),options:[['地域の学びを充実させる','教育+3、文化+1',v=>IslandGrowth.change(v,{education:3,culture:1})],['医療の連携を深める','医療+2、医療連携力+4',v=>{IslandGrowth.change(v,{medical:2});v.hidden.medical+=4;}]]}
);


// Ver.1.2.2 独自の隠しイベント。期限付きの達成課題・企業別の管理画面は増やさない。
// 発見条件は単一の政策でなく、複数の分野・隠し能力がそろうこと。
E.push(
 {id:'secret_ruralclinic',title:'小さな集落の診療が新しい形に！',kind:'secret',secretChance:0.54,topic:'島のひみつ',weight:2,can:v=>v.turn>=6&&v.medical>=64&&v.village>=62&&v.hidden.medical>=55,options:[['集落との協力を続ける','医療+2、地域の結束+3',v=>{v.medical+=2;v.hidden.cohesion+=3;}],['島外の医療者にも共有する','研究力+4、島外からの信頼+3',v=>{v.hidden.research+=4;v.hidden.trust+=3;}]]},
 {id:'secret_tideknowledge',title:'漁師の知恵から新しい加工品が誕生！',kind:'secret',secretChance:0.55,topic:'島のひみつ',weight:2,can:v=>v.turn>=7&&v.fish>=60&&v.industry>=54&&v.hidden.brand>=55,options:[['生産と品質の改善に生かす','水産業+3、商工業+2',v=>{v.fish+=3;v.industry+=2;}],['小さな販売会を開く','収入+5、地域文化+2',v=>{v.money+=5;v.culture+=2;}]]},
 {id:'secret_commutebridge',title:'集落の通勤・通学をみんなで支える！',kind:'secret',secretChance:0.56,topic:'島のひみつ',weight:2,can:v=>v.turn>=7&&v.inland>=65&&v.village>=66&&v.hidden.cohesion>=55,options:[['乗り合いの仕組みを整える','予算-2、集落交通+4',v=>{v.money-=2;v.village+=4;}],['働く人の相談窓口を作る','教育+2、商工業+2',v=>{v.education+=2;v.industry+=2;}]]},
 {id:'secret_oldmine',title:'古い坑道の資料から歴史の発見！',kind:'secret',secretChance:0.48,topic:'島のひみつ',weight:2,can:v=>v.turn>=7&&v.culture>=64&&v.education>=60&&v.hidden.research>=54,options:[['歴史資料を保存する','文化+4、教育+1',v=>{v.culture+=4;v.education+=1;}],['島内の展示を工夫する','観光+3、文化+2',v=>{v.tourism+=3;v.culture+=2;}]]},
 {id:'secret_repaircircle',title:'水道の点検技術を地域で共有！',kind:'secret',secretChance:0.52,topic:'島のひみつ',weight:2,can:v=>v.turn>=8&&v.infra>=69&&v.hidden.resilience>=57&&v.hidden.research>=53,options:[['点検を続ける','インフラ+3、危機への備え+4',v=>{v.infra+=3;v.hidden.resilience+=4;}],['ほかの島にも伝える','島外の信頼+5、研究力+3',v=>{v.hidden.trust+=5;v.hidden.research+=3;}]]},
 {id:'secret_forestfarm',title:'森と田んぼに珍しい生き物が戻った！',kind:'secret',secretChance:0.48,topic:'島のひみつ',weight:2,can:v=>v.turn>=6&&v.nature>=73&&v.farm>=56&&v.hidden.coexist>=58,options:[['観察と保全を続ける','自然+3、教育+2',v=>{v.nature+=3;v.education+=2;}],['生き物を守る農業を紹介する','農業+3、ブランド力+2',v=>{v.farm+=3;v.hidden.brand+=2;}]]},
 {id:'secret_returningteacher',title:'島で学んだ若者が新しい授業を開始！',kind:'secret',secretChance:0.53,topic:'島のひみつ',weight:2,can:v=>v.turn>=9&&v.education>=68&&v.hidden.youth>=58&&v.medical>=55,options:[['学校での活動を広げる','教育+3、文化+2',v=>{v.education+=3;v.culture+=2;}],['仕事の学びにもつなぐ','商工業+3、研究力+2',v=>{v.industry+=3;v.hidden.research+=2;}]]},
 {id:'secret_heritagecoast',title:'海辺の祭りと風景が話題に！',kind:'secret',secretChance:0.54,topic:'島のひみつ',weight:2,can:v=>v.turn>=7&&v.culture>=63&&v.tourism>=58&&v.nature>=62,options:[['地域の祭りを大切にする','文化+3、結束力+3',v=>{v.culture+=3;v.hidden.cohesion+=3;}],['少人数の体験を育てる','観光+3、自然+1',v=>{v.tourism+=3;v.nature+=1;}]]},
 {id:'secret_smalltown',title:'小さな集落の工夫が注目された！',kind:'secret',secretChance:0.62,topic:'島のひみつ',weight:2,can:v=>v.turn>=8&&v.hidden.cohesion>=59&&v.village>=62&&v.culture>=59,options:[['ほかの集落へ広げる','集落交通+2、文化+3',v=>{v.village+=2;v.culture+=3;}],['暮らしのアイデアを交換する','研究力+3、島外の信頼+3',v=>{v.hidden.research+=3;v.hidden.trust+=3;}]]},
 {id:'secret_slowisland',title:'穏やかな暮らしが新しい魅力に！',kind:'secret',secretChance:0.62,topic:'島のひみつ',weight:2,can:v=>v.turn>=12&&v.pop<10000&&v.life>=64&&v.nature>=71&&v.money>=-35,options:[['暮らしと自然を守る','医療+1、自然+3',v=>{v.medical+=1;v.nature+=3;}],['地域文化を記録する','文化+4、研究力+2',v=>{v.culture+=4;v.hidden.research+=2;}]]},
 {id:'secret_greenport',title:'港の作業から省エネの工夫が生まれた！',kind:'secret',secretChance:0.5,topic:'島のひみつ',weight:2,can:v=>v.turn>=9&&v.port>=65&&v.nature>=65&&v.hidden.research>=57,options:[['設備を少し改良する','予算-3、毎季の維持費-0.4',v=>{v.money-=3;v.maintenance=round(v.maintenance-.4);}],['働く人と技術を共有する','島外の信頼+4、研究力+3',v=>{v.hidden.trust+=4;v.hidden.research+=3;}]]},
 {id:'secret_snownetwork',title:'冬の連携が交通を支えた！',kind:'secret',secretChance:0.65,topic:'島のひみつ',weight:2,can:v=>v.turn>=8&&(v.turn-1)%4===3&&v.inland>=60&&v.infra>=62&&v.hidden.resilience>=54,options:[['次の冬にも備える','インフラ+2、交通+2',v=>{v.infra+=2;v.inland+=2;}],['集落で知恵を共有する','集落交通+3、結束力+2',v=>{v.village+=3;v.hidden.cohesion+=2;}]]}
);

// Ver.1.2.3: 採用された9件の好機。すべて独自の架空イベント。
// 数季節続く効果は addOpportunity() で一括管理し、セーブデータにも保存する。
E.push(
 {id:'secret_safe_living',title:'安心して暮らせる島として全国で話題に！',kind:'secret',secretChance:0.72,topic:'島のひみつ・暮らし',weight:2,
  can:v=>v.medical>=70&&v.inland>=65&&v.life>=70&&v.housing-v.pop>=150,
  options:[['移住の相談を丁寧に受ける','最大3季節、人口+20人／季節（住まいと仕事の状況に応じる）・島外の信頼+5',v=>{v.hidden.trust=clamp(v.hidden.trust+5);addOpportunity(v,{id:'safe_living',title:'安心して暮らせる島',duration:3,pop:20,needJobs:true});}],
           ['島の医療と交通を広く紹介','最大3季節、人口+12人／季節・島外の信頼+9',v=>{v.hidden.trust=clamp(v.hidden.trust+9);addOpportunity(v,{id:'safe_living',title:'安心して暮らせる島',duration:3,pop:12,needJobs:true});}]]},
 {id:'secret_family_migration',title:'子育て世帯に選ばれる島になった！',kind:'secret',secretChance:0.67,topic:'島のひみつ・定住',weight:2,
  can:v=>v.education>=75&&v.medical>=65&&v.housing-v.pop>=250&&v.jobs>=55,
  options:[['家族の移住を受け入れる','最大4季節、人口+12人／季節（住宅余力の範囲内）・文化+1',v=>{IslandGrowth.change(v,{culture:1});addOpportunity(v,{id:'family_migration',title:'子育て世帯の移住',duration:4,pop:12,needJobs:true});}],
           ['学びと子育ての交流を広げる','最大4季節、人口+8人／季節・文化+3',v=>{IslandGrowth.change(v,{culture:3});addOpportunity(v,{id:'family_migration',title:'子育て世帯の移住',duration:4,pop:8,needJobs:true});}]]},
 {id:'secret_national_table',title:'島の産品が全国の食卓に！',kind:'secret',secretChance:0.51,topic:'島のひみつ・産業',weight:2,
  can:v=>v.farm>=65&&v.fish>=60&&v.industry>=60&&v.port>=65&&v.hidden.brand>=65,
  options:[['島外への出荷を増やす','最大3季節、毎季+5コイン（輸送状況による）',v=>addOpportunity(v,{id:'national_table',title:'島産品の全国出荷',duration:3,coins:5,freight:true})],
           ['新しい販路をゆっくり育てる','最大3季節、毎季+3コイン（輸送状況による）・ブランド力+4',v=>{v.hidden.brand=clamp(v.hidden.brand+4);addOpportunity(v,{id:'national_table',title:'島産品の全国出荷',duration:3,coins:3,freight:true});}]]},
 {id:'secret_tech_breakthrough',title:'島の企業が新しい技術を開発！',kind:'secret',secretChance:0.5,topic:'島のひみつ・技術',weight:2,
  can:v=>v.industry>=72&&v.education>=65&&v.hidden.research>=70,
  options:[['試作を事業につなげる','商工業+5、最大3季節、毎季+3コイン',v=>{IslandGrowth.change(v,{industry:5});addOpportunity(v,{id:'tech_breakthrough',title:'新技術の事業化',duration:3,coins:3});}],
           ['研究成果を地域に広める','商工業+3・研究力+4、最大3季節、毎季+2コイン',v=>{IslandGrowth.change(v,{industry:3});v.hidden.research=clamp(v.hidden.research+4);addOpportunity(v,{id:'tech_breakthrough',title:'新技術の事業化',duration:3,coins:2});}]]},
 {id:'secret_highvalue_farm',title:'島の農業が高収益産業に進化！',kind:'secret',secretChance:0.54,topic:'島のひみつ・農業',weight:2,
  can:v=>v.farm>=75&&v.industry>=60&&v.port>=65&&(v.facilities||[]).some(x=>x.id==='machine'&&x.mode==='active'),
  options:[['加工品を島外へ売り出す','最大4季節、毎季+3コイン（輸送状況による）',v=>addOpportunity(v,{id:'highvalue_farm',title:'高付加価値の農業',duration:4,coins:3,freight:true})],
           ['品質と環境にも投資する','自然+2、最大4季節、毎季+2コイン（輸送状況による）',v=>{IslandGrowth.change(v,{nature:2});addOpportunity(v,{id:'highvalue_farm',title:'高付加価値の農業',duration:4,coins:2,freight:true});}]]},
 {id:'secret_community_health',title:'住民主体の健康づくりが広がる！',kind:'secret',secretChance:0.65,topic:'島のひみつ・医療',weight:2,
  can:v=>v.medical>=70&&v.culture>=65&&v.hidden.cohesion>=65,
  options:[['健康づくりの活動を広げる','最大3季節、実効医療+4',v=>addOpportunity(v,{id:'community_health',title:'住民の健康づくり',duration:3,medical:4})],
           ['地域の見守り体制を育てる','地域の結束+3、最大3季節、実効医療+3',v=>{v.hidden.cohesion=clamp(v.hidden.cohesion+3);addOpportunity(v,{id:'community_health',title:'住民の健康づくり',duration:3,medical:3});}]]},
 {id:'secret_learning_circle',title:'島全体で新しい学びの輪が広がった！',kind:'secret',secretChance:0.55,topic:'島のひみつ・教育',weight:2,
  can:v=>v.education>=75&&v.culture>=65&&v.hidden.research>=65,
  options:[['仕事につながる学びを広げる','教育+4・商工業+2・若者の挑戦力+5',v=>{IslandGrowth.change(v,{education:4,industry:2});v.hidden.youth=clamp(v.hidden.youth+5);}],
           ['集落で学びを共有する','教育+4・文化+2・若者の挑戦力+5',v=>{IslandGrowth.change(v,{education:4,culture:2});v.hidden.youth=clamp(v.hidden.youth+5);}]]},
 {id:'secret_cultural_industry',title:'伝統文化が新しい産業に！',kind:'secret',secretChance:0.54,topic:'島のひみつ・文化',weight:2,
  can:v=>v.culture>=75&&v.industry>=60&&v.hidden.brand>=65,
  options:[['工芸品を島外に広める','最大3季節、毎季+3コイン（輸送状況による）',v=>addOpportunity(v,{id:'cultural_industry',title:'文化を生かした産業',duration:3,coins:3,freight:true})],
           ['職人の技を次へつなぐ','文化+2、最大3季節、毎季+2コイン（輸送状況による）',v=>{IslandGrowth.change(v,{culture:2});addOpportunity(v,{id:'cultural_industry',title:'文化を生かした産業',duration:3,coins:2,freight:true});}]]},
 {id:'secret_green_harbor',title:'環境にやさしい港が高く評価された！',kind:'secret',secretChance:0.48,topic:'島のひみつ・環境',weight:2,
  can:v=>v.port>=75&&v.nature>=70&&v.hidden.research>=65&&v.hidden.resilience>=60,
  options:[['省エネ運営を試みる','最大3季節、毎季の維持費負担を最大1コイン軽減・島外の信頼+4',v=>{v.hidden.trust=clamp(v.hidden.trust+4);addOpportunity(v,{id:'green_harbor',title:'省エネ港湾運営',duration:3,upkeepSaving:1});}],
           ['技術を島の内外で共有する','研究力+3・島外の信頼+5、最大3季節、維持費最大0.6軽減',v=>{v.hidden.research=clamp(v.hidden.research+3);v.hidden.trust=clamp(v.hidden.trust+5);addOpportunity(v,{id:'green_harbor',title:'省エネ港湾運営',duration:3,upkeepSaving:.6});}]]}
);

// 継続効果は直近のイベント対応の次の季節から働く。
// プレイ終盤に起こった場合には、残りの季節分だけが有効になる。
function addOpportunity(v, opt){
 if(!Array.isArray(v.opportunities))v.opportunities=[];
 const remaining=Math.min(opt.duration,Math.max(0,MAX_TURNS+1-v.turn));
 if(remaining<=0)return;
 const from=v.turn+1;
 v.opportunities.push({...opt,from,until:from+remaining-1});
}
function currentOpportunities(v,turn=v.turn){return (v.opportunities||[]).filter(x=>Number.isInteger(x.from)&&x.from<=turn&&x.until>=turn);}
function opportunityEffects(v,d,turn=v.turn){
 const active=currentOpportunities(v,turn);
 let pop=0,coins=0,saving=0;
 for(const x of active){
  const freight=x.freight?clamp(d.logistics.rate,0,1):1;
  coins+=(x.coins||0)*freight;
  pop+=(x.pop||0)*(x.needJobs&&d.jobs<45?.65:1);
  saving+=(x.upkeepSaving||0);
 }
 // 複数の好機が重なっても、臨時の増収や人口増が無制限に膨らまないようにする。
 return {active,pop:Math.min(30,Math.round(pop)),coins:round(Math.min(12,coins)),saving:round(Math.min(Math.max(0,v.maintenance),saving))};
}

function hiddenInitial(){return {medical:50,trust:50,brand:50,youth:50,coexist:50,cohesion:50,research:50,resilience:50,medicalStreak:0};}
function updateHidden(before,messages){
 const h=s.hidden||(s.hidden=hiddenInitial());
 const aims={medical:.64*s.medical+.36*(s.education),trust:.5*s.port+.30*s.industry+.2*(s.money>=0?65:40),brand:.3*s.farm+.25*s.fish+.2*s.tourism+.25*s.culture,youth:.44*s.education+.30*s.jobs+.26*(s.housing-s.pop>130?72:45),coexist:.58*s.nature+.42*s.farm,cohesion:.55*s.culture+.45*s.village,research:.50*s.education+.5*s.industry,resilience:.60*s.infra+.40*s.port};
 for(const [k,target] of Object.entries(aims))h[k]=round(clamp((h[k]??50)*.85+target*.15));
 h.medicalStreak=(s.medical>=68&&h.medical>=61)?(h.medicalStreak||0)+1:0;
 if(s.turn===22)messages.push('最後の1年です。完成まで時間のかかる投資は、今からでは間に合わない場合があります。');
}
let audioContext=null;
function playSE(kind){if(!s?.sound)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;audioContext=audioContext||new A();if(audioContext.state==='suspended')audioContext.resume();const start=audioContext.currentTime+.012;
 const tones={tap:[[440,.055]],season:[[370,.075],[490,.13]],good:[[523,.095],[670,.13]],bad:[[290,.13],[245,.16]],ending:[[440,.08],[550,.09],[660,.13],[880,.23]],reveal:[[520,.12],[660,.14],[780,.18]]}[kind]||[[450,.08]];
 let offset=0;for(const [hz,duration] of tones){const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.setValueAtTime(hz,start+offset);g.gain.setValueAtTime(.0001,start+offset);g.gain.exponentialRampToValueAtTime(.052,start+offset+.015);g.gain.exponentialRampToValueAtTime(.0001,start+offset+duration);o.connect(g);g.connect(audioContext.destination);o.start(start+offset);o.stop(start+offset+duration+.018);offset+=duration*.78;}}
 catch(e){} }
function toggleSound(){s.sound=!s.sound;save();render();if(s.sound)playSE('tap');}

// 季節が変わった時やイベント終了後だけ先頭に戻す（政策選択中の操作では戻さない）。
// iframe内部と通常ページの両方に対応し、スクロール自体が無い環境では無害。
function returnToIslandTop(){
 const go=()=>{
  try{if(typeof window.scrollTo==='function')window.scrollTo({top:0,left:0,behavior:'instant'});}catch(e){try{window.scrollTo(0,0);}catch(_) {}}
  const root=document.scrollingElement||document.documentElement;
  if(root)root.scrollTop=0;
  if(document.body)document.body.scrollTop=0;
 };
 go();
 if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(go);
}
function closeRecap(){s.recap=null;save();render();returnToIslandTop();if(s.event)playSE('tap');}
function recapUI(){if(!s.recap)return '';const a=s.recap;return `<div class="overlay recap-overlay" role="dialog" aria-modal="true" aria-label="季節の報告"><div class="modal recap-modal"><p class="eyebrow">季節が進みました</p><h2 class="season-roll">${esc(timeName(a.turn))} → ${esc(timeName(Math.min(MAX_TURNS,a.turn+1)))}</h2><div class="recap-numbers"><div>人口 <strong>${a.deltaPop>=0?'+':''}${f(a.deltaPop)}人</strong></div><div>予算 <strong>${a.deltaMoney>=0?'+':''}${f(a.deltaMoney)}</strong></div></div><ul>${a.messages.slice(0,3).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${a.news?.length?`<div class="recap-news"><strong>島のニュース速報</strong>${a.news.slice(0,2).map(n=>`<p>${esc(n)}</p>`).join('')}</div>`:''}<button class="btn" onclick="closeRecap()">${s.event?((s.eventBatch?.total||1)>1?`今季の出来事 ${s.eventBatch.total}件を見る`:'出来事を確認する'):'次の季節へ進む'} →</button></div></div>`;}
function futureSelect(v){if(!['growth','life','nature','connections'].includes(v))return;s.future=v;save();render();playSE('tap');}
// 各分野は「最後の水準60%・改善25%・持続性15%」で採点する。
// 係数と基準点はゲームバランス用の架空設定で、実際の自治体の評価ではない。
const SCORE_KEYS=['人口・定住','財政','暮らし','雇用','産業','交通・物流','自然・文化','地域の均衡'];
const SCORE_FACTORS=[.045,.095,1.5,1.5,1.6,1.4,1.3,1.7];
function scoreMetrics(){
 const d=derived(),areas=d.districts;
 return [s.pop,s.money,d.life,d.jobs,d.ind,
  d.transport+12*(d.logistics.rate-1),(.5*s.nature+.5*s.culture),areas.weakest.score-.3*areas.spread];
}
function scoreReference(){
 // 初期状態は施設の配置を含めて固定。後からゲームを再開しても基準点は変えない。
 return [10000,102,58.4,47.1984,41.2474,55,57.5,55.17];
}
function scoreSustainability(){
 const d=derived(),b=forecastBalance().baseline;
 const scarce=Math.max(0,s.need-d.labor),extra=Math.max(0,d.labor-s.need),gap=d.districts.spread;
 return [
   clamp(62+Math.min(15,(s.housing-s.pop)/30)+Math.min(12,Math.max(-12,b))-.035*scarce),
   clamp(58+1.8*b-(s.money<0?Math.min(25,-s.money*.09):0)),
   clamp(55+.95*(Math.min(d.medicalAccess,eff('inland'),eff('education'),eff('infra'),eff('village'))-50)),
   clamp(68-.045*scarce-.014*Math.max(0,extra-180)),
   clamp(64-30*(1-d.logistics.rate)-.05*scarce),
   clamp(58+.6*(Math.min(eff('port'),eff('inland'),eff('village'))-50)-22*(1-d.logistics.rate)),
   clamp(56+.45*(Math.min(s.nature,s.culture)-50)),
   clamp(58+.6*(d.districts.weakest.score-50)-.4*gap)
 ];
}
function endAnalysis(){
 const reference=s.baselineMetrics||scoreReference();
 const now=scoreMetrics(), sustain=scoreSustainability();
 const old=s.performanceLog||[];
 const earlier=old.slice(0,Math.min(4,old.length));
 const later=old.slice(-4);
 const levels=SCORE_KEYS.map((key,i)=>{
  const diff=now[i]-reference[i],slope=SCORE_FACTORS[i];
  const early=earlier.map(v=>v.metrics?.[i]??(i===0?v.pop:i===1?v.money:NaN)).filter(Number.isFinite);
  const late=later.map(v=>v.metrics?.[i]??(i===0?v.pop:i===1?v.money:NaN)).filter(Number.isFinite);
  const trend=early.length&&late.length?late.reduce((a,b)=>a+b,0)/late.length-early.reduce((a,b)=>a+b,0)/early.length:0;
  // 成果に十分な差が生まれるよう、初期値からの改善と悪化を対称に扱う。
  // 6年間を通じて成績が伸びたかも評価し、単なる初期財政残高を高得点の理由にしない。
  const level=clamp(54+1.36*slope*diff);
  const progress=clamp(42+slope*(1.48*diff+.26*trend));
  const result=clamp(.60*level+.25*progress+.15*sustain[i]);
  return [key,round(result)];
 });
 const average=levels.reduce((x,y)=>x+y[1],0)/levels.length;
 const weakest=Math.min(...levels.map(v=>v[1]));
 const weaknessPenalty=Math.min(8,.25*Math.max(0,45-weakest));
 // 8分野のうち広い範囲で高水準を実現し、深刻な弱点が少ない場合のみ加点。
 // 隠しイベントや特定の政策採用は必要条件にしない。
 const breadth=levels.reduce((sum,[,v])=>sum+clamp((v-65)/10,0,1),0);
 const breadthBonus=round(clamp(2.4*Math.max(0,breadth-3.2),0,9.5)*clamp((weakest-50)/15,0,1));
 const avg=round(clamp(average-weaknessPenalty+breadthBonus));
 const grade=n=>n>=85?'S':n>=70?'A':n>=55?'B':n>=40?'C':n>=25?'D':'E';
 const sorted=[...levels].sort((a,b)=>b[1]-a[1]);const completed=(s.facilities||[]).filter(x=>x.mode!=='converted');
 const ct=cat=>P.filter(p=>p.cat===cat).reduce((sum,p)=>sum+(s.counts[p.id]||0),0);
 let style='島を育てる挑戦者';
 if(s.money>155&&s.life<60)style='堅実な財政管理者';else if(s.life>=64&&ct('暮らし')>=ct('産業'))style='暮らしの守り手';else if(s.industryScore>=62&&s.port>=59)style='海を生かす商売人';else if((s.timeline||[]).filter(x=>x.type==='management').length>=2)style='変化を恐れない改革家';else if(ct('産業')>=6)style='大胆な投資家';else if(Math.min(...levels.map(x=>x[1]))>=52)style='全体を見渡す経営者';
 const best=sorted[0],weak=[...sorted].reverse()[0];
 const praise=`${best[0]}が目立った6年間でした。島の${best[0]}に力を注いだ成果が見えます。`;
 const advice=`一方、${weak[0]}には課題が残っています。次の6年間は、その弱点と島の強みをどう結び付けるかが鍵になりそうです。`;
 return {levels,avg,grade,rank:grade(avg),style,praise,advice,best,weak,breadthBonus,weaknessPenalty};
}
function endVoices(){
 const d=derived(),r=IslandLife.districts(s),oldPop=s.performanceLog?.[0]?.pop??10000;
 const homes=s.housing-s.pop;const popVoices=[];
 if(homes<160)popVoices.push(['島へ移り住みたい人','島での仕事は見つかりそう。でも住む場所を探すのが難しいね。']);
 if(s.pop>=10200&&homes>=160)popVoices.push(['新しく来た子育て世帯','住まいと働く場所が整って、家族で新しい生活を始められました。']);
 if(s.pop>oldPop+100)popVoices.push(['若い島民','島で暮らす人が増えてきたのを見て、少し希望が湧いてきたよ。']);
 if(s.education>=66)popVoices.push(['学校に通う生徒','島でも新しいことが学べる機会が増えたよ。将来の仕事も考えてみたいな。']);
 if(s.medical>=72)popVoices.push(['診療所を利用する人','診療の選択肢が増えて安心。これからも医療を続けられるといいね。']);
 if(s.pop<9750)popVoices.push(['地元に暮らす人','人口は少しずつ減っているけれど、ここでの生活を守りたいな。']);
 if(!popVoices.length)popVoices.push(['島で暮らす若者','仕事も暮らしも、まだ伸ばせるところがありそう。次の6年間も楽しみだね。']);
 const community=[];
 if(r.weakest.score<53)community.push([r.weakest.name+'に暮らす人','町の便利さが広がっても、私たちの地域まで届かないことがあるんだ。']);
 if(r.spread>=13)community.push(['集落を行き来する人','地域によって便利さに差があるね。島のどこに住んでも安心したいな。']);
 if(s.inland>=65&&s.village>=63)community.push(['バスを利用する人','通院や買い物の予定を立てやすくなったよ。移動できるって大事だね。']);
 if(s.culture>=69)community.push(['祭りを続けてきた人','久しぶりに集落がにぎわったよ。若い人とも一緒に準備できてうれしい。']);
 if(s.nature>=76)community.push(['島の自然を見守る人','森も田んぼも豊かになったね。生き物たちの姿を見るのが楽しみだよ。']);
 if(s.infra<49)community.push(['設備を管理する人','目立たないところだけど、水道や道路の手入れはまだ必要なんだ。']);
 if(s.money<0)community.push(['地域活動の世話役','今は便利になったね。でも、これを無理なく続けられるかが心配だよ。']);
 if(!community.length)community.push(['地域に暮らす人','派手な変化だけじゃなく、毎日の安心も大切にしてほしいな。']);
 const trade=[];
 if(s.need>d.labor+110)trade.push(['地元企業の担当者','新しい注文はありがたい。でも、働く人が足りなくて困っているんだ。']);
 if(d.logistics.shortage>7)trade.push(['農産物の出荷担当者',`作ったものをもっと届けたい。今季も荷物が${d.logistics.shortage}ほど運びきれないんだ。`]);
 if(s.fish>=65&&d.logistics.rate>=.94)trade.push(['水産加工の仕事をする人','加工した品を島の外へ送りやすくなったよ。新しい取引先も探してみたい。']);
 if(s.tourism>=68&&s.lodging>=58)trade.push(['宿泊業のスタッフ','遠くから訪れる人が増えたよ。島の良さを丁寧に伝えていきたいね。']);
 if(s.hidden?.research>=66)trade.push(['島外の研究者','島の工夫はほかの地域にも参考になりそう。これからも一緒に考えたいです。']);
 if(s.hidden?.medical>=65)trade.push(['島外の医療スタッフ','医療の連携が少しずつ形になっていますね。次の交流にも期待しています。']);
 if(s.industryScore>=58)trade.push(['商店街の店主','島の商売が前より活気づいてきたよ。地元の人にも使ってほしいな。']);
 if(!trade.length)trade.push(['小さなお店の人','大きな工場も大切だけど、毎日の買い物を支える店も忘れないでね。']);
 // 各群から1人。条件の優先順位に加え、島の特色で選び分ける。
 const pick=(pool,offset)=>pool[Math.abs((s.counts.festival||0)*3+(s.counts.port||0)*2+(s.counts.hospital||0)+Math.round(s.nature)+offset)%pool.length];
 return [pick(popVoices,0),pick(community,1),pick(trade,2)];
}
function endConnections(){const d=derived(),goods=IslandLife.specialties(s,d.logistics);return [
 ['島外への出荷',Math.round(clamp((s.farm+s.fish+s.port)/3*d.logistics.rate)),'農漁業・輸送の充実度'],
 ['観光・交流',Math.round(clamp((s.tourism+s.culture+s.lodging)/3)),'観光・文化・宿泊施設'],
 ['企業との取引',Math.round(clamp((s.industry+s.port+s.hidden.trust)/3)),'商工業と島外への信頼'],
 ['研究・医療連携',Math.round(clamp((s.hidden.research+s.hidden.medical)/2)),'教育・研究・医療の協力']
 ];}

function initial(){return {turn:1,pop:10000,money:102,life:58,jobs:52,industryScore:50,transport:55,farm:50,fish:50,tourism:50,industry:50,port:55,inland:55,medical:58,education:55,infra:60,nature:65,culture:50,village:55,lodging:55,housing:10400,need:4800,maintenance:0,serviceCuts:{transport:0,facilities:0},projects:[],temp:[],counts:{},last:{},history:[],log:[],seed:Math.floor(Math.random()*4294967295)||1234567,prevEvent:'',ideal:'',event:null,selected:'',filter:'すべて',openCatalog:false,phase:'play',timeline:[],lastCargoShortage:0,scale:'normal',manage:null,openFacilities:false,facilities:[],arc:null,arcSeen:[],focusRegion:'',snapshots:[],specialtiesUnlocked:[],hidden:hiddenInitial(),secretSeen:[],links:[],future:"",recap:null,sound:false,performanceLog:[],migrationStreak:0,recentEvents:[],eventQueue:[],eventBatch:{total:0,done:0},news:[],newsSeen:[],synergySeen:[],synergyStories:[],opportunities:[]};}
let s;function rand(){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}function save(){try{localStorage.setItem(SAVE,JSON.stringify(s));}catch(e){}}
function load(){try{
 const raw=localStorage.getItem(SAVE)||localStorage.getItem(V10_SAVE)||localStorage.getItem(LATEST_SAVE)||localStorage.getItem(PREV_SAVE)||localStorage.getItem(OLDER_SAVE)||localStorage.getItem(OLD_SAVE);
 const v=JSON.parse(raw);
 if(v&&Number.isInteger(v.turn)&&v.turn>=1&&v.turn<=25&&v.pop>0&&v.counts&&v.history){
  if(!Array.isArray(v.timeline))v.timeline=[];
  if(!Number.isFinite(v.lastCargoShortage))v.lastCargoShortage=0;
  if(!Array.isArray(v.arcSeen))v.arcSeen=[];
  if(!('arc' in v))v.arc=null;
  if(!('scale' in v))v.scale='normal';
  if(!('manage' in v))v.manage=null;
  if(!('openFacilities' in v))v.openFacilities=false;
  if(!('focusRegion' in v))v.focusRegion='';
  if(!Array.isArray(v.snapshots))v.snapshots=[];
  if(!Array.isArray(v.specialtiesUnlocked))v.specialtiesUnlocked=[];if(!v.hidden||typeof v.hidden!=='object')v.hidden=hiddenInitial();if(!Array.isArray(v.secretSeen))v.secretSeen=[];if(!Array.isArray(v.links))v.links=[];if(!('future' in v))v.future='';if(!('recap' in v))v.recap=null;if(!('sound' in v))v.sound=false;if(!Array.isArray(v.performanceLog))v.performanceLog=[];if(!Array.isArray(v.baselineMetrics)||v.baselineMetrics.length!==8)v.baselineMetrics=scoreReference();if(!Number.isFinite(v.migrationStreak))v.migrationStreak=0;if(!Array.isArray(v.recentEvents))v.recentEvents=[];if(!Array.isArray(v.eventQueue))v.eventQueue=[];if(!v.eventBatch||typeof v.eventBatch!=='object')v.eventBatch={total:v.event?1:0,done:0};if(!Array.isArray(v.news))v.news=[];if(!Array.isArray(v.newsSeen))v.newsSeen=[];if(!Array.isArray(v.synergySeen))v.synergySeen=[];if(!Array.isArray(v.synergyStories))v.synergyStories=[];if(!Array.isArray(v.opportunities))v.opportunities=[]; if(v.turn===21&&v.phase==='end'){v.phase='play';v.turn=21;v.event=null;v.recap=null;}
  // 旧版の完成施設を台帳に復元する。今後の再編・維持費の管理に使う。
  if(!v.serviceCuts||typeof v.serviceCuts!=='object'){
   // 旧セーブで既に完成している削減政策は、金額を遡及変更しない。これからの追加削減だけを上限管理。
   const old=(v.facilities||[]);
   v.serviceCuts={transport:Math.min(3,old.filter(f=>f.id==='cutbus').reduce((x,f)=>x+Math.max(0,-f.upkeep),0)),facilities:Math.min(3.6,old.filter(f=>f.id==='reorganize').reduce((x,f)=>x+Math.max(0,-f.upkeep),0))};
  }
  if(!Array.isArray(v.facilities)){
    v.facilities=[];
    for(const p of P){
      const underway=(v.projects||[]).filter(x=>x.id===p.id).length;
      const completed=Math.max(0,(v.counts[p.id]||0)-underway);
      for(let j=0;j<completed;j++)v.facilities.push({uid:`legacy-${p.id}-${j}`,id:p.id,name:p.name,at:0,scale:'normal',cost:p.cost,eff:Object.fromEntries(Object.entries(p.effect).map(([k,n])=>[k,round(n*(j?.65:1))])),upkeep:p.upkeep,mode:'active'});
    }
  }
  // 台帳を復元した後で旧政策の節約額を認識し、追加削減の上限を守る。
  if(!v.serviceCuts||typeof v.serviceCuts!=='object')v.serviceCuts={transport:0,facilities:0};
  for(const [policy,slot,cap] of [['cutbus','transport',3],['reorganize','facilities',3.6]]){
   const existing=(v.facilities||[]).filter(f=>f.id===policy).reduce((a,f)=>a+Math.max(0,-(f.upkeep||0)),0);
   v.serviceCuts[slot]=round(Math.min(cap,Math.max(v.serviceCuts[slot]||0,existing)));
  }
  return v;
 }
}catch(e){}return null;}
function f(n){return Number(n).toLocaleString('ja-JP',{maximumFractionDigits:1})}function eff(key){const extra=key==='medical'?currentOpportunities(s).reduce((a,x)=>a+(x.medical||0),0):0;return clamp(s[key]+extra+s.temp.filter(t=>t.key===key&&t.until>=s.turn).reduce((a,t)=>a+t.delta,0));}
function effectiveMedical(){
 return clamp(eff('medical')-.25*Math.max(0,55-eff('village'))-.15*Math.max(0,52-eff('inland')));
}
function serviceBurden(){
 return round(.18*Math.max(0,52-effectiveMedical())+.22*Math.max(0,45-eff('inland'))+.12*Math.max(0,42-eff('village')));
}
function derived(){
 const medicalAccess=effectiveMedical();
 const accessFactor=clamp(1+.0012*(medicalAccess-58)+.0015*(eff('inland')-55)+.0008*(eff('village')-55),.90,1.08);
 const labor=s.pop*.495*accessFactor;
 const ratio=Math.min(1,Math.pow(Math.max(.05,labor/Math.max(1,s.need)),.6));
 const logistics=IslandSystems.logistics(s,eff);
 const freight=.70+.30*logistics.rate;
 const portFactor=k=>(.65+.35*clamp(k)/100);
 const tourismAccess=clamp(1+.003*(eff('inland')-55)+.001*(eff('village')-55),.85,1.08);
 const a=eff('farm')*ratio*portFactor(eff('port'))*freight;
 const b=eff('fish')*ratio*portFactor(eff('port'))*freight;
 const c=eff('tourism')*ratio*Math.min(1,eff('lodging')/60)*portFactor(Math.min(eff('port'),eff('inland')))*tourismAccess;
 const d=eff('industry')*ratio*portFactor(eff('port'))*freight;
 const ind=clamp(.3*a+.2*b+.25*c+.25*d);
 const jobs=clamp(55+.60*(ind-50)-.017*Math.max(0,labor-s.need)-.012*Math.max(0,s.need-labor)+.12*(eff('education')-55));
 const room=clamp(50+((s.housing-s.pop)/400)*25);
 const districts=IslandLife.districts(s,medicalAccess);
 const rawLife=.25*medicalAccess+.14*eff('education')+.17*eff('inland')+.07*eff('village')+.16*eff('infra')+.11*eff('nature')+.05*room+.05*eff('culture');
 const life=clamp(rawLife-Math.max(0,53-districts.weakest.score)*.14);
 return {ind,jobs,life,transport:clamp(.55*eff('port')+.45*eff('inland')),labor,medicalAccess,accessFactor,tourismAccess,serviceBurden:serviceBurden(),logistics,districts};
}
function recalc(){const d=derived();s.industryScore=round(d.ind);s.jobs=round(d.jobs);s.life=round(d.life);s.transport=round(d.transport);return d;}function apply(x){for(const [k,v] of Object.entries(x)){if(k==='housing'||k==='need'){s[k]+=v;}else s[k]=clamp(s[k]+v);}}function scaleSpec(p,level='normal'){
 const v=SCALE_IDS.has(p.id)?(SCALES[level]||SCALES.normal):SCALES.normal;
 let upkeep=round(p.upkeep*v.upkeep);
 if(p.id==='cutbus'||p.id==='reorganize'){
  const kind=p.id==='cutbus'?'transport':'facilities',maximum=kind==='transport'?3:3.6;
  upkeep=-round(Math.min(Math.max(0,maximum-(s.serviceCuts?.[kind]||0)),Math.max(0,-upkeep)));
 }
 return {scale:SCALE_IDS.has(p.id)?level:'normal',cost:round(p.cost*v.cost*((s.counts[p.id]||0)?1.35:1)),delay:Math.max(0,p.delay+v.delay),upkeep,effect:Object.fromEntries(Object.entries(p.effect).map(([k,n])=>[k,round(n*v.effect)]))};
}
function policyAvailable(p,level='normal'){
 const n=s.counts[p.id]||0, spec=scaleSpec(p,level);
 if(p.late&&(s.turn<17||p.id==='quickops'&&s.maintenance<=.6))return false;
 if(p.id==='cutbus'&&(s.serviceCuts?.transport||0)>=3)return false;
 if(p.id==='reorganize'&&(s.serviceCuts?.facilities||0)>=3.6)return false;
 return n<2&&(!s.last[p.id]||s.turn-s.last[p.id]>=4)&&(s.turn+spec.delay<=MAX_TURNS);
}
function policyCost(p,level='normal'){return scaleSpec(p,level).cost;}
function affordablePolicy(p,level='normal'){return policyAvailable(p,level)&&s.money-policyCost(p,level)>=-45;}
function anyScaleAvailable(p){return (SCALE_IDS.has(p.id)?['small','normal','large']:['normal']).some(level=>affordablePolicy(p,level));}
function choose(id){playSE('tap');s.selected=id;s.manage=null;if(id)s.openCatalog=false;const p=P.find(x=>x.id===id);s.scale=p&&!affordablePolicy(p,'normal')&&affordablePolicy(p,'small')?'small':'normal';save();render();}
function chooseScale(level){if(!SCALES[level])return;playSE('tap');s.scale=level;save();render();}
function pickFilter(cat){s.filter=cat;save();render();}
function chooseManagement(uid,action){
 const fac=(s.facilities||[]).find(x=>x.uid===uid);
 if(!fac||fac.mode!=='active'||!['reduce','convert'].includes(action)||action==='reduce'&&fac.upkeep<=0||action==='convert'&&!['hotel','company'].includes(fac.id))return;
 s.manage={uid,action};s.selected='';s.openFacilities=true;save();render();
}
function manageCost(fac,action){return action==='reduce'?Math.max(2,Math.round(fac.cost*.10)):Math.max(4,Math.round(fac.cost*.20));}
function manageFacility(){
 const {uid,action}=s.manage||{},fac=(s.facilities||[]).find(x=>x.uid===uid);
 if(!fac||fac.mode!=='active'||action==='reduce'&&fac.upkeep<=0||s.money-manageCost(fac,action)<-45)return null;
 const cost=manageCost(fac,action),messages=[];s.money=round(s.money-cost);
 if(action==='reduce'){
  // 規模縮小で能力が減り、維持費も減る。悪影響は直ちには回復しない。
  for(const [k,v] of Object.entries(fac.eff)){
   const delta=v>0?-round(v*.40):round(-v*.15);
   if(k==='housing')s.housing=Math.max(s.pop+10,s.housing+delta);
   else if(k==='need')s.need=Math.max(0,s.need+delta);
   else if(typeof s[k]==='number')s[k]=clamp(s[k]+delta);
  }
  const saved=round(fac.upkeep*.55);
  s.maintenance=round(s.maintenance-saved);
  fac.mode='reduced';fac.upkeep=round(fac.upkeep-saved);
  messages.push(`${fac.name}を縮小しました。維持費の変化 ${saved>=0?'-':'+'}${f(Math.abs(saved))}。施設の能力も一部低下しました。`);
 }else if(action==='convert'&&fac.id==='hotel'){
  s.tourism=clamp(s.tourism-round((fac.eff.tourism||0)*.90));s.lodging=clamp(s.lodging-round((fac.eff.lodging||0)*.90));s.need=Math.max(0,s.need-round((fac.eff.need||0)*.75));s.housing+=Math.round(240*(SCALES[fac.scale]?.effect||1));s.nature=clamp(s.nature+1);
  s.maintenance=round(s.maintenance-fac.upkeep+.5);fac.upkeep=.5;fac.mode='converted';
  messages.push(`宿泊施設を住まいに転用。住宅+${Math.round(240*(SCALES[fac.scale]?.effect||1))}人分、観光の受入能力は低下。維持費も変更しました。`);
 }else if(action==='convert'&&fac.id==='company'){
  s.industry=clamp(s.industry-round((fac.eff.industry||0)*.78));s.need=Math.max(0,s.need-round((fac.eff.need||0)*.82));s.nature=clamp(s.nature+2);s.culture=clamp(s.culture+2);
  s.maintenance=round(s.maintenance-fac.upkeep+.4);fac.upkeep=.4;fac.mode='converted';
  messages.push('企業向け施設を地元の仕事拠点に転用。産業規模と人手需要が減り、維持費を抑えました。');
 }else return null;
 recordHistory(s.turn,'management',fac.name+(action==='reduce'?'を縮小':'を用途転換'),`再編費用${f(cost)}。${messages[0]}`);
 s.manage=null;s.openFacilities=false;return messages;
}
function startArc(id,path,remaining){s.arc={id,path,remaining,total:remaining};s.arcSeen=s.arcSeen||[];s.arcSeen.push(id);recordHistory(s.turn,'arc','季節をまたぐ出来事が始まる',`${E.find(x=>x.id===id)?.title||'島の出来事'}。対応：${path}。`);}
function tickArc(messages){
 const a=s.arc;if(!a)return;
 if(a.id==='ferry_long'){
  if(a.path==='支援'){s.money=round(s.money-3);messages.push('航路維持の支援費：予算-3。海の輸送能力を守りました。');}
  else{s.temp.push({key:'port',delta:-7,until:s.turn});messages.push('船便の減少：今季の港の輸送能力-7。');}
 }else if(a.id==='tourism_long'){
  if(a.path==='強化'){
   const good=Math.min(s.lodging/65,s.inland/65,s.port/65)>=.90;
   const profit=good?6:2;s.money=round(s.money+profit);s.nature=clamp(s.nature-(good?1:0.4));
   messages.push(`観光の注目が続く：今季の臨時収入+${profit}。${good?'自然への負担にも注意。':'受入能力の不足で伸び悩みました。'}`);
  }else{s.money=round(s.money+2);messages.push('観光を控えめに受け入れ、臨時収入+2。');}
 }else if(a.id==='water_long'){
  const damage=a.path==='対策'?.4:2.5;s.infra=clamp(s.infra-damage);messages.push(`水道の不調が続く：設備の状態-${damage}。`);
 }
 a.remaining--;
 if(a.remaining<=0){recordHistory(s.turn,'arcend','数季節の出来事が終息',`${E.find(x=>x.id===a.id)?.title||'出来事'}への対応が一区切りしました。`);s.arc=null;messages.push('長引いていた出来事が落ち着きました。');}
}
function timeName(turn){const t=Math.max(1,Math.min(MAX_TURNS,turn));return `${Math.ceil(t/4)}年目・${seasons[(t-1)%4]}`;}
function recordHistory(turn,type,title,desc){
 s.timeline=s.timeline||[];
 s.timeline.push({turn:Math.max(1,Math.min(MAX_TURNS,turn)),type,title,desc});
 if(s.timeline.length>90)s.timeline=s.timeline.slice(-90);
}

// 産業の実績が税収・地域所得を生む。ただし単独産業への集中投資だけで
// 無制限に増えないよう、税収上積みは上限を設ける（架空のゲーム係数）。
function regularIncome(d,goodsIncome=0){
 const performance=Math.max(0,d.ind-40)*.21;
 const diversity=Math.max(0,Math.min(s.farm,s.fish,s.tourism,s.industry)-48)*.035;
 const taxBonus=Math.min(9.0,performance+diversity);
 const developed=Math.min(7,Math.max(0,s.farm-50)*.055+Math.max(0,s.fish-50)*.065+Math.max(0,s.tourism-50)*.055+Math.max(0,s.industry-50)*.095);
 return 19+.29*d.ind+.0018*(s.pop-10000)+goodsIncome+taxBonus+developed+clamp(.20*(d.life-55),-3,4)+IslandGrowth.evaluate(s,d).total;
}
function forecastBalance(){
 const d=derived();
 const goods=IslandLife.specialties(s,d.logistics).total;
 const op=opportunityEffects(s,d,s.turn+1);
 const income=regularIncome(d,goods)+op.coins;
 const newCost=s.manage?manageCost(s.facilities.find(x=>x.uid===s.manage.uid),s.manage.action):s.selected?policyCost(P.find(x=>x.id===s.selected),s.scale):0;
 const cash=s.money-newCost;
 const debt=cash<0?-cash*.03:0;
 // 工事の完成や新規施設の維持費、ランダムイベントの影響は含めない
 return {baseline:round(income-21-s.maintenance+op.saving-d.serviceBurden-debt),afterCost:round(cash),cost:round(newCost),serviceBurden:d.serviceBurden};
}
function enact(){
 if(s.event||s.phase!=='play')return;
 const p=P.find(x=>x.id===s.selected);
 const spec=p?scaleSpec(p,s.scale):null;
 if(p&&!affordablePolicy(p,s.scale))return;
 if(s.manage){const fac=s.facilities.find(x=>x.uid===s.manage.uid);if(!fac||s.money-manageCost(fac,s.manage.action)<-45)return;}
 const executedTurn=s.turn,before=derived(),oldSnapshot=IslandGrowth.snapshot(s,before),oldShort=before.logistics.shortage,oldPop=s.pop,oldMoney=s.money;
 const messages=[];
 if(s.manage){messages.push(...(manageFacility()||[]));}
 else if(p){
  const cost=spec.cost,repeat=s.counts[p.id]||0;
  s.money=round(s.money-cost);s.counts[p.id]=repeat+1;s.last[p.id]=s.turn;
  const task={uid:`facility-${s.turn}-${p.id}-${repeat}`,id:p.id,name:p.name,at:s.turn+spec.delay,eff:spec.effect,upkeep:spec.upkeep,mult:repeat?.65:1,cost,scale:spec.scale};
  recordHistory(s.turn,'policy',p.name+'を選択',`規模：${SCALES[spec.scale].label}。費用${f(cost)}。${spec.delay?spec.delay+'季節後に完成予定':'今季から効果'}`);
  if(!spec.delay){complete(task);messages.push('「'+p.name+'（'+SCALES[spec.scale].label+'）」の効果が現れました。');
    if(p.id==='quickmarket'){const ratio=derived().logistics.rate;const bonus=round((6+Math.max(0,s.farm-50)*.05+Math.max(0,s.fish-50)*.05)*ratio);s.money+=bonus;messages.push(`島の産品を販売：輸送力に応じた臨時収入+${bonus}。`);}
    if(p.id==='quickclinic')s.temp.push({key:'medical',delta:8,until:s.turn+1});
    if(p.id==='quickferry')s.temp.push({key:'port',delta:9,until:s.turn+1});
  }
  else{s.projects.push(task);messages.push('「'+p.name+'」を開始。完成まで'+spec.delay+'ターン。');}
 }else messages.push('今季は新しい政策を見送りました。');
 s.selected='';s.scale='normal';s.turn++;
 s.temp=s.temp.filter(t=>t.until>=s.turn);
 tickArc(messages);
 for(const x of s.projects.filter(p=>p.at<=s.turn)){
  complete(x);messages.push('「'+x.name+'」が完成しました！');
  recordHistory(s.turn,'complete',x.name+'が完成','この季節から効果と維持費が発生。');
 }
 s.projects=s.projects.filter(p=>p.at>s.turn);
 let d=derived();
 const islandGoods=IslandLife.specialties(s,d.logistics);
 const goodsIncome=islandGoods.total;
 const continuing=opportunityEffects(s,d);
 const income=regularIncome(d,goodsIncome)+continuing.coins;
 const debt=s.money<0?-s.money*.03:0;
 const balance=income-21-s.maintenance+continuing.saving-d.serviceBurden-debt;
 s.money=round(s.money+balance);
 messages.push('季節の収支 '+(balance>=0?'+':'')+f(round(balance))+'（産業や維持費を反映'+(d.serviceBurden?'・サービス不足の臨時費用-'+f(d.serviceBurden):'')+(goodsIncome?'・島産品の収入+'+f(goodsIncome):'')+(IslandGrowth.evaluate(s,d).total?'・政策の相乗効果+'+f(IslandGrowth.evaluate(s,d).total):'')+(continuing.coins?'・特別な好機の収入+'+f(continuing.coins):'')+(continuing.saving?'・特別な好機の経費節約+'+f(continuing.saving):'')+'）。');
 for(const good of islandGoods.active){if(!s.specialtiesUnlocked.includes(good.id)){s.specialtiesUnlocked.push(good.id);recordHistory(s.turn,'specialty',good.name+'が評判に',good.detail+'。今季の関連収入 '+f(good.income)+'。');messages.push('島産品「'+good.name+'」が評判になりました！');}}
 const regionPenalty=Math.max(0,48-d.districts.weakest.score)*.42;
 const roomFree=Math.max(0,s.housing-s.pop);
 const ready=d.jobs>=53&&d.life>=57&&d.medicalAccess>=55&&s.education>=54&&roomFree>=180;
 s.migrationStreak=ready?s.migrationStreak+1:0;
 const migrationBoost=s.migrationStreak>=2?Math.min(22,9+(s.migrationStreak-2)*3):0;
 const popDelta=Math.round(-15+1.23*(d.life-55)+1.06*(d.jobs-55)+.58*(s.education-55)+.34*(s.nature-60)-regionPenalty+migrationBoost);
 const old=s.pop;s.pop=Math.max(1000,Math.min(s.housing, s.pop+popDelta+continuing.pop));
 if(continuing.active.length){messages.push('継続中の好機：'+continuing.active.map(x=>x.title).join('・')+'。'+(continuing.pop?'追加転入の見込み+'+continuing.pop+'人。':'')+(continuing.coins?'収入+'+continuing.coins+'。':'')+(continuing.saving?'維持費軽減+'+continuing.saving+'。':''));}
 messages.push('人口 '+(s.pop-old>=0?'+':'')+f(s.pop-old)+'人。'+(s.pop===s.housing?'住宅不足で転入が制限されています。':d.jobs<45?'仕事と働き手のバランスが課題です。':'暮らしや仕事の状況を反映しました。'));
 // 施設の老朽化
 s.infra=clamp(s.infra-.9);s.inland=clamp(s.inland-.35);s.port=clamp(s.port-.35);
 s.medical=clamp(s.medical-.16);s.education=clamp(s.education-.14);
 s.farm=clamp(s.farm-.10);s.fish=clamp(s.fish-.10);s.industry=clamp(s.industry-.10);s.tourism=clamp(s.tourism-.10);
 d=recalc();const shortage=d.logistics.shortage;
 if(shortage>3){messages.push(`海の物流：荷物${f(d.logistics.demand)}に対して運べる量${f(d.logistics.capacity)}。${f(shortage)}が運べず、農業・漁業・商工業の生産成果が抑えられました。`);}
 else if(oldShort>5&&shortage===0){messages.push('海の物流：輸送の不足が解消し、産業の力を発揮しやすくなりました。');}
 if(oldShort<=3&&shortage>8)recordHistory(s.turn,'issue','海の物流が不足',`必要量${d.logistics.demand}に対して輸送能力${d.logistics.capacity}。`);
 if(oldShort>8&&shortage<=3)recordHistory(s.turn,'recovery','海の物流が回復','必要な荷物をほぼ輸送できるようになりました。');
 s.lastCargoShortage=shortage;
 updateHidden(before,messages);
 const newHeadlines=IslandGrowth.updateNews(s,oldSnapshot,d,executedTurn);
 for(const item of newHeadlines)recordHistory(executedTurn,'news',item.title,item.detail);
 s.log=messages;
 yearly(messages);captureYear();
 s.performanceLog.push({turn:executedTurn,pop:s.pop,money:s.money,deltaPop:s.pop-oldPop,deltaMoney:round(s.money-oldMoney),metrics:scoreMetrics()});
 if(s.performanceLog.length>MAX_TURNS)s.performanceLog.shift();
 activeGameTab='policy';s.recap={turn:executedTurn,deltaPop:s.pop-oldPop,deltaMoney:round(s.money-oldMoney),messages:messages.slice(0,4),news:newHeadlines.map(x=>x.title)};
 if(executedTurn>=MAX_TURNS){s.event=null;s.eventQueue=[];s.eventBatch={total:0,done:0};s.temp=[];s.opportunities=[];finish();s.recap=null;returnToIslandTop();playSE('ending');return;}
 queueSeasonEvents();
 save();render();returnToIslandTop();playSE('season');
}
function complete(t){
 const applied=Object.fromEntries(Object.entries(t.eff).map(([k,v])=>[k,round(v*t.mult)]));
 apply(applied);
 let appliedUpkeep=t.upkeep;
 if(t.id==='cutbus'||t.id==='reorganize'){
  s.serviceCuts=s.serviceCuts||{transport:0,facilities:0};
  const kind=t.id==='cutbus'?'transport':'facilities',maximum=kind==='transport'?3:3.6;
  const room=Math.max(0,round(maximum-(s.serviceCuts[kind]||0)));
  const saved=Math.min(room,Math.max(0,-t.upkeep));
  appliedUpkeep=-saved;s.serviceCuts[kind]=round((s.serviceCuts[kind]||0)+saved);
 }
 s.maintenance=round(s.maintenance+appliedUpkeep);
 s.facilities=s.facilities||[];s.facilities.push({uid:t.uid||`legacy-built-${t.id}-${s.turn}-${s.facilities.length}`,id:t.id,name:t.name,at:s.turn,eff:applied,upkeep:appliedUpkeep,cost:t.cost||P.find(x=>x.id===t.id)?.cost||0,scale:t.scale||'normal',mode:'active'});
}
// 普通の出来事は従来の43%抽選。隠しイベントとは抽選枠を共有しない。
function rollEvent(){
 if(rand()>=.43)return null;
 const pool=E.filter(e=>e.kind!=='secret' && e.id!==s.prevEvent && !(s.recentEvents||[]).includes(e.id) && e.can(s));
 if(!pool.length)return null;
 const classified=e=>e.kind==='long'?'mixed':e.kind;
 const pref=rand(),desired=pref<.40?'good':pref<.80?'bad':'mixed';
 const catPool=pool.filter(e=>classified(e)===desired);
 const eligible=catPool.length?catPool:pool;
 const weights=eligible.map(e=>{
  let w=e.weight;
  if(e.id==='water')w*=clamp(1+(65-s.infra)/40,.3,2.5);
  if(e.id==='youth')w*=clamp(1+(55-s.jobs)/25,.5,2.5);
  if(e.id==='pollution')w*=clamp(1+(s.tourism-s.nature)/40,.5,2.5);
  return w;
 });
 let r=rand()*weights.reduce((a,b)=>a+b,0);
 return eligible.find((e,i)=>{r-=weights[i];return r<=0;})||eligible.at(-1);
}
// 隠しイベント共通の「発見済み件数」補正。上限は設けず、7件目以降も10%の補正で抽選する。
// これは基礎発生率そのものではなく、各イベントに設定したsecretChanceに掛ける倍率。
const SECRET_REPEAT_MULTIPLIERS=[1,.75,.50,.35,.25,.15,.10];
function secretRepeatMultiplier(priorCount){
 return SECRET_REPEAT_MULTIPLIERS[Math.min(Math.max(0,Math.floor(priorCount)||0),SECRET_REPEAT_MULTIPLIERS.length-1)];
}
// 通常イベントの枠とは独立。条件を満たす未発生の隠しイベントを個別抽選する。
// 定義順の有利不利が生じないよう候補を毎季シャッフルする。
// 同じ季節でも1件当選するごとに発生件数を即時加算し、次の抽選から確率を減衰する。
// 当選したイベントはまとめて確定し、画面では後から1件ずつ順番に処理する。
function rollSecretEvents(){
 const seen=new Set(s.secretSeen||[]);
 const eligible=E.filter(e=>e.kind==='secret' && !seen.has(e.id) && e.can(s));
 for(let i=eligible.length-1;i>0;i--){
  const j=Math.floor(rand()*(i+1));
  [eligible[i],eligible[j]]=[eligible[j],eligible[i]];
 }
 const selected=[];
 for(const ev of eligible){
  const multiplier=secretRepeatMultiplier(seen.size+selected.length);
  if(rand()<clamp((ev.secretChance??0)*multiplier,0,1))selected.push(ev);
 }
 return selected;
}
function queueSeasonEvents(){
 const ordinary=rollEvent();
 const secrets=rollSecretEvents();
 // 普通の出来事を先に、隠しイベントは抽選された順番で並べる。
 const queue=[...(ordinary?[ordinary.id]:[]),...secrets.map(e=>e.id)];
 s.event=queue.shift()||null;
 s.eventQueue=queue;
 s.eventBatch={total:queue.length+(s.event?1:0),done:0};
 if(ordinary)s.prevEvent=ordinary.id;
 return s.eventBatch.total;
}

function handleEvent(i){
 const ev=E.find(e=>e.id===s.event);if(!ev||!ev.options[i])return;
 const prior=IslandGrowth.snapshot(s,derived());const option=ev.options[i];option[2](s);s.recentEvents=[...(s.recentEvents||[]),ev.id].slice(-3); if(ev.kind==='good'||ev.kind==='secret')playSE('good');else if(ev.kind==='bad')playSE('bad');else playSE('tap'); if(ev.kind==='secret'){s.secretSeen.push(ev.id);}
 if(ev.topic==='政策の相乗効果'){s.synergyStories=s.synergyStories||[];if(!s.synergyStories.includes(ev.id))s.synergyStories.push(ev.id);}
 s.log.unshift(ev.title+'：'+option[0]+'（'+option[1]+'）');
 recordHistory(Math.min(s.turn,MAX_TURNS),'event',ev.title,option[0]+'：'+option[1]);
 if(ev.kind==='good'||ev.kind==='secret')s.links.push({title:ev.title,turn:Math.min(MAX_TURNS,s.turn),kind:ev.kind});
 // 当選した複数の出来事を、この季節中に順番に解決する。
 if(!Array.isArray(s.eventQueue))s.eventQueue=[];
 if(!s.eventBatch)s.eventBatch={total:1,done:0};
 s.eventBatch.done++;
 s.event=s.eventQueue.shift()||null;
 if(!s.event)s.eventBatch={total:0,done:0};
 const after=recalc();const news=IslandGrowth.updateNews(s,prior,after,Math.min(s.turn,MAX_TURNS));
 for(const item of news)recordHistory(Math.min(s.turn,MAX_TURNS),'news',item.title,item.detail);
 captureYear();
 if(s.history.length){const h=s.history[s.history.length-1];h.pop=s.pop;h.money=s.money;h.life=s.life;h.jobs=s.jobs;h.industry=s.industryScore;h.nature=s.nature;}
 save();render();returnToIslandTop();
}
function yearly(log){s.history.push({turn:Math.min(MAX_TURNS,s.turn),pop:s.pop,money:s.money,life:s.life,jobs:s.jobs,industry:s.industryScore,nature:s.nature});if(s.history.length>MAX_TURNS)s.history.shift();}function finish(){s.phase='end';s.turn=MAX_TURNS+1;recalc();save();render();}
function scene(stateOverride){
 const state=stateOverride||s||initial();
 const built=id=>(state.facilities||[]).some(f=>f.id===id&&f.mode!=='converted')||(!state.facilities&&Math.max(0,(state.counts[id]||0)-(state.projects||[]).filter(p=>p.id===id).length)>0);
 const working=id=>(state.projects||[]).some(p=>p.id===id);
 const converted=id=>(state.facilities||[]).some(f=>f.id===id&&f.mode==='converted');
 const spring=(((state.turn||1)-1)%4===0), summer=(((state.turn||1)-1)%4===1), autumn=(((state.turn||1)-1)%4===2),winter=(((state.turn||1)-1)%4===3);
 const field=autumn?'#dbc07b':winter?'#d5dace':summer?'#92b578':'#b4c596';
 const mount=winter?'#9eb6b0':'#82a698';
 const land='#dae1ba';
 const mark=(id,x,y,art)=>`<g transform="translate(${x} ${y})" aria-label="${id}"><circle r="19" fill="#fff9ec" fill-opacity=".94" stroke="#789b93" stroke-width="1"/>${art}</g>`;
 const house=(c='#ca9169')=>`<path d="M-11 3 L0 -8 L11 3" fill="none" stroke="#4f716a" stroke-width="2.5" stroke-linecap="round"/><rect x="-9" y="3" width="18" height="12" fill="${c}" stroke="#4f716a" stroke-width="1.4"/><path d="M-2 15V6H3V15" fill="#fff3d4" stroke="#4f716a" stroke-width="1"/>`;
 const wharf=`<path d="M-13 -7V11 M-3 -7V11 M7 -7V11 M-16 -7H16" stroke="#536d73" stroke-width="3"/><path d="M-14 13Q-6 10 0 13T15 13" fill="none" stroke="#477f9a" stroke-width="2"/>`;
 const factory=`<path d="M-13 12V1L-2 6V0L8 5V-9H13V12Z" fill="#bfaa86" stroke="#456e6e" stroke-width="2"/><path d="M-7 10V6M0 10V7M7 10V7" stroke="#fff1d5" stroke-width="3"/>`;
 const boat=`<path d="M-13 4H13L7 12H-8Z" fill="#be9068" stroke="#466a70" stroke-width="1.8"/><path d="M-2 3V-12L9 2Z" fill="#eee3ca" stroke="#466a70" stroke-width="1.8"/>`;
 const wind=`<path d="M0 -7V14" stroke="#507a75" stroke-width="3"/><circle cx="0" cy="-7" r="2.6" fill="#aa7650"/><path d="M0-7L-11-16M0-7L11-16M0-7L0 7" stroke="#9bbcb1" stroke-width="4" stroke-linecap="round"/>`;
 const tree=`<path d="M0 12V2" stroke="#876e52" stroke-width="3"/><path d="M-10 4Q-16-8-4-12Q7-20 12-5Q15 6 3 7Z" fill="#7a9f81" stroke="#4f7568" stroke-width="1.5"/>`;
 const school=`${house('#cfb47c')}<path d="M0-9V-16H11V-11" stroke="#426e71" stroke-width="1.7" fill="none"/><path d="M3-16H11L7-12Z" fill="#bc7e53"/>`;
 const clinic=`<rect x="-12" y="-6" width="24" height="21" rx="2" fill="#ecdfc2" stroke="#4a7471" stroke-width="1.8"/><path d="M0-2V9M-6 3H6" stroke="#b26b57" stroke-width="3"/>`;
 const festival=`<path d="M-12-12V13M12-12V13" stroke="#456f6d" stroke-width="2"/><path d="M-12-10L12-10L0 1Z" fill="#c78c62"/><circle cy="8" r="5" fill="#d9c38d" stroke="#956d54"/>`;
 const bus=`<rect x="-14" y="-8" width="28" height="18" rx="4" fill="#d6bc83" stroke="#4c7470" stroke-width="1.8"/><path d="M-10 -2H10" stroke="#4c7470" stroke-width="2"/><circle cx="-8" cy="12" r="3" fill="#4c7470"/><circle cx="8" cy="12" r="3" fill="#4c7470"/>`;
 const repair=`<rect x="-7" y="-10" width="14" height="22" rx="3" fill="#9fbbc0" stroke="#4a7175" stroke-width="2"/><path d="M-10 -10H10M-7 0H7" stroke="#4a7175" stroke-width="2"/>`;
 const crop=`<path d="M-13 12L-8-7M0 12V-9M13 12L8-7" stroke="#65866a" stroke-width="2.3"/><path d="M-10-2l-7-3M-5-3l7-5M-3-2l-7-6M2 0l7-7M11-1l7-6" stroke="#b6a367" stroke-width="3"/>`;
 const hotel=`<rect x="-12" y="-9" width="24" height="23" fill="#cfac8a" stroke="#56716a" stroke-width="2"/><path d="M-14-9L0-16L14-9" fill="none" stroke="#56716a" stroke-width="2.4"/><path d="M-6-2h4M3-2h4M-6 5h4M3 5h4" stroke="#faf5de" stroke-width="3"/>`;
 const houseMore=()=>mark('住宅地',340,229,house());
 const places=[
  mark('集落',151,196,house('#c9ae84')),
  mark('小さな漁船',567,179,boat),
  mark('田んぼ',295,194,crop),
  mark('港',530,223,wharf),
  mark('山の木',180,90,tree),
  built('port')?mark('新しい岸壁',557,216,wharf):'',
  built('machine')?mark('農業設備',265,200,crop):'',
  built('greenfarm')?mark('環境農業',288,231,tree):'',
  built('fish')?mark('水産加工所',505,192,factory):'',
  built('hotel')?mark('宿泊施設',428,194,hotel):'',
  converted('hotel')?mark('宿泊施設を転用した住まい',428,194,house('#b5a5c3')):'',
  built('heritage')?mark('歴史展示館',230,119,house('#bea17b')):'',
  built('company')?mark('工場',446,239,factory):'',
  converted('company')?mark('地元の仕事拠点',446,239,house('#cfb98e')):'',
  built('localbiz')?mark('商店街',405,218,house('#d2ac87')):'',
  built('house')||built('vacant')?houseMore():'',
  built('school')?mark('学校',319,162,school):'',
  built('hospital')?mark('診療所',377,175,clinic):'',
  built('bus')?mark('交通',392,247,bus):'',
  built('repair')?mark('水道設備',377,123,repair):'',
  built('energy')?mark('再生可能エネルギー',127,120,wind):'',
  built('festival')?mark('祭り',191,220,festival):'',
  built('reorganize')?mark('公共施設再編',344,254,repair):'',
  built('cutbus')?mark('路線調整',477,177,bus):'',
  working('port')?`<circle cx="552" cy="220" r="26" fill="none" stroke="#ac7753" stroke-dasharray="5 5" stroke-width="3"/>`:'',
  working('company')?`<circle cx="445" cy="239" r="25" fill="none" stroke="#ac7753" stroke-dasharray="5 5" stroke-width="3"/>`:'',
  working('hotel')?`<circle cx="430" cy="195" r="25" fill="none" stroke="#ac7753" stroke-dasharray="5 5" stroke-width="3"/>`:''
 ].join('');
 const seasonText=spring?'春のミライ島':summer?'夏のミライ島':autumn?'秋のミライ島':'冬のミライ島';
 return `<svg class="map" viewBox="0 0 720 330" role="img" aria-label="${seasonText}。湾、山地、平野、集落、港がある島の地図。完了した政策で風景が変わる"><defs><pattern id="paperGrain-${state.turn||1}" width="17" height="17" patternUnits="userSpaceOnUse"><circle cx="4" cy="7" r=".6" fill="#8eb1b0" opacity=".4"/><circle cx="15" cy="14" r=".5" fill="#8eb1b0" opacity=".35"/></pattern></defs>
 <rect width="720" height="330" fill="#c7dcdf"/><rect width="720" height="330" fill="url(#paperGrain-${state.turn||1})"/>
 <g stroke="#99bcc3" fill="none" stroke-width="1.4" opacity=".8"><path d="M19 44q18-6 33 2t33-2M597 44q22-7 42 0t41-4M601 293q22-7 45 1t40-2M27 278q18-7 35 0t39-3M11 115q13-5 26 1M635 138q20-5 38 0M33 216q15-6 31-1"/></g>
 <path d="M93 59 Q130 26 188 52 Q230 72 266 66 Q318 53 359 92 Q385 117 411 119 Q463 117 487 148 Q537 150 576 178 Q621 218 590 250 Q570 270 530 266 Q498 254 475 270 Q449 300 403 288 Q354 276 333 286 Q294 306 259 282 Q220 272 193 283 Q145 277 123 249 Q91 235 82 207 Q65 181 82 145 Q65 102 93 59Z" fill="${land}" stroke="#5b8c87" stroke-width="3"/>
 <path d="M105 71Q140 44 180 65Q213 86 246 87Q275 100 273 128Q267 160 232 170Q198 174 157 151Q121 138 105 117Q92 93 105 71Z" fill="${mount}" opacity=".94"/>
 <path d="M369 151Q411 132 453 154Q480 169 501 185Q519 219 484 251Q445 280 407 261Q385 251 365 228Q348 198 369 151Z" fill="${mount}" opacity=".94"/>
 <g fill="none" stroke="#4d8077" stroke-width="1.8" opacity=".72"><path d="M117 82Q143 61 176 79T235 107Q241 135 206 143T142 123Q122 108 117 82Z"/><path d="M135 88Q159 77 182 94T208 120Q193 132 166 117T135 88Z"/><path d="M387 165Q421 146 452 169T482 214Q468 247 432 245T384 208Q373 182 387 165Z"/><path d="M405 178Q431 162 452 186T460 222Q434 239 413 215T405 178Z"/></g>
 <path d="M248 177Q293 148 350 166Q385 182 388 215Q378 249 334 259Q289 270 249 247Q225 219 248 177Z" fill="${field}" stroke="#a39f77" stroke-width="1.5"/>
 <g stroke="#d5dfbd" stroke-width="2" fill="none" opacity=".95"><path d="M253 202Q303 190 378 205M250 221Q306 214 372 228M282 166Q277 207 283 255M319 163Q321 215 333 254M352 171Q360 209 355 247"/></g>
 <path d="M246 156Q282 149 304 161Q322 175 339 170Q358 167 367 150" fill="none" stroke="#6aa9af" stroke-width="8" opacity=".88" stroke-linecap="round"/>
 <path d="M247 156Q282 149 304 161Q322 175 339 170Q358 167 367 150" fill="none" stroke="#b5dbd6" stroke-width="2.2" stroke-linecap="round"/>
 <path d="M165 191Q220 182 245 211Q275 244 332 230Q382 209 414 223Q455 240 510 224" fill="none" stroke="#eae6ce" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 0"/>
 <path d="M165 191Q220 182 245 211Q275 244 332 230Q382 209 414 223Q455 240 510 224" fill="none" stroke="#92a89a" stroke-width="1" stroke-linecap="round" stroke-dasharray="6 7"/>
 <path d="M510 224L550 251M543 245L560 255" stroke="#876d54" stroke-width="5" fill="none" stroke-linecap="round"/>
 ${IslandLife.seasonArt(state)}
 ${places}
 <g font-size="12" font-weight="700" fill="#355d62" letter-spacing=".05em"><text x="92" y="42">北の山並み</text><text x="260" y="289">中央の平野</text><text x="392" y="312">南の山並み</text><text x="599" y="246">海</text></g>
 <g transform="translate(672 50)" stroke="#456b72" fill="none" stroke-width="1.2"><circle r="22"/><path d="M0 -18V18M-18 0H18"/><path d="M0-22L-4-9L4-9Z" fill="#b17b53"/><text x="-4" y="-30" font-size="11" fill="#456b72" stroke="none">北</text></g>
 <text x="18" y="318" font-size="11" fill="#3c6870">MI-01 / 季節の島の記録</text></svg>`;
}
function focusRegion(id){s.focusRegion=id;save();render();}
function districtsUI(){
 const data=IslandLife.districts(s),chosen=data.items.find(x=>x.id===s.focusRegion);
 const buttons=data.items.map(x=>`<button class="region-button ${chosen?.id===x.id?'active':''}" onclick="focusRegion('${x.id}')" aria-pressed="${chosen?.id===x.id}"><span>${esc(x.name)}</span><b>${f(x.score)}</b></button>`).join('');
 return `<div class="regions"><div class="regions-heading"><strong>島の3つの地域</strong><small>生活環境（0〜100）</small></div><div class="region-buttons">${buttons}</div>${chosen?`<div class="region-detail"><strong>${esc(chosen.name)}・${f(chosen.score)}</strong><p>${esc(chosen.detail)}</p><small>主に関係するもの：${esc(chosen.strong)}</small></div>`:`<p class="micro-note">地域を押すと、暮らしの違いが見られます。今は「${esc(data.weakest.name)}」の環境に注意。</p>`}</div>`;
}
function specialtiesUI(){
 const goods=IslandLife.specialties(s,derived().logistics);
 const entries=goods.items.map(x=>`<div class="good ${x.income>=.7?'good-active':''}"><div class="good-meta"><strong>${esc(x.name)}</strong><span>${x.income>=.7?'今季の収入 +'+f(x.income):'これから育つ産品'}</span></div><p>${esc(x.detail)}｜${esc(x.place)}</p></div>`).join('');
 return `<details class="goods-panel"><summary>島の産品と体験 <span class="goods-count">今季の関連収入 ${f(goods.total)}</span></summary><p class="micro-note">農漁業・加工・港・観光・自然などの力がそろうと産品が育ちます。実際の輸送や受け入れ能力により収入は変わります。</p><div class="goods-grid">${entries}</div></details>`;
}
function captureYear(){
 // 一年の終わり(4季節を終えた直後)だけ。保存された景色は未来の政策で変化しない。
 if((s.turn-1)%4!==0||s.turn<=1)return;
 const year=Math.min(6,Math.floor((s.turn-1)/4));
 const record={year,turn:year*4,pop:s.pop,money:s.money,life:s.life,nature:s.nature,facilities:JSON.parse(JSON.stringify(s.facilities||[])),projects:JSON.parse(JSON.stringify(s.projects||[])),counts:{...s.counts}};
 s.snapshots=s.snapshots||[];
 const i=s.snapshots.findIndex(x=>x.year===year);
 if(i>=0)s.snapshots[i]=record;else s.snapshots.push(record);
 s.snapshots.sort((a,b)=>a.year-b.year);
}
function albumUI(){
 const arr=(s.snapshots||[]).filter(x=>x.year>=1&&x.year<=6).sort((a,b)=>a.year-b.year);
 if(!arr.length)return `<p class="micro-note">まだ年末の記録がありません。1年を終えると島の姿が保存されます。</p>`;
 const card=x=>`<article class="album-card"><h3>${x.year}年目の冬</h3>${scene(x)}<p>人口 ${f(x.pop)}人／暮らし ${f(Math.round(x.life))}／予算 ${f(x.money)}</p></article>`;
 const first=arr[0],last=arr[arr.length-1];
 const ends=first===last?[first]:[first,last];
 const middle=arr.filter(x=>x!==first&&x!==last);
 return `<section class="panel album-panel"><h2>島の発展アルバム</h2><p class="muted">6年間の風景を年末ごとに自動記録。建設した施設は、その年の姿で残ります。</p><div class="album-grid">${ends.map(card).join('')}</div>${middle.length?`<details class="album-more"><summary>途中の${middle.length}年分の風景を見る</summary><div class="album-grid">${middle.map(card).join('')}</div></details>`:''}</section>`;
}
function stats(){return [['人口',f(s.pop)+'人','開始時 '+(s.pop>=10000?'+':'')+f(s.pop-10000)+'人'],['予算残高',f(s.money),'島コイン'],['暮らし',f(Math.round(s.life)),'生活の安心'],['仕事・働き手',f(Math.round(s.jobs)),'働く環境'],['産業の元気',f(Math.round(s.industryScore)),'仕事と生産'],['交通・物流',f(Math.round(s.transport)),'港と島内移動']].map(([a,b,c])=>`<div class="stat"><label>${a}</label><strong>${b}</strong><small>${c}</small></div>`).join('');}
function suggestedPolicies(){
 const priority=s.money<5?['reorganize','localbiz','cutbus']:s.need>s.pop*.495+125?['machine','vacant','hospital']:s.housing-s.pop<180?['vacant','house','localbiz']:s.infra<53?['repair','port','hospital']:s.port<52?['port','localbiz','bus']:s.life<54?['hospital','school','bus']:['localbiz','repair','heritage'];
 const eligible=P.filter(anyScaleAvailable);
 return [...priority.map(id=>eligible.find(p=>p.id===id)).filter(Boolean),...eligible.filter(p=>!priority.includes(p.id))].slice(0,3);
}
function switchCatalog(){
 s.openCatalog=!s.openCatalog;save();render();
 if(s.openCatalog)document.querySelector('.catalog-head button')?.focus();
 else document.querySelector('.decision-actions button')?.focus();
}
function effectSummary(effect){
 const labels={port:'港',farm:'農業',fish:'水産',industry:'商工業',tourism:'観光',lodging:'宿泊能力',inland:'島内交通',village:'集落の移動',nature:'自然',culture:'地域文化',infra:'設備の健全度',medical:'医療',education:'教育',housing:'住宅人数',need:'必要な働き手'};
 return Object.entries(effect).filter(([k,n])=>n!==0&&labels[k]).map(([k,n])=>`${labels[k]} ${n>0?'+':''}${f(n)}${['need','housing'].includes(k)?'人':''}`).join('／');
}
function managementPreview(fac,action){
 if(!fac)return '';
 if(action==='reduce'){
  const changes=Object.fromEntries(Object.entries(fac.eff).filter(([k,v])=>v>0&&k!=='need').map(([k,v])=>[k,-round(v*.40)]));
  return `主な能力変化：${effectSummary(changes)||'小幅な変化'}。維持費の変化 ${-round(fac.upkeep*.55)>0?'+':''}${f(-round(fac.upkeep*.55))}。`;
 }
 if(fac.id==='hotel')return `住宅 +${Math.round(240*(SCALES[fac.scale]?.effect||1))}人／観光 -${f(round((fac.eff.tourism||0)*.9))}／宿泊能力 -${f(round((fac.eff.lodging||0)*.9))}。維持費 ${f(fac.upkeep)}→0.5。`;
 if(fac.id==='company')return `商工業 -${f(round((fac.eff.industry||0)*.78))}／必要な働き手 -${f(round((fac.eff.need||0)*.82))}人。維持費 ${f(fac.upkeep)}→0.4。`;
 return '';
}
function facilityUI(){
 const available=(s.facilities||[]).filter(x=>x.mode==='active').sort((a,b)=>b.at-a.at);
 return `<details class="facility-manager" ${s.openFacilities?'open':''}>
  <summary>完成した施設を見直す（縮小・用途転換） <span class="manager-count">${available.length}施設</span></summary>
  <p class="muted">過去の投資を縮小すると維持費は減りますが、施設の能力も一部低下します。宿泊施設と誘致企業向け施設は別用途にも転換できます。いずれも今季の政策1件分として扱います。</p>
  ${available.length?`<div class="manage-grid">${available.map(fac=>{
   const choosing=a=>s.manage?.uid===fac.uid&&s.manage?.action===a;
   return `<div class="manage-card"><div class="manage-title"><strong>${esc(fac.name)}</strong><span>${esc(SCALES[fac.scale]?.label||'標準')}・維持費 ${f(fac.upkeep)}</span></div>
   <div class="manage-actions">${fac.upkeep>0?`<button class="chip ${choosing('reduce')?'active':''}" onclick="chooseManagement('${esc(fac.uid)}','reduce')">縮小（費用${f(manageCost(fac,'reduce'))}）</button>`:'<span class="muted">維持費削減につながらないため縮小対象外</span>'}
   ${['hotel','company'].includes(fac.id)?`<button class="chip ${choosing('convert')?'active':''}" onclick="chooseManagement('${esc(fac.uid)}','convert')">用途転換（費用${f(manageCost(fac,'convert'))}）</button>`:''}</div></div>`;
  }).join('')}</div>`:'<p class="muted">完成した施設が増えると、ここから見直せます。</p>'}
  </details>`;
}
function policyUI(){
 const selected=P.find(p=>p.id===s.selected),picks=suggestedPolicies();
 const pbutton=p=>`<button class="policy-choice ${s.selected===p.id?'selected':''}" onclick="choose('${p.id}')"><span class="policy-choice-title">${esc(p.name)}</span><span class="policy-choice-detail">${esc(p.desc)}</span><span class="policy-choice-cost">標準費用 ${f(policyCost(p))} 島コイン ${SCALE_IDS.has(p.id)?'／規模変更可':''}</span></button>`;
 const manager=s.manage?(s.facilities||[]).find(x=>x.uid===s.manage.uid):null;
 const actual=selected?scaleSpec(selected,s.scale):null;
 const managementValid=manager&&manager.mode==='active'&&s.money-manageCost(manager,s.manage.action)>=-45;
 const policyValid=selected?affordablePolicy(selected,s.scale):true;
 const confirmText=manager?`${manager.name}を${s.manage.action==='reduce'?'縮小':'用途転換'}して次へ`:selected?`${selected.name}を実行して次へ`:'今季は見送って次へ';
 const scaleControls=selected&&SCALE_IDS.has(selected.id)?`<div class="scale-panel"><strong>事業の規模を選ぶ</strong><div class="scale-choices" role="group" aria-label="政策の実施規模">${Object.keys(SCALES).map(level=>{
  const p=scaleSpec(selected,level),okay=affordablePolicy(selected,level);
  return `<button class="scale-option ${s.scale===level?'current':''}" onclick="chooseScale('${level}')" aria-pressed="${s.scale===level}"><span>${SCALES[level].label}</span><b>費用 ${f(p.cost)}</b><small>完成 ${p.delay?p.delay+'季節後':'今季'}／維持費 ${p.upkeep>0?'+':''}${f(p.upkeep)}</small>${!okay?'<small class="warning-text">この条件では実施不可</small>':''}</button>`;
 }).join('')}</div><p class="micro-note">小規模は始めやすい代わりに効果が小さく、大規模は維持費と工期が増えます。事業規模で他の政策への投資余力も変わります。</p></div>`:'';
 return `<section class="decision" id="decision" aria-label="今季の政策を選ぶ"><div class="decision-title"><h2>今季の決断</h2><span class="sheetlabel">1季節に1つ</span></div><div class="muted">島の状況に関係する3案。どの政策を選んでも、見送っても構いません。</div><div class="short-options">${picks.map(pbutton).join('')}</div>
 <div class="catalog" role="dialog" aria-modal="true" aria-label="政策の一覧表" ${s.openCatalog?'':'hidden'}><div class="catalog-head"><p class="sheetlabel">政策の一覧表</p><button type="button" class="chip" onclick="switchCatalog()">一覧を閉じる ×</button></div><div class="chips">${['すべて','産業','暮らし','財政'].map(c=>`<button class="chip ${s.filter===c?'active':''}" onclick="pickFilter('${c}')">${c}</button>`).join('')}</div>
 <div class="policylist">${P.filter(p=>s.filter==='すべて'||p.cat===s.filter).map(p=>{
  const disabled=!anyScaleAvailable(p);
  return `<button class="policy ${s.selected===p.id?'selected':''}" onclick="choose('${p.id}')" ${disabled?'disabled':''}><div class="phead"><span>${esc(p.name)}</span><span class="pill">標準 ${f(policyCost(p))}</span></div><div class="details">${esc(p.desc)}<br>標準完成：${p.delay?p.delay+'ターン後':'すぐ'}／ 維持費：${p.upkeep>0?'+':''}${p.upkeep}／ ${s.counts[p.id]||0}/2回 ${SCALE_IDS.has(p.id)?'／規模選択可':''} ${disabled?'（今は実施不可）':''}</div></button>`;
 }).join('')}</div></div>
 <div class="decision-actions"><button class="btn ghost" onclick="switchCatalog()" aria-expanded="${!!s.openCatalog}">${s.openCatalog?'政策一覧を閉じる':(P.length+'種類の政策をすべて見る')}</button></div>
 ${facilityUI()}
 ${scaleControls}
 <div class="cash-preview" role="status"><strong>今季の予算の目安</strong><span>政策・再編の費用：${f(forecastBalance().cost)} ／ 見込み残高：${f(forecastBalance().afterCost)} ／ 臨時対応費：約${f(forecastBalance().serviceBurden)} ／ 現状からの季節収支：約${forecastBalance().baseline>=0?'+':''}${f(forecastBalance().baseline)}</span><small>完成する工事・ランダムイベント・人口変化等は含まない概算です。</small></div>
 <div class="selectedbox">${manager?`<strong>現在の選択：${esc(manager.name)}を${s.manage.action==='reduce'?'縮小':'用途転換'}</strong><div class="muted">再編費用 ${f(manageCost(manager,s.manage.action))}／今季に実施。${esc(managementPreview(manager,s.manage.action))}</div>`:selected?`<strong>現在の選択：${esc(selected.name)}（${esc(SCALES[actual.scale].label)}）</strong><div class="muted">費用 ${f(actual.cost)}／完成 ${actual.delay?actual.delay+'ターン後':'すぐ'}／ 維持費 ${actual.upkeep>0?'+':''}${f(actual.upkeep)}<br>完成時の変化：${esc(effectSummary(actual.effect))}</div>`:'<strong>現在の選択：見送り</strong><div class="muted">新しい政策には費用をかけず、次の季節に進みます。</div>'}
 ${(selected||manager)?'<button class="chip" onclick="choose(\'\')" style="margin-top:8px">選択を取り消す</button>':''}</div>
 ${!policyValid||!managementValid&&manager?'<p class="warning-text">今の予算または残り期間では、その決断を実行できません。規模を小さくするか、別の政策を選んでください。</p>':''}
 <button class="btn proceed" onclick="enact()" ${(!policyValid||manager&&!managementValid)?'disabled':''}>${esc(confirmText)} →</button>
 </section>`;
}
function getProblem(){if(s.money<0)return '予算が赤字です。支出の見直しや産業の収入増を考えましょう。';if(s.housing-s.pop<180)return '住まいの空きが不足しています。人口の増加に影響します。';if(s.need>derived().labor+160)return '仕事が増えていますが、働き手が不足しています。';if(s.infra<50)return '水道や道路など、古い施設の負担が大きくなっています。';if(s.port<50)return '港の輸送能力が低下しています。産業や物流への影響に注意。';if(derived().medicalAccess<50)return '医療体制が弱まっています。暮らしへの影響が心配です。';if(derived().districts.weakest.score<50)return '地域によって暮らしに差が出ています。集落の交通や医療を確認しましょう。';if(s.nature<50)return '自然環境への負荷が増えています。観光や暮らしへの影響も。';return '島には複数の課題があります。何を大切にして進めますか？';}
function chart(){let a=s.history.map(x=>x.pop),b=s.history.map(x=>x.money);function line(values,min,max,color){return `<polyline fill="none" stroke="${color}" stroke-width="3" points="${values.map((v,i)=>`${20+i*560/Math.max(1,values.length-1)},${130-(v-min)/(max-min||1)*110}`).join(' ')}"/>`;}return `<svg id="chart" viewBox="0 0 600 160" role="img" aria-label="人口と財政の推移（各線はそれぞれの最小値から最大値で表示）"><path d="M20 20V130H580" stroke="#b4cbc9" stroke-width="2" fill="none"/>${line(a,Math.min(...a)-30,Math.max(...a)+30,'#188e80')}${line(b,Math.min(...b)-15,Math.max(...b)+15,'#d48c31')}<text x="26" y="150" font-size="12" fill="#327d73">● 人口</text><text x="112" y="150" font-size="12" fill="#b77b28">● 予算</text><text x="245" y="150" font-size="11" fill="#647c7d">各線は別の目盛りで表示</text></svg>`;}
function typeOfIsland(){if(s.life>=65&&s.money<0)return '暮らしを大切にする島';if(s.nature>73&&s.industryScore>=50)return '自然と産業が共存する島';if(s.tourism>Math.max(s.farm,s.fish,s.industry)+9)return '観光でにぎわう島';if(s.money>170&&s.life<58)return '財政を立て直した島';if(s.industryScore>62)return '産業が元気な島';if(s.pop<9800&&s.life>59)return '人口が減っても暮らしを守る島';if(s.life>62)return '安心して暮らせる島';return '変化の途中にある島';}
function result(){
 const a=endAnalysis(),voices=endVoices(),links=endConnections(),sType=typeOfIsland();
 const items=a.levels.map(([name,val])=>`<div class="rank-item"><span>${esc(name)}</span><span class="grade grade-${a.grade(val)}">${a.grade(val)}</span><small>${Math.round(val)} / 100</small></div>`).join('');
 const headline=s.money<0&&s.life>63?'暮らしの充実が進む一方、財政の立て直しが次の課題に':s.industryScore>=59&&s.housing-s.pop<180?'島の仕事が活発に！ 住まいの確保が新しい課題':s.nature>72&&s.culture>=60?'森と文化を育んだ6年間、島ならではの魅力が広がる':s.pop>=10000?'暮らしと仕事の工夫が実り、島の人口が回復':'島の6年間を振り返る、成果とこれからの挑戦';
 const futureTexts={growth:'今ある仕事と輸送能力を生かし、島の経済をさらに育てる未来を目指す。',life:'医療、住まい、教育、交通を支え、暮らしの安定を最優先する未来を目指す。',nature:'自然と農漁業・観光の関係を見直し、島の魅力を守り育てる未来を目指す。',connections:'島の外との交流や連携を育て、新しい選択肢を広げる未来を目指す。'};
 return `<div class="shell"><header class="top"><div class="topline"><div class="brand">島おこし！ミライ島</div><div class="top-controls"><button class="tinybtn" onclick="toggleSound()">${s.sound?'♪ 音あり':'♪ 音なし'}</button></div></div></header>
 <main class="main end-page"><section class="panel end-intro" id="resultCard"><p class="eyebrow">6年間の島づくり 結果発表</p><div class="end-headline"><div><div class="rank-small">あなたの島の総合評価</div><div class="rank-hero grade-${a.rank}">${a.rank}<small>ランク</small></div></div><div><h1>${esc(sType)}</h1><p>${esc(a.style)} として駆け抜けた24季節</p></div></div>
 ${scene({...s,turn:MAX_TURNS})}<div class="endstats"><div class="resultstat">人口<strong>${f(s.pop)}人</strong><small>開始から ${s.pop>=10000?'+':''}${f(s.pop-10000)}人</small></div><div class="resultstat">予算<strong>${f(s.money)}</strong><small>島コイン</small></div><div class="resultstat">暮らし<strong>${Math.round(s.life)}</strong></div><div class="resultstat">産業<strong>${Math.round(s.industryScore)}</strong></div></div></section>
 <section class="panel end-newspaper"><p class="newspaper-mark">ミライ島通信　／　6年目・特別号</p><h2>${esc(headline)}</h2><p>${esc(a.praise)} ${esc(a.advice)}</p></section>
 <section class="panel"><h2>経営成績表 <small>8項目のS〜E評価</small></h2><div class="rank-grid">${items}</div><p class="micro-note">最終水準60%・6年間の改善25%・今後の持続性15%で採点。深刻な弱点の減点と、複数分野で高水準を達成した加点（今回 +${f(a.breadthBonus)}点）も反映。ランクは架空のゲーム評価です。</p></section>
 <section class="panel"><h2>あなたの経営手腕</h2><h3 class="style-name">${esc(a.style)}</h3><p>${esc(a.praise)}</p><p>${esc(a.advice)}</p><p class="micro-note">経営スタイルは実際の政策回数・施設・成果に基づいて判定します。</p></section>
 <section class="panel"><h2>島から届いた3通の声</h2><div class="end-voices">${voices.map(([role,text])=>`<article class="end-voice"><strong>◌ ${esc(role)}</strong><p>「${esc(text)}」</p></article>`).join('')}</div></section>
 <section class="panel"><h2>海の向こうとのつながり</h2><p class="muted">産業・交通・文化・研究の条件から、島外とのつながりの強さを描きます。</p><div class="link-grid">${links.map(([label,value,desc])=>`<div class="link-row"><div><strong>${esc(label)}</strong><span>${esc(desc)}</span></div><div class="link-meter"><span style="width:${value}%"></span></div><b>${value}</b></div>`).join('')}</div>${s.links.length?`<p class="micro-note">実際に起きた交流や取引の出来事：${s.links.slice(-4).map(x=>esc(x.title)).join(' ／ ')}</p>`:''}</section>
 <section class="panel"><h2>最後の選択 ― 次の6年間は？</h2><p>今までの評価は変わりません。あなたなら、この島の未来に何を残しますか？</p><div class="future-buttons">${[['growth','産業をさらに育てる'],['life','暮らしを支える'],['nature','自然と共に歩む'],['connections','島外とのつながりを広げる']].map(([v,label])=>`<button class="choice ${s.future===v?'chosen':''}" onclick="futureSelect('${v}')">${label}</button>`).join('')}</div><p class="future-answer" aria-live="polite">${esc(futureTexts[s.future]||'次の6年間への方針を選んでみよう。')}</p></section>
 <section class="panel"><h2>6年間の歩み</h2>${chart()}<p class="micro-note">この島で見つけた隠しイベント：${s.secretSeen?.length||0}件（プレイによって発見できる出来事が変わります）</p><details><summary>政策・イベントの年表を見る</summary>${historyTimeline(true)}</details></section>
 ${albumUI()}<section class="panel closing"><h2>あなたが暮らしたいのは、どんな島ですか？</h2><p class="micro-note">6年間の島づくりを振り返って、あなたならどんな島で暮らしたいか考えてみましょう。</p><div class="buttons"><button class="btn" onclick="restart()">もう一度遊ぶ</button><button class="btn secondary" onclick="downloadCard()">結果カードをPNG保存</button></div></section>${importControls()}</main><footer class="footer">入力された個人情報の収集や外部送信はありません。</footer></div>`;
}

function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
 const chars=Array.from(text);let row='',count=0;
 for(const ch of chars){if(ctx.measureText(row+ch).width>maxWidth&&row){ctx.fillText(row,x,y+count*lineHeight);count++;row='';if(count>=maxLines)return;}row+=ch;}
 if(row&&count<maxLines)ctx.fillText(row,x,y+count*lineHeight);
}
async function downloadCard(){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1320;
 const c=canvas.getContext('2d');if(!c){alert('画像の保存ができないブラウザです。');return;}
 c.fillStyle='#f7f2e4';c.fillRect(0,0,1080,1320);
 c.fillStyle='#204d57';c.fillRect(0,0,1080,150);
 c.fillStyle='#fff7e6';c.font='700 48px sans-serif';c.fillText('島おこし！ミライ島',70,93);
 c.fillStyle='#42656a';c.font='700 27px sans-serif';c.fillText('6年間の島づくりの記録',72,215);c.fillStyle='#b58c43';c.font='700 44px sans-serif';c.fillText('総合 '+endAnalysis().rank+' ランク',630,215);c.fillStyle='#42656a';
 c.font='700 49px sans-serif';wrapCanvasText(c,typeOfIsland(),72,295,920,58,2);c.font='24px sans-serif';c.fillText(endAnalysis().style,74,345);
 // ゲームで使用しているオリジナルの地図をそのまま使う。外部画像は取得しない。
 try{
  const svg=scene({...s,turn:24}).replace(/<svg /,'<svg xmlns="http://www.w3.org/2000/svg" ');
  const img=new Image();const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  await new Promise(resolve=>{img.onload=()=>{c.drawImage(img,58,365,964,442);resolve();};img.onerror=resolve;img.src=src;});
 }catch(e){}
 c.fillStyle='#e5ede5';c.fillRect(60,842,960,190);
 c.fillStyle='#204d57';c.font='700 31px sans-serif';
 c.fillText('人口',91,900);c.fillText('予算残高',560,900);
 c.font='700 43px sans-serif';c.fillText(f(s.pop)+'人',91,960);c.fillText(f(s.money)+' コイン',560,960);
 c.font='600 24px sans-serif';c.fillText('暮らし '+f(Math.round(s.life)),91,1008);c.fillText('産業 '+f(Math.round(s.industryScore)),560,1008);
 c.fillStyle='#335c62';c.font='700 34px sans-serif';wrapCanvasText(c,'あなたが暮らしたいのは、どんな島ですか？',76,1127,928,46,2);
 c.font='23px sans-serif';c.fillText('数字・政策効果は架空のゲーム設定です',76,1240);
 try{
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(!blob)throw Error('PNG生成失敗');
  downloadData('ミライ島_結果カード.png',blob);
 }catch(e){alert('画像を保存できませんでした。独立したゲームページからもう一度お試しください。');}
}
// Wix埋め込みでブラウザ保存が制限された場合の補助手段。端末内のみで入出力する。
const EXPORT_FORMAT='miraijima-save-v1';
function downloadData(filename,blob){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function exportSave(){
 if(!s)return;
 const payload=JSON.stringify({format:EXPORT_FORMAT,created:'v1.2',state:s});
 downloadData('ミライ島_セーブ.json',new Blob([payload],{type:'application/json;charset=utf-8'}));
}
function validPortableState(v){
 return v&&typeof v==='object'&&Number.isInteger(v.turn)&&v.turn>=1&&v.turn<=25&&
 Number.isFinite(v.pop)&&v.pop>=1000&&Number.isFinite(v.money)&&
 Number.isFinite(v.seed)&&v.seed>=0&&v.seed<=4294967295&&
 Array.isArray(v.facilities)&&v.facilities.length<=100&&Array.isArray(v.projects)&&v.projects.length<=50&&
 Array.isArray(v.history)&&v.history.length<=25&&Array.isArray(v.snapshots)&&v.snapshots.length<=6&&
 Array.isArray(v.timeline)&&v.timeline.length<=90&&Array.isArray(v.temp)&&v.temp.length<=100&&
 Array.isArray(v.log)&&v.log.length<=100&&v.counts&&typeof v.counts==='object'&&
 ['farm','fish','tourism','industry','port','inland','medical','education','infra','nature','culture','village','lodging','housing','need','maintenance'].every(k=>Number.isFinite(v[k]));
}
function importSaveFile(input){
 const file=input.files&&input.files[0];if(!file)return;
 if(file.size>160000){alert('ファイルが大きすぎます。ミライ島のセーブデータを選んでください。');input.value='';return;}
 const reader=new FileReader();reader.onload=()=>{
  try{
   const obj=JSON.parse(reader.result);
   if(obj.format!==EXPORT_FORMAT||!validPortableState(obj.state))throw Error('形式が違います');
   const allowed=initial(),src=obj.state;
   for(const key of Object.keys(allowed))if(Object.hasOwn(src,key))allowed[key]=src[key];
   if(!confirm('現在の進行状況を読み込んだセーブデータに置き換えますか？'))return;
   s=allowed;if(s.turn===21&&s.phase==='end'){s.phase='play';s.recap=null;}recalc();save();render();
  }catch(e){alert('セーブデータを読み込めませんでした。ゲームから保存したJSONファイルを選んでください。');}
  input.value='';
 };
 reader.onerror=()=>{alert('ファイルを読み込めませんでした。');input.value='';};
 reader.readAsText(file);
}
function importControls(){return `<details class="save-panel"><summary>保存・再開（端末のファイルに保存）</summary><p class="muted">ゲームは通常、ブラウザにも自動保存されます。Wix内で保存が使えない場合や別の端末へ移したい場合は、セーブファイルを利用できます。外部送信はしません。</p><div class="buttons"><button class="btn secondary" onclick="exportSave()">セーブファイルを保存</button><label class="btn ghost" for="import-save">セーブファイルを読み込む</label><input id="import-save" type="file" accept=".json,application/json" onchange="importSaveFile(this)" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden" aria-label="セーブファイルを選ぶ"></div></details>`;}
function start(ideal=''){activeGameTab='policy';s=initial();s.ideal=ideal;recalc();s.baselineMetrics=scoreMetrics();recordHistory(1,'start','島づくりを開始',ideal&&ideal!=='まだ決めない'?'目指す島：'+ideal:'これからの6年間を自分で決めます。');save();render();}function restart(){if(confirm('今のゲームを終えて、最初から遊びますか？')){try{localStorage.removeItem(SAVE);localStorage.removeItem(V10_SAVE);localStorage.removeItem(LATEST_SAVE);localStorage.removeItem(PREV_SAVE);localStorage.removeItem(OLDER_SAVE);localStorage.removeItem(OLD_SAVE);}catch(e){}s=null;render();}}function startScreen(){const existing=load();return `<div class="shell"><header class="top"><div class="brand">島おこし！ミライ島</div></header><main class="main"><div class="hero"><div class="title"><small>島づくり経営シミュレーション</small>島おこし！<br>ミライ島</div>${scene()}<p class="lead">あなたの決断で、島の未来が変わる！<br>仕事、暮らし、自然、そして予算。<br>6年間、どんな島をつくる？</p><div class="buttons startbuttons">${existing?'<button class="btn" onclick="resume()">つづきから遊ぶ</button>':''}<button class="btn ${existing?'secondary':''}" onclick="showIdeal()">はじめから遊ぶ</button><button class="btn ghost" onclick="howto()">あそびかた</button></div></div><div class="panel"><h2>ミライ島・あそびの手引き</h2><p class="lead">1季節に1つの政策を選び、24ターンで6年を運営しよう。産業が育つと仕事は増えるけど、人手や住まいが足りなくなることも。予算がなくなっても、工夫して立て直せるよ。</p><div class="note">架空の島を舞台にしたゲームです。数字や出来事はゲーム用の設定です。</div></div><div class="panel"><h2>セーブファイルから再開</h2><p class="muted">以前に保存した「ミライ島_セーブ.json」を選んで再開できます。</p><label class="btn ghost" for="import-save-start">セーブファイルを読み込む</label><input id="import-save-start" type="file" accept=".json,application/json" onchange="importSaveFile(this)" class="visually-hidden"></div></main></div>`;}
function resume(){activeGameTab='policy';s=load();if(s){recalc();render();}}function howto(){document.body.insertAdjacentHTML('beforeend',`<div class="overlay" id="help"><div class="modal"><h2>あそびかた</h2><p class="lead">1季節に1つ政策を選んで、24ターン（6年間）島を運営します。</p><p>🏭 産業が育つと収入と仕事が増えるかもしれません。<br>🏥 医療や交通が充実すると、暮らしに加え、働き手や産業を支えます。<br>💰 予算の使いすぎには注意。完成後の維持費もかかります。<br>⏳ 政策は完成まで時間がかかることがあります。<br>🌧️ 来季の見通しは確定ではありません。<br>🚢 物流が不足すると産業の成果が抑えられます。<br>✉️ 島民の提案や、島のニュース・年表も見てみましょう。<br>✨ 隠しイベントは通常の出来事とは別に個別抽選。発見数が増えるほど出にくくなりますが、同じ季節に複数起こることもあります。<br>🏘️ 地域ごとに暮らしの事情が違います。<br>🌾 島の産品は、生産や輸送がそろうと育ちます。</p><p class="muted">人口だけが成功の条件ではありません。どんな島をつくりたいか、自分で決めてください。</p><button class="btn" onclick="document.getElementById('help').remove()">わかった！</button></div></div>`);}function showIdeal(){document.body.insertAdjacentHTML('beforeend',`<div class="overlay" id="ideal"><div class="modal"><h2>どんな島を目指す？</h2><p class="muted">ここで選ぶものに正解はありません。政策の効果は変わらず、最後に振り返れます。</p>${['仕事が豊富でにぎやかな島','安心して暮らせる島','自然が豊かな島','まだ決めない'].map(i=>`<button class="choice" onclick="start('${i}');document.getElementById('ideal')?.remove()"><b>${i}</b></button>`).join('')}</div></div>`);}
function eventUI(){const ev=E.find(e=>e.id===s.event);if(!ev)return '';const opts=ev.options.map((o,i)=>'<button class="choice" onclick="handleEvent('+i+')"><b>'+esc(o[0])+'</b><small>'+esc(o[1])+'</small></button>').join('');return '<div class="overlay" role="dialog" aria-modal="true"><div class="modal">'+((s.eventBatch?.total||0)>1?'<p class="event-progress" aria-live="polite">今季の出来事 '+((s.eventBatch.done||0)+1)+' / '+s.eventBatch.total+' 件</p>':'')+(ev.topic?'<p class="event-topic">'+esc(ev.topic)+'</p>':'')+'<h2>'+esc(ev.title)+'</h2><p class="lead">どう対応しますか？</p>'+opts+'</div></div>';}

function opportunityStatus(){
 const all=(s.opportunities||[]).filter(x=>x.until>=s.turn);
 if(!all.length)return '';
 return `<details class="opportunity-status"><summary>続いている特別な好機：${all.length}件</summary>${all.map(x=>`<p><strong>${esc(x.title)}</strong>　残り${Math.max(0,x.until-Math.max(x.from,s.turn)+1)}季節${x.pop?' ／ 人口増加の可能性':''}${x.coins?' ／ 収入の上積み':''}${x.medical?' ／ 医療アクセス向上':''}${x.upkeepSaving?' ／ 維持費の軽減':''}</p>`).join('')}</details>`;
}
function arcStatus(){
 if(!s.arc)return '';
 const names={ferry_long:'海の便の減少',tourism_long:'観光の注目',water_long:'水道設備の不調'};
 return `<section class="arc-status" aria-label="続いている出来事"><div><span class="arc-kicker">数季節続く出来事</span><strong>${esc(names[s.arc.id]||'島の出来事')}</strong><p>選んだ対応：${esc(s.arc.path)}。あと${s.arc.remaining}季節、影響が続きます。</p></div><span class="arc-mark">続行中</span></section>`;
}
function flowPanels(){
 const d=derived(),g=d.logistics,preview=IslandSystems.forecast(s,g),wall=IslandSystems.mainBottleneck(s,g,d.labor);
 const share=Math.round(g.rate*100);
 const comments=IslandSystems.letters(s,g,d.labor);
 const quotes=comments.map(x=>`<article class="voice"><span class="voice-role">${esc(x.who)} <small>・${esc(x.tag)}</small></span><p>「${esc(x.text)}」</p></article>`).join('');
 return `<section class="flow-grid" aria-label="島の物流と来季の見通し">
   <div class="insight"><div class="insight-heading"><span class="insight-sign">▤</span><h2>海の物流</h2><small>運べる荷物の量</small></div>
   <div class="cargo-numbers"><div><b>${g.demand}</b><span>運びたい量</span></div><div><b>${g.capacity}</b><span>運べる量</span></div><div class="${g.shortage?'shortage':''}"><b>${g.shortage}</b><span>運べない量</span></div></div>
   <div class="cargo-track" role="img" aria-label="必要な荷物の${share}%を輸送"><span style="width:${share}%"></span></div>
   <p class="muted cargo-desc">${g.shortage?`荷物${g.shortage}が運べず、農業・漁業・商工業の成果が抑えられています。`:'必要な荷物を運べる状態です。産業が育つと需要も増えます。'}</p></div>
   <div class="insight"><div class="insight-heading"><span class="insight-sign">◇</span><h2>季節の見通し</h2><small>${esc(preview.tag)}</small></div>
   <p class="insight-forecast">${esc(preview.detail)}</p><div class="bottleneck"><strong>いまの島の壁：${esc(wall.title)}</strong><span>${esc(wall.detail)}</span></div>
   <p class="micro-note">予兆は確定情報ではありません。政策とイベントで状況は変化します。</p></div>
  </section><details class="letters-strip" aria-label="島で暮らす人の声"><summary>島の声 <span class="letter-count">2通の声が届いています</span></summary><div class="voices">${quotes}</div><p class="micro-note">島の状況に合わせて声の内容が変わります。</p></details>`;
}

function synergyUI(){const status=IslandGrowth.evaluate(s,derived());const list=status.active;
 return `<section class="synergy-panel" aria-label="島で育ったつながり"><h3>政策のつながり</h3>${list.length?`<p class="micro-note">別々の取り組みが一緒に働き、今季の収入につながっています（合計+${f(status.total)}）。</p>${list.map(item=>`<div class="synergy-item"><strong>${esc(item.title)}</strong><p>${esc(item.detail)}${item.income?`（収入 +${f(item.income)}）`:''}</p></div>`).join('')}`:'<p class="micro-note">農業・加工・港、医療・教育など、島の能力がそろうと新しいつながりが生まれます。</p>'}</section>`;
}
function newsUI(){const entries=(s.news||[]).slice().reverse().slice(0,9);
 return `<section class="news-list" aria-label="島のニュース"><h3>島のニュース</h3>${entries.length?`<ol>${entries.map(item=>`<li><small>${esc(timeName(item.turn))}</small><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></li>`).join('')}</ol>`:'<p class="micro-note">島の節目や政策の相乗効果が生まれると、ここにニュースが届きます。</p>'}</section>`;
}
function newsTeaser(){const latest=(s.news||[]).at(-1);if(!latest||s.turn-latest.turn>2)return '';return `<div class="news-teaser" role="status"><span>島のニュース</span><strong>${esc(latest.title)}</strong></div>`;}

function historyTimeline(full=false){
 const list=full?(s.timeline||[]):IslandSystems.selectHistory(s.timeline||[]);
 if(!list.length)return '<p class="muted">まだ大きな出来事は記録されていません。</p>';
 return `<ol class="island-history">${list.map(x=>`<li><span class="history-time">${esc(timeName(x.turn))}</span><div><strong>${esc(x.title)}</strong><p>${esc(x.desc)}</p></div></li>`).join('')}</ol>`;
}

// 表示タブはセーブ対象外。政策やゲームの状態を変えず、表示だけ切り替える。
let activeGameTab='policy';
function switchGameTab(tab){
 if(!['policy','details','records'].includes(tab))return;
 activeGameTab=tab;
 if(s)s.openCatalog=false;
 playSE('tap');
 render();
 const workspace=document.getElementById('game-workspace');
 if(workspace){workspace.scrollIntoView({block:'start',behavior:'auto'});}
}
function detailTabUI(){
 return `<section class="deep-dive tab-details" aria-label="島の詳細"><h2>島の詳しいようす</h2><p class="muted">海の物流と季節の見通し、島民の声や特産品を確認できます。</p>${flowPanels()}${specialtiesUI()}${synergyUI()}</section>`;
}
function recordsTabUI(){
 return `<section class="report tab-records" aria-label="これまでの記録"><h2>島の記録・保存</h2><p class="muted">実施した政策、起きた出来事、工事中の施設を確認できます。</p><div class="history-preview">${historyTimeline()}</div>${newsUI()}<h3>直近の変化</h3><div class="notices">${s.log.length?s.log.map(x=>`<div class="notice">${esc(x)}</div>`).join(''):'<p class="muted">まだ政策を実施していません。</p>'}</div>${s.projects.length?`<h3>工事中</h3>${s.projects.map(p=>`<p class="muted">${esc(p.name)}：完成まで${p.at-s.turn}ターン</p>`).join('')}`:''}</section>${importControls()}<section class="panel restart-panel"><p class="note">進行状況は、この端末に自動保存されます。</p><button class="btn ghost" onclick="restart()">最初からやり直す</button></section>`;
}
function mainScreen(){
 const t=s.turn,season=seasons[(t-1)%4];
 const tabs=[['policy','政策を決める'],['details','島の詳しい情報'],['records','記録・保存']];
 return `<div class="shell"><header class="top"><div class="topline"><div><div class="brand">島おこし！ミライ島</div><div class="eyebrow">季節の記録・${Math.floor((t-1)/4)+1}年目 ${season} / 24季中 ${t}季</div></div><div class="top-controls"><button class="tinybtn" onclick="toggleSound()">${s.sound?'♪ 音あり':'♪ 音なし'}</button><button class="tinybtn" onclick="howto()">あそびかた</button></div></div></header>
 <main class="main game-main"><div class="game-layout">
 <section class="game-left" aria-label="島の現在の状況"><div class="overview"><section class="panel island-panel"><h2>島の現在地 <span class="mini-tag">ミライ島・地形図</span></h2>${scene()}${districtsUI()}<div class="map-note"><span>○ 完成した施設</span><span>◌ 点線は建設中</span><span>${season}の記録</span></div></section>
 <section class="panel dashboard-panel"><h2>島のようす <span class="vstamp">1年＝4季</span></h2><div class="stats">${stats()}</div><div class="alert"><strong>今季、気になること</strong>${getProblem()}</div>${newsTeaser()}</section></div>${arcStatus()}${opportunityStatus()}</section>
 <section class="game-right" id="game-workspace" aria-label="島の操作"><nav class="workspace-tabs" aria-label="表示の切り替え" role="tablist">${tabs.map(([key,label])=>`<button type="button" class="workspace-tab ${activeGameTab===key?'active':''}" role="tab" aria-selected="${activeGameTab===key}" aria-controls="workspace-content" onclick="switchGameTab('${key}')">${label}</button>`).join('')}</nav>
 <div id="workspace-content" class="workspace-content" role="tabpanel">${activeGameTab==='policy'?policyUI():activeGameTab==='details'?detailTabUI():recordsTabUI()}</div></section>
 </div><p class="game-disclaimer">ログイン不要。進行状況は、この端末に保存されます。</p></main><footer class="footer">どの政策を選ぶかはあなた次第。島の未来を考えてみよう。</footer>${recapUI()}${s.recap?'':eventUI()}</div>`;
}

function render(){
 document.getElementById('app').innerHTML=!s?startScreen():s.phase==='end'?result():mainScreen();
 document.body?.classList?.toggle('catalog-open',!!(s&&s.phase==='play'&&activeGameTab==='policy'&&s.openCatalog));
}
document.addEventListener?.('keydown',ev=>{if(ev.key==='Escape'&&s&&s.openCatalog){ev.preventDefault();switchCatalog();}});
s=null;render();
