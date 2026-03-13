
import Image from "next/image";
export function AccessibleImage({ src, alt, width = 800, height = 450 }:{ src: string; alt: string; width?: number; height?: number; }){
  return <Image src={src} alt={alt} width={width} height={height} />;
}
