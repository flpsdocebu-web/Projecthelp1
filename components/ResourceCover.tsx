"use client";

import { useState } from "react";
import { defaultLasThumbnail, useLasThumbnail } from "./LasThumbnailProvider";

type CoverDetails = { subject: string; grade: string; term?: string };

export default function ResourceCover({ item }: { item: CoverDetails }) {
  const { thumbnail } = useLasThumbnail();
  const [failedUrl, setFailedUrl] = useState("");
  const cover = failedUrl === thumbnail.url ? defaultLasThumbnail : thumbnail;
  return <div className="helps-resource-cover">
    <img className="helps-resource-cover-art" src={cover.url} alt="" loading="lazy" decoding="async" width={cover.width} height={cover.height} onError={() => setFailedUrl(cover.url)} />
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
