import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
};

export default function SquareThumb({
  src,
  alt,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
}: Props) {
  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-neutral-100">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}
