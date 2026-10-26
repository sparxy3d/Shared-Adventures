import "./brand-logo.css";

type LogoVariant = "header" | "footer" | "auth";

const dimensions = {
  header: { width: 79, height: 44 },
  footer: { width: 171, height: 96 },
  auth: { width: 129, height: 72 },
};

export default function BrandLogo({ variant = "header" }: { variant?: LogoVariant }) {
  return (
    <picture className={`fs-logo fs-logo--${variant}`}>
      {variant === "header" && (
        <source media="(max-width: 767px)" srcSet="/brand/logo-mobile.webp 1x, /brand/logo-mobile@2x.webp 2x" />
      )}
      <img
        src={`/brand/logo-${variant}.webp`}
        srcSet={`/brand/logo-${variant}.webp 1x, /brand/logo-${variant}@2x.webp 2x`}
        width={dimensions[variant].width}
        height={dimensions[variant].height}
        alt="Free Spirit"
        loading={variant === "footer" ? "lazy" : "eager"}
      />
    </picture>
  );
}
