type CoverDetails = { subject: string; grade: string; term?: string };

export default function ResourceCover({ item }: { item: CoverDetails }) {
  return <div className="helps-resource-cover">
    <img className="helps-resource-cover-art" src="/phelps-resource-cover.png" alt="" loading="lazy" decoding="async" width={1532} height={876} />
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
