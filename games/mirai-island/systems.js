/* 島おこし！ミライ島 v0.3: 独立した小さな計算・文章モジュール。
   画像・ゲーム素材・外部データは使用しない。すべて架空の値。 */
'use strict';
const IslandSystems = (() => {
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
  const round=v=>Math.round(v*10)/10;
  // 各産業が必要とする海上輸送量。係数はゲーム内の架空設定。
  function logistics(state, effective){
    const demand=Math.max(0,Math.round(state.farm*.50+state.fish*.52+state.industry*.65+state.tourism*.13));
    const capacity=Math.max(0,Math.round(40+effective('port')*.95));
    const shipped=Math.min(demand,capacity);
    const rate=demand>0?shipped/demand:1;
    return {demand,capacity,shipped,shortage:Math.max(0,demand-capacity),rate, utilization:capacity?demand/capacity:0};
  }
  function mainBottleneck(state, math, effectiveLabor=state.pop*.495){
    const candidates=[];
    if(math.shortage>0) candidates.push({score:math.shortage/Math.max(1,math.demand),title:'海の物流',detail:`運びたい荷物が${math.shortage}不足。港の輸送能力が産業の成長を制限しています。`});
    const shortWork=state.need-effectiveLabor;
    if(shortWork>70) candidates.push({score:shortWork/Math.max(1,state.need),title:'働き手',detail:`仕事に必要な人手が約${Math.round(shortWork)}人不足しています。`});
    if(state.housing-state.pop<150) candidates.push({score:(150-(state.housing-state.pop))/500+.12,title:'住まい',detail:'空いている住まいが少なく、移住を受け入れにくくなっています。'});
    if(state.infra<50) candidates.push({score:(50-state.infra)/100+.06,title:'古いインフラ',detail:'道路や水道などの古さが、暮らしと災害対応の課題になっています。'});
    if(state.money<0) candidates.push({score:Math.min(.5,-state.money/170),title:'島の予算',detail:'予算がマイナスです。維持費と今後の収入のバランスに注意。'});
    candidates.sort((a,b)=>b.score-a.score);
    return candidates[0]||{title:'新しい選択',detail:'今は大きな能力不足はありません。将来の維持費や季節の変化も考えてみましょう。'};
  }
  function forecast(state, math){
    const next=(state.turn)%4; // 政策確定後に訪れる季節
    if(next===3) return {tag:'次は冬',detail:'大雪で交通が乱れる出来事が起こる可能性があります。島内交通の状態を確認しましょう。'};
    if(next===2) return {tag:'次は秋',detail:'農作物の豊作や不作が起こる可能性があります。農業と物流の備えを確認しましょう。'};
    if(state.infra<54) return {tag:'施設に注意',detail:'古い施設では故障のリスクが高くなります。必要な投資と予算を考えてみましょう。'};
    if(math.rate<.97) return {tag:'物流の余裕',detail:'荷物が運べる量を超えています。産業がさらに育つと輸送の不足が広がるかもしれません。'};
    if(state.need>state.pop*.495+120) return {tag:'働き手の不足',detail:'仕事は増えていますが、働き手が追いついていません。住宅や人手の確保も重要です。'};
    if(next===1) return {tag:'次は夏',detail:'観光需要が増える好機もあります。受け入れる人手と宿泊・交通を確認しましょう。'};
    return {tag:'次は春',detail:'新しい事業や暮らしへの投資を考える季節です。今までの政策の完成時期も確認しましょう。'};
  }
  // 島民の声は独立したフィクション。閾値条件を満たすものだけ表示し、固定の支持率は作らない。
  function letters(state,math,effectiveLabor=state.pop*.495){
    const helpful=[],concerns=[],everyday=[];
    const add=(bag,who,tag,text)=>bag.push({who,tag,text});
    const labor=effectiveLabor, freeHomes=state.housing-state.pop;
    const month=(state.turn-1)%4;
    const recent=(state.recentEvents||[]);
    // 島の状態と過去の出来事に実際に一致する声だけを候補にする。
    if(math.shortage>3)add(concerns,'荷物を出す人','物流',`島の外へ送りたい荷物が${math.shortage}も積み残しになりそう。港に余裕がほしいな。`);
    if(math.shortage===0&&state.port>=63)add(helpful,'出荷を担当する人','物流','港に余裕ができて、農産物や製品を送りやすくなったよ。');
    if(state.need>labor+110)add(concerns,'地元のお店の人','仕事','お客さんは来てくれるけど、働いてくれる人を見つけるのが大変だよ。');
    if(state.jobs>=62&&state.need<labor+90)add(helpful,'仕事を探していた人','仕事','島にも働き方の選択肢が増えたね。ここで挑戦してみようかな。');
    if(freeHomes<180)add(concerns,'住まいを探す人','住まい','この島で暮らしてみたい。でも空いている家が少ないみたい。');
    if(freeHomes>=420&&state.jobs>=53)add(helpful,'引っ越しを考える人','住まい','住む場所が見つかりそう。仕事もあるなら島暮らしを考えたいな。');
    if(state.money<0)add(concerns,'地域で暮らす人','予算','便利になったことはうれしいけど、このサービスを続けられるのかな。');
    if(state.money>=170&&state.life<56)add(concerns,'買い物をする人','予算','島には蓄えがあるらしいけど、暮らしの不便さも気になるな。');
    if(state.money>=130&&state.life>=60)add(helpful,'地域活動の担当者','予算','暮らしと島の蓄え、どちらも守れているのは心強いね。');
    if(state.infra<53)add(concerns,'水道を管理する人','設備','水道や道路が古くなってきたよ。問題が起きる前に考えたいね。');
    if(state.infra>=72)add(helpful,'工事現場の担当者','設備','設備の更新が進んで、トラブルの心配が少し減ったよ。');
    if(state.medical>=67)add(helpful,'診療所を利用する人','医療','診てもらえる体制が整ってきて、安心して暮らせそう。');
    if(state.medical<49)add(concerns,'診療所に通う人','医療','遠くの病院へ行くこともあるし、島で相談できる場所を守りたいな。');
    if(state.hidden?.medical>=63)add(helpful,'診療所のスタッフ','連携','島の外の専門家と話せる機会が増えたのは助かるね。');
    if(state.inland>=65&&state.village>=63)add(helpful,'山あいの集落の人','交通','町へ出かけやすくなったよ。通院の予定も立てやすいね。');
    if(state.village<48)add(concerns,'山あいで暮らす人','交通','診療所へ行くのも一仕事。集落の足を何とか守れないかな。');
    if(state.nature>=73)add(helpful,'野鳥を見守る人','自然','田んぼも森も元気そう。鳥たちが過ごせる風景を残したいな。');
    if(state.nature<52)add(concerns,'海岸を歩く人','自然','便利な施設は増えたけど、前より緑が少ない気がするな。');
    if(state.tourism>=65)add(helpful,'宿のスタッフ','観光','島を訪れる人が増えてきたよ。ゆっくり楽しんでほしいな。');
    if(state.tourism>=63&&state.lodging<53)add(concerns,'観光案内所の人','観光','問い合わせは増えているのに、泊まれる場所が足りないみたい。');
    if(state.education>=65)add(helpful,'子どもを育てる人','教育','学びや子育ての環境が整ってきてうれしいな。');
    if(state.education<49)add(concerns,'学校の先生','教育','授業の工夫はしているけど、学ぶ環境の整備も必要だね。');
    if(state.culture>=64)add(helpful,'地域の祭りの担い手','文化','祭りの準備に若い人も来てくれて、うれしいね。');
    if(state.culture<45)add(concerns,'地域の行事を続ける人','文化','今年も集まれるかな。みんなが顔を合わせる場所は残したい。');
    if(state.farm>=64&&math.rate>.9)add(helpful,'農家','農業','収穫だけじゃなく、島の外へ届けるところまで順調になってきたよ。');
    if(state.fish>=62&&math.rate>.9)add(helpful,'水産加工の職人','漁業','いい魚が手に入って、加工した品も送り出しやすくなったよ。');
    if(state.hidden?.brand>=62)add(helpful,'島の製品を作る人','商売','島の製品に自信がついてきた。今度は島の外にも届けたいね。');
    if(state.hidden?.trust>=62)add(helpful,'出荷の相談をする人','交流','島の外の取引先と、長く付き合えそうな雰囲気になってきたね。');
    if(state.hidden?.youth>=60)add(helpful,'若い起業家','挑戦','新しいことを始めても、相談に乗ってくれる仲間がいるんだ。');
    if(state.hidden?.research>=62)add(helpful,'学びに来た学生','研究','この島でしか見られない工夫がたくさんあって面白いです。');
    if(state.turn>15&&state.pop>=10000)add(helpful,'最近引っ越してきた人','移住','島で暮らす人が増えているのを感じるよ。お店も続いてほしいな。');
    if(state.turn>15&&state.pop<9600)add(concerns,'商店街で働く人','人口','お客さんが減っても、ここでの暮らしを支える仕事は続けたい。');
    if(recent.includes('studentvisit'))add(helpful,'交流会に参加した人','学び','島外の学生たちと話して、いつもの景色が少し違って見えたよ。');
    if(recent.includes('sharedshipping'))add(helpful,'小さな生産者','商売','みんなで荷物をまとめると、一人では難しい取引もできそう。');
    if(month===0)add(everyday,'田植えを準備する人','春','新しい季節が始まるね。田んぼの水を見ながら今年のことを考えているよ。');
    if(month===1)add(everyday,'港で働く人','夏','船が忙しくなる季節。人も荷物も、安全に運びたいね。');
    if(month===2)add(everyday,'収穫を待つ人','秋','今年の作物はどうかな。収穫の知らせを聞くのが楽しみだ。');
    if(month===3)add(everyday,'雪に備える住民','冬','雪が降る前に、通院や買い物の予定を立てておこう。');
    add(everyday,'島の食堂の店主','日常','店には漁師さんも学生も来るよ。いろんな人がいるのが島の面白さだね。');
    add(everyday,'港町の子ども','日常','船が出発するのを見ると、島の外にはどんな町があるのか気になる！');
    add(everyday,'小さな商店の人','日常','便利になっても、お客さんと話す時間は大事にしたいな。');
    // 状況説明は1通、暮らしの小さな声はもう1通。季節で選択が巡回し、乱数は消費しない。
    const pick=(list,shift)=>list[(state.turn*7+Math.floor(state.pop/100)+shift)%list.length];
    const topical=state.turn%3===0 ? (concerns.length?pick(concerns,1):pick(helpful.length?helpful:everyday,1))
      : state.turn%3===1 ? pick(helpful.length?helpful:concerns.length?concerns:everyday,2)
      : pick(concerns.length?concerns:helpful.length?helpful:everyday,3);
    const rest=state.turn%2===0?pick(everyday,state.turn):pick(helpful.length?helpful:everyday,state.turn+13);
    return topical.who===rest.who?[topical,pick(everyday,state.turn+1)]:[topical,rest];
  }
  function selectHistory(entries){
    if(!entries||!entries.length)return [];
    const years=new Map();
    for(const item of entries){const year=Math.min(6,Math.max(1,Math.ceil(item.turn/4)));const curr=years.get(year)||[];curr.push(item);years.set(year,curr);}
    const result=[];
    for(let y=1;y<=6;y++){const items=years.get(y)||[];if(!items.length)continue;const p=items.find(x=>x.type==='event')||items.find(x=>x.type==='complete')||items[0];result.push(p);}
    return result;
  }
  return {logistics,mainBottleneck,forecast,letters,selectHistory};
})();
