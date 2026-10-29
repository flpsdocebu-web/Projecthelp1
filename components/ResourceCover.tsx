type CoverDetails = { subject: string; grade: string; term?: string };

export default function ResourceCover({ item }: { item: CoverDetails }) {
  return <div className="helps-resource-cover">
    <img className="helps-resource-cover-art" src="/phelps-resource-cover.png?v=84fd443c" alt="" loading="lazy" decoding="async" width={1920} height={1080} />
    <div className="helps-resource-cover-details">
      <span className="helps-resource-cover-subject">{item.subject}</span>
      <div className="helps-resource-cover-meta">
        <strong>{item.grade}</strong>
        {item.term && <span className="helps-resource-cover-term">{item.term}</span>}
      </div>
      <small>Learning Activity Sheet</small>
    </div>
  </div>;
}
