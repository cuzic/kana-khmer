// 표기 읽는 법(韓国語話者向けの、日本語→ハングル表記の読み方)。例は ja-hangul から生成する(解説が実装とずれないように)。
// 韓国語ネイティブ確認前の下書き。ADR-0018・ADR-0019。
import { renderHangul, renderRomaji } from "ja-hangul";

function Ex({ pron, ja, note }: { pron: string; ja: string; note?: string }) {
  let full = "", lite = "", latin = "";
  try {
    full = renderHangul(pron, "full");
    lite = renderHangul(pron, "lite");
    latin = renderRomaji(pron);
  } catch {
    full = lite = latin = "?";
  }
  return (
    <li>
      <div className="pair">
        <span><small>상세</small><span className="kana">{full}</span></span>
        {lite !== full && <span><small>라이트</small><span className="kana">{lite}</span></span>}
      </div>
      <div className="sub"><span className="text" lang="ja">{ja}</span> <span className="latin">{latin}</span>{note && ` ${note}`}</div>
    </li>
  );
}

export function Guide({ onBack }: { onBack: () => void }) {
  return (
    <section className="guide" lang="ko">
      <button className="back" onClick={onBack}>← 장면 목록</button>
      <h2>표기 읽는 법</h2>
      <p>일본어 발음을 한글로 적었습니다. 한국어의 읽기 규칙과 다른 곳이 있어서, 아래 약속을 알아 두면 더 정확하게 읽을 수 있어요.</p>

      <h3>1. 오른쪽 위의 작은 글자: 긴 소리</h3>
      <p>글자 오른쪽 위의 <b>ᵃ̄ ⁱ̄ ᵘ̄ ᵉ̄ ᵒ̄</b>는 앞 글자의 모음을 “길게” 읽으라는 표시입니다. 한국어에는 모음의 길이 구별이 없어서 이 표시가 필요합니다.</p>
      <ul className="ex">
        <Ex pron="オバサン" ja="おばさん" note="짧게(아주머니)" />
        <Ex pron="オバーサン" ja="おばあさん" note="ā는 길게(할머니)" />
        <Ex pron="トーキョー" ja="東京" />
      </ul>

      <h3>2. 가운뎃점 ·: 이어 읽지 않기</h3>
      <p><b>·</b>은 소리가 나지 않는 구분 표시입니다. 앞 글자의 받침을 뒤로 넘기지 않고, 받침 그대로 읽으세요.</p>
      <ul className="ex">
        <Ex pron="コンバンワ" ja="こんばんは" note="혼·야처럼 읽음: 콘 + 와" />
        <Ex pron="ホンヤ" ja="本屋" note="혼 + 야(호냐가 아님)" />
        <Ex pron="ホンライ" ja="本来" note="혼 + 라이(홀라이가 아님)" />
      </ul>

      <h3>3. 촉음(작은 っ): 받침으로 끊기</h3>
      <p>작은 っ는 다음 글자의 자음에 맞는 받침으로 적습니다. 잠깐 멈췄다가 다음 소리를 내세요.</p>
      <ul className="ex">
        <Ex pron="ニッポン" ja="日本" />
        <Ex pron="キップ" ja="切符" />
        <Ex pron="ザッシ" ja="雑誌" />
      </ul>

      <h3>4. 스·즈·츠</h3>
      <p>일본어의 す・ず・つ는 입술을 둥글게 하지 않습니다. 그래서 수・주・추가 아니라 <b>스・즈・츠</b>로 적습니다.</p>
      <ul className="ex">
        <Ex pron="ススキ" ja="すすき" />
        <Ex pron="ツキ" ja="月" />
      </ul>

      <h3>5. 오른쪽 위의 ʲ: 쟈행</h3>
      <p>한국어의 ㅈ은 뒤에 ㅑ・ㅛ가 와도 소리가 같아서(자=쟈, 조=죠), 일본어의 じゃ・じょ에는 ʲ(j 소리)를 붙여 ざ・ぞ와 구별합니다. 라이트 표기에서는 ʲ를 생략합니다.</p>
      <ul className="ex">
        <Ex pron="ゾー" ja="象" note="ぞう" />
        <Ex pron="ジョー" ja="錠" note="じょう" />
      </ul>
    </section>
  );
}
