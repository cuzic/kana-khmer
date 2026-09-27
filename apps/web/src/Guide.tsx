import { parseIpa, renderFull, renderLite } from "khmer-kana";

/** IPA から実際の表記を生成して見せる(解説の例が実装とずれないように) */
function Ex({ ipa, note }: { ipa: string; note?: string }) {
  let full = "", lite = "";
  try {
    const u = parseIpa(ipa);
    full = renderFull(u).text;
    lite = renderLite(u).text;
  } catch {
    full = lite = "?";
  }
  return (
    <li>
      <div className="pair">
        <span><small>詳細</small><span className="kana">{full}</span></span>
        <span><small>ライト</small><span className="kana">{lite}</span></span>
      </div>
      <div className="sub"><span className="ipa">/{ipa}/</span>{note && ` ${note}`}</div>
    </li>
  );
}

function Table({ rows }: { rows: { ipa: string; note?: string }[] }) {
  return <ul className="ex">{rows.map((r) => <Ex key={r.ipa} {...r} />)}</ul>;
}

/** 1つの音の解説。例の音節は IPA から生成する */
function Sound({ sym, ipa, children }: { sym: string; ipa: string; children: string }) {
  let full = "", lite = "";
  try {
    const u = parseIpa(ipa);
    full = renderFull(u).text;
    lite = renderLite(u).text;
  } catch {
    full = lite = "?";
  }
  return (
    <li>
      <div className="pair">
        <span className="sym">{sym}</span>
        <span><small>詳細</small><span className="kana">{full}</span></span>
        <span><small>ライト</small><span className="kana">{lite}</span></span>
      </div>
      <div className="sub">{children}</div>
    </li>
  );
}

export function Guide({ onBack }: { onBack: () => void }) {
  return (
    <section className="guide">
      <button className="back" onClick={onBack}>← シーン一覧</button>
      <h2>表記の読み方</h2>
      <p>
        クメール語の音を、日本語のカナだけで近づけて書く、このアプリ独自の表記です。
        カナで表せない音は、小さな文字や記号で補います。<b>読みの土台は普通のカナ</b>なので、
        まずはカナをそのまま読めば通じます。記号は「もう少し近づけたい」ときの手がかりです。
      </p>

      <h3>2つの表記</h3>
      <ul className="plain">
        <li><b>ライト</b>: 初めはこちら。記号を減らして、読みやすさを優先します。</li>
        <li><b>詳細</b>: 息の強さや母音の音色まで記号で残します。慣れてきたら切り替えます(画面上の「表記」)。</li>
      </ul>
      <Table rows={[{ ipa: "ʔɑː.kun", note: "ありがとう" }, { ipa: "srəj", note: "女(呼びかけの一部)" }]} />

      <h3>語の区切りと強さ</h3>
      <p>
        クメール語に声調(音の高低で意味が変わる仕組み)はありません。多音節の語は、<b>最後の音節をはっきり</b>、
        その前を軽く短く言うと、それらしく聞こえます。「ー」は長く伸ばす音です。
      </p>

      <h3>母音の発音</h3>
      <p>
        母音は10種類。日本語の5母音より細かく区別し、詳細表記では近いカナに右肩の印を付けて表します。
        「ー」が付くと長い母音です(短い母音は詰めず、軽く短く)。以下は目安で、音声で耳を慣らすのが近道です。
      </p>
      <ul className="ex">
        <Sound sym="a" ipa="ka">日本語の「ア」とほぼ同じ。</Sound>
        <Sound sym="ɑ" ipa="kɑ">口を大きく開けて、奥のほうで出す「ア」。「オ」に近く聞こえるので、カナは「コ」+印。</Sound>
        <Sound sym="ə" ipa="kə">力を抜いた、あいまいな「ア」(英語 about の最初の音)。カナは「カ」+印。</Sound>
        <Sound sym="i" ipa="ki">日本語の「イ」とほぼ同じ。</Sound>
        <Sound sym="e" ipa="ke">日本語の「エ」とほぼ同じ。</Sound>
        <Sound sym="ɛ" ipa="kɛ">口をやや大きく開けた「エ」(英語 bed の e)。</Sound>
        <Sound sym="ɨ" ipa="kɨ">「イ」の口の形で「ウ」を言う。唇は丸めず、横に引いたまま。カナは「ク」+印。</Sound>
        <Sound sym="u" ipa="ku">唇を丸めて前に出す「ウ」。日本語の「ウ」より丸い。</Sound>
        <Sound sym="o" ipa="ko">唇を丸めた「オ」。</Sound>
        <Sound sym="ɔ" ipa="kɔ">口を大きく開けて丸めた「オ」(英語 thought の o)。</Sound>
      </ul>
      <p>
        <b>二重母音</b>は、2つの母音を1音節の中で滑らせるように続けます(例: 「イ」から「ア」へ)。
        カナでは前半+「ア」+印で書きます。
      </p>
      <ul className="ex">
        <Sound sym="iə" ipa="kiə">「イ」から「ア」へ滑らせる。</Sound>
        <Sound sym="ɨə" ipa="kɨə">「ɨ」から「ア」へ。</Sound>
        <Sound sym="uə" ipa="kuə">「ウ」から「ア」へ。</Sound>
      </ul>

      <h3>子音の発音</h3>
      <p>日本語にない区別が3つあります。まず基本の子音を、日本語との違いで示します。</p>
      <ul className="ex">
        <Sound sym="k c t p" ipa="kaː">
          {"息を強く出さない音(無気音)。日本語の語中のカ・チャ・タ・パに近い。語頭でも「ガ」「ジャ」のように濁らせず、息を抑えて言う。"}
        </Sound>
        <Sound sym="kʰ cʰ tʰ pʰ" ipa="kʰaː">
          {"息を強く出す音(有気音)。手のひらを口の前に置いて、息が当たるくらい。カナでは右肩に ʰ を付ける。ライトでは消える。"}
        </Sound>
        <Sound sym="ɓ ɗ" ipa="ɓaː">
          {"のどを使う濁った音(入破音)。日本語の「バ」「ダ」に近く、のどを少し下げて吸い込むように言う。表記はふつうのバ・ダ。"}
        </Sound>
        <Sound sym="ʔ" ipa="ʔaː">
          {"のどをつめる音。母音で始まる語の頭に軽く入る。表記はしない(「ア」「イ」…のまま)。語末では「ッ」。"}
        </Sound>
        <Sound sym="ŋ" ipa="ŋaː">
          {"「ん」の口で始める、鼻にかかったガ行(鼻濁音)。日本語では語中の「ガ」が近い。カナは「カ」+ ゚。ライトは「ガ」。"}
        </Sound>
        <Sound sym="ɲ" ipa="ɲaː">
          {"舌の真ん中を上あごに当てる鼻音。「ニャ」に近い。"}
        </Sound>
        <Sound sym="ʋ" ipa="ʋaː">
          {"英語の v と w の中間。上の歯を下唇に軽く当てる程度。カナは「ヴ」。"}
        </Sound>
        <Sound sym="r" ipa="raː">
          {"舌先で上あごを軽くはじく(または震わせる)音。日本語のラ行に近いが、舌先を使う。右肩に ʳ。"}
        </Sound>
        <Sound sym="l" ipa="laː">
          {"舌先を上の歯茎に付けたまま出す「ラ」。英語の l に近い。右肩に ˡ。"}
        </Sound>
        <Sound sym="s h j m n" ipa="saː">
          {"サ・ハ・ヤ・マ・ナ行は、日本語とほぼ同じ。"}
        </Sound>
      </ul>
      <p>
        ここまでの解説は目安です。すべてのフレーズはネイティブ話者の確認前で、
        <b>音声で確かめる</b>ことを前提にしています。
      </p>

      <h3>右肩の小さい文字</h3>
      <p>カナの右上に付く小さな文字は「その音に少し寄せる」印です。ライト表記では消えます。</p>
      <ul className="plain">
        <li><span className="mark">ʰ</span> 有気音(息を強く出す)。カʰ は「カ」に息を足した音。</li>
        <li><span className="mark">ʳ / ˡ</span> ラ行の子音。ʳ は巻き舌ぎみの r、ˡ は舌を上あごに付ける l。</li>
        <li><span className="mark">ᵊ ᵅ ᵓ ᵋ ᶤ</span> 母音の音色。日本語にない ə ɑ ɔ ɛ ɨ を、近いカナ + 印で書きます。</li>
      </ul>
      <Table rows={[
        { ipa: "pʰɑːŋ", note: "ʰ(息)と ᵅ(ɑ の音色)" },
        { ipa: "tɨk", note: "ᶤ(ɨ の音色)" },
        { ipa: "kʰɲom", note: "語頭の子音連続" },
      ]} />

      <h3>母音を付けない子音(小さいカナ)</h3>
      <p>
        <span className="mark">ㇰ ㇳ ㇷ゚ ㇲ ㇺ</span> など小さく書いたカナは、<b>母音を付けずに子音だけ</b>を言う印です(アイヌ語の表記にある文字を借りています)。
        語末の子音と、子音が続くときの前側に使います。
      </p>
      <Table rows={[
        { ipa: "ɓaːt", note: "語末の t → ㇳ" },
        { ipa: "soːm", note: "語末の m → ㇺ" },
        { ipa: "ɓɑn.tec", note: "語末の c は ィチ̯" },
      ]} />
      <p>
        <span className="mark">チ̯</span>(チの下に小さい記号)は「母音を足さない c」。小さいチとして表示されます。
        日本語話者は「チ」に母音を付けがちなので、<b>ここは母音を付けずに</b>軽く「ch」とだけ言います。
      </p>
      <Table rows={[{ ipa: "cʰkae", note: "チ̯ は母音なし" }]} />

      <h3>鼻にかかる音(ŋ)の印</h3>
      <p><span className="mark">カ゚ ン゚</span> の小さい丸(゚)は、ng の鼻にかかった音(ŋ)の印です。ン゚ は語末の ng。ライトでは ガ行と ン に置き換わります。</p>
      <Table rows={[{ ipa: "ciəŋ", note: "語末 ŋ → ン゚" }]} />

      <h3>語末の小さい文字</h3>
      <p>語末の y は <span className="mark">ィ</span>、w は <span className="mark">ゥ</span>、声門閉鎖(のどをつめる音)は <span className="mark">ッ</span>、h は <span className="mark">ㇹ</span> で書きます。</p>
      <Table rows={[{ ipa: "srəj", note: "語末 j → ィ" }, { ipa: "caːh", note: "語末 h → ㇹ" }]} />

      <h3>ライトで失われる区別</h3>
      <p>ライトは「読みやすさ」の代わりに、次の区別をなくしています。詳しく聞き分けたいときは詳細に切り替えてください。</p>
      <ul className="plain">
        <li>有気と無気(カʰ と カ)</li>
        <li>r と l</li>
        <li>母音の音色(ə ɑ ɔ ɛ ɨ)</li>
        <li>語末の n と ŋ</li>
        <li>語頭の ŋ(ライトでは「ガ」になり、音が少し変わります)</li>
      </ul>

      <h3>注意</h3>
      <ul className="plain">
        <li>カナはあくまで「近づけた表記」です。<b>音声の代わりにはなりません</b>。</li>
        <li>すべてのフレーズは、まだネイティブ話者の確認前です(「未確認」の印が付いています)。</li>
        <li>端末のフォントによって記号の見た目が変わることがあります。このアプリは専用フォントで揃えています。</li>
      </ul>
    </section>
  );
}
