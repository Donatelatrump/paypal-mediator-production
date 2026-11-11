import Icon from './Icon';
import React, { useState } from 'react';

/** Product image URL is supplied by the transaction data, never fetched here. */
export default function ProductThumbnail({ imageUrl = null, className = '' }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage =
    typeof imageUrl === 'string' && imageUrl.trim() && failedUrl !== imageUrl;

  return (
    <span className={`product-thumbnail ${className}`} aria-hidden="true">
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <Icon name="Package" />
      )}
    </span>
  );
}
