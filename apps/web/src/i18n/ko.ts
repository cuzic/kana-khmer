// UI の文言(학습자의 언어 = 韓国語)。韓国語ネイティブ確認前の下書き。
import type { Dict } from "./ja";

export const ko: Dict = {
  notation: "표기",
  lite: "라이트",
  full: "상세",
  speakerGender: "내 성별",
  genderUnset: "설정 안 함(둘 다)",
  male: "남성",
  female: "여성",
  unreviewed: "미확인",
  howWords: "단어 구조",
  splitAria: "띄어쓰기",
  casualForm: "반말 형태",
  practiceToday: "오늘의 연습",
  guideLink: "표기 읽는 법",
  scenes: "장면",
  backToScenes: "← 장면 목록",
  noPhrases: "공개할 문구가 없습니다.",
  remaining: (n) => `남은 카드 ${n}장`,
  showAnswer: "정답 보기",
  ratings: { again: "다시", hard: "어려움", good: "말할 수 있음", easy: "쉬움" },
  loading: "불러오는 중…",
  noCardsToday: "오늘 할 카드가 없습니다.",
  finishedToday: "오늘의 연습이 끝났습니다. 수고하셨습니다.",
  saveError: (e) => `진행 상황을 저장할 수 없습니다: ${e}`,
  pos: {
    noun: "명사", pron: "대명사", verb: "동사", adj: "형용사", adv: "부사",
    particle: "조사", prep: "전치사", question: "의문사", interj: "감탄사",
  },
  role: { S: "주어", V: "동사", O: "목적어" },
  wordOrder: (roles) => `어순: ${roles}`,
};
