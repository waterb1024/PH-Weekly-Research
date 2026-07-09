export type NoteTemplate = {
  id: string;
  label: string;
  buildTitle: (now: Date) => string;
  content: string;
};

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "product-hunt-weekly",
    label: "주간 Product Hunt 리서치",
    buildTitle: (d) => `[${ymd(d)}] 주간 Product Hunt 리서치`,
    content: `<h2>📌 프롬프트</h2>
<blockquote><p>한국 시장에서 온라인 사업 아이템을 구상하려고 해. 지난 30일 동안 PRODUCT HUNT에 올라온 상위 50개 서비스를 수집하고 각 서비스가 해결하려는 문제를 분석하고 각 문제의 공통점을 찾아줘. 시장 규모를 알려주고 1인 개발자가 구축하기 쉬운 수준에 상위 5개 서비스의 미개척 서비스를 순위별로 제시해줘</p></blockquote>
<h2>📥 수집 요약 (상위 50개)</h2>
<p></p>
<h2>🔍 각 서비스가 해결하려는 문제</h2>
<p></p>
<h2>🧩 문제의 공통점</h2>
<ul><li><p></p></li></ul>
<h2>📊 시장 규모</h2>
<p></p>
<h2>🚀 1인 개발자용 미개척 상위 5</h2>
<ol><li><p><strong>1위 — </strong></p></li><li><p><strong>2위 — </strong></p></li><li><p><strong>3위 — </strong></p></li><li><p><strong>4위 — </strong></p></li><li><p><strong>5위 — </strong></p></li></ol>
<h2>📝 메모</h2>
<p></p>`,
  },
];

export function findTemplate(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((t) => t.id === id);
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
