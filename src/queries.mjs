export const PURPOSES = {
  general: "a general meeting",
  sales: "a sales call",
  partnership: "a partnership discussion",
  investor: "an investor meeting",
  "business-development": "a business development conversation",
};

export function planQueries(subject, kind) {
  if (kind === "person") {
    return [
      { label: "News", topic: "news", query: `${subject} news` },
      { label: "Role", topic: "news", query: `${subject} appointed OR hired OR joins OR "steps down" OR named` },
      { label: "Remarks", topic: "news", query: `${subject} interview OR keynote OR announcement OR statement` },
      { label: "Ventures", topic: "news", query: `${subject} launch OR funding OR partnership OR startup` },
    ];
  }
  return [
    { label: "News", topic: "news", query: `${subject} announcement OR news` },
    { label: "Launches", topic: "news", query: `${subject} launch OR released OR unveils OR ships OR "generally available"` },
    { label: "Hires", topic: "news", query: `${subject} appoints OR hires OR "joins as" OR "named" OR "chief"` },
    { label: "Deals", topic: "news", query: `${subject} funding OR partnership OR acquisition OR earnings OR contract` },
  ];
}
