// วิธีอ่านตัวเขียน(日本語→タイ文字の読み方、タイ語話者向け)。例は ja-thai から生成する(解説が実装とずれないように)。
// タイ語ネイティブ確認前の下書き。ADR-0028。
import { renderRomaji } from "ja-hangul";
import { renderThai } from "ja-thai";

function Ex({ pron, ja, note }: { pron: string; ja: string; note?: string }) {
  let th = "", latin = "";
  try {
    th = renderThai(pron);
    latin = renderRomaji(pron);
  } catch {
    th = latin = "?";
  }
  return (
    <li>
      <div className="pair"><span className="kana">{th}</span></div>
      <div className="sub"><span className="text" lang="ja">{ja}</span> <span className="latin">{latin}</span>{note && ` ${note}`}</div>
    </li>
  );
}

export function Guide({ onBack }: { onBack: () => void }) {
  return (
    <section className="guide" lang="th">
      <button className="back" onClick={onBack}>← รายการสถานการณ์</button>
      <h2>วิธีอ่านตัวเขียน</h2>
      <p>ตัวเขียนนี้ใช้อักษรไทยแทนเสียงภาษาญี่ปุ่น ไม่ใช่คำไทย จึงมีข้อตกลงบางอย่างที่ต่างจากการอ่านภาษาไทยปกติ ฟังเสียงจริงประกอบด้วยจะอ่านได้แม่นยำที่สุด</p>

      <h3>1. อ่านเสียงราบ ไม่ต้องใส่วรรณยุกต์</h3>
      <p>ภาษาญี่ปุ่นไม่มีวรรณยุกต์แบบภาษาไทย ตัวเขียนนี้จึงเลือกสระและพยัญชนะให้อ่านออกมาเป็น <b>เสียงกลาง (เสียงสามัญ)</b> เสมอ พยายามอ่านให้ราบ ไม่ขึ้นไม่ลง</p>
      <ul className="ex">
        <Ex pron="コンニチワ" ja="こんにちは" />
        <Ex pron="スミマセン" ja="すみません" />
      </ul>

      <h3>2. สระเสียงยาวที่ต้องอ่านสั้น</h3>
      <p>เพื่อให้ได้เสียงกลาง สระเปิดทุกตัวจึงเขียนด้วยสระเสียงยาว เช่น <span className="kana">นี</span> <span className="kana">มา</span> <span className="kana">ซู</span> แต่ภาษาญี่ปุ่น<b>ออกเสียงสั้น</b> ให้อ่านสั้น ๆ เหมือนพยางค์เดียวที่ไม่ลากเสียง</p>
      <ul className="ex">
        <Ex pron="ニホン" ja="日本" note="“นี” อ่านสั้น" />
        <Ex pron="マス" ja="ます" note="“ซู” อ่านสั้น" />
      </ul>

      <h3>3. เสียงยาว: สระซ้ำอีกพยางค์</h3>
      <p>เสียงยาวของภาษาญี่ปุ่น (ー) เขียนโดย<b>ซ้ำสระอีกหนึ่งพยางค์</b> เช่น <span className="kana">อา</span> <span className="kana">โอ</span> ให้อ่านลากเสียงต่อจากพยางค์ก่อนหน้า ความยาวเป็นสองจังหวะ</p>
      <ul className="ex">
        <Ex pron="オバサン" ja="おばさん" note="สั้น (คุณป้า)" />
        <Ex pron="オバーサン" ja="おばあさん" note="ยาว (คุณยาย)" />
        <Ex pron="トーキョー" ja="東京" />
        <Ex pron="アリガトー" ja="ありがとう" />
      </ul>

      <h3>4. ตัวสะกด: ん และ っ</h3>
      <p><b>ん</b> เขียนด้วยตัวสะกด <span className="kana">น</span> <span className="kana">ง</span> <span className="kana">ม</span> ตามเสียงที่ตามมา (ท้ายคำเป็น <span className="kana">ง</span>) <b>っ</b> (เสียงหยุด) เขียนด้วยตัวสะกดซ้ำพยัญชนะตัวถัดไป ให้หยุดเสียงครู่หนึ่งแล้วค่อยออกเสียงตัวถัดไป</p>
      <ul className="ex">
        <Ex pron="ニッポン" ja="日本" />
        <Ex pron="ガッコー" ja="学校" />
        <Ex pron="ギンコー" ja="銀行" />
        <Ex pron="シンブン" ja="新聞" />
      </ul>

      <h3>5. สึ (つ) และเสียงที่ไม่มีในภาษาไทย</h3>
      <p><span className="kana">สึ</span> คือ つ ซึ่งเป็นเสียง ts ตัวเขียน <span className="kana">ตสึ</span> ใช้หลังสระ ส่วน <span className="kana">ช</span> ใน し และ <span className="kana">จ</span> ใน じ/ち กลางคำ เป็นการเลือกตัวที่ใกล้เสียงที่สุด</p>
      <ul className="ex">
        <Ex pron="ツナミ" ja="津波" />
        <Ex pron="ミツ" ja="蜜" />
        <Ex pron="シマ" ja="島" />
        <Ex pron="ジャ" ja="じゃ" />
      </ul>
    </section>
  );
}
