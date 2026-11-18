import { FALLBACK_COVER } from "../utils";

interface Props {
  src?: string;
  className?: string;
}

export default function Cover({ src, className = "" }: Props) {
  return (
    <img
      className={className}
      src={src || FALLBACK_COVER}
      alt=""
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = FALLBACK_COVER;
      }}
    />
  );
}
